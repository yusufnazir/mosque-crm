package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.mosque.crm.dto.MemberAccountResultDTO;
import com.mosque.crm.dto.MemberAccountResultDTO.Status;
import com.mosque.crm.entity.PasswordResetToken;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserMemberLink;
import com.mosque.crm.enums.PersonStatus;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.PasswordResetTokenRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.UserMemberLinkRepository;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanLimitExceededException;
import com.mosque.crm.util.PhoneUtils;

@Service
public class BulkMemberAccountService {

    private static final Logger log = LoggerFactory.getLogger(BulkMemberAccountService.class);
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final PersonRepository persons;
    private final UserRepository users;
    private final UserMemberLinkRepository links;
    private final RoleRepository roles;
    private final PasswordResetTokenRepository tokens;
    private final OrganizationRepository organizations;
    private final PasswordEncoder passwordEncoder;
    private final AuthorizationService authorization;
    private final RoleGovernanceService governance;
    private final AccountActivationNotifier notifier;
    private final LoginIdentifierResolver loginResolver;
    private final OrganizationSubscriptionService subscriptions;
    private final UserContactService userContacts;
    private final TransactionTemplate transactions;

    public BulkMemberAccountService(PersonRepository persons, UserRepository users,
            UserMemberLinkRepository links, RoleRepository roles, PasswordResetTokenRepository tokens,
            OrganizationRepository organizations, PasswordEncoder passwordEncoder,
            AuthorizationService authorization, RoleGovernanceService governance,
            AccountActivationNotifier notifier, LoginIdentifierResolver loginResolver,
            OrganizationSubscriptionService subscriptions, PlatformTransactionManager transactionManager,
            UserContactService userContacts) {
        this.persons = persons;
        this.users = users;
        this.links = links;
        this.roles = roles;
        this.tokens = tokens;
        this.organizations = organizations;
        this.passwordEncoder = passwordEncoder;
        this.authorization = authorization;
        this.governance = governance;
        this.notifier = notifier;
        this.loginResolver = loginResolver;
        this.subscriptions = subscriptions;
        this.userContacts = userContacts;
        this.transactions = new TransactionTemplate(transactionManager);
        this.transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public List<MemberAccountResultDTO> candidates() {
        return Objects.requireNonNull(transactions.execute(transaction -> {
            Long organizationId = requireOrganization("member_account.view");
            List<AccountDetails> details = persons.findAccountCandidates(organizationId).stream()
                    .map(person -> details(person.getId(), person.getFirstName(), person.getLastName(),
                            person.getEmail(), person.getPhone(), person.getHasAccount(),
                            person.getStatus() == PersonStatus.ACTIVE && person.getDateOfDeath() == null))
                    .toList();
            if (details.stream().noneMatch(AccountDetails::needsAccount)) {
                return details.stream().map(person -> result(person, false)).toList();
            }
            // Scalars avoid loading User.roles and inverse one-to-one associations per row.
            List<UserRepository.AccountContact> contacts = authorization.withoutOrganizationFilter(
                    users::findAccountContacts);
            Set<String> usernames = new HashSet<>();
            Set<String> emails = new HashSet<>();
            Set<String> nationalNumbers = new HashSet<>();
            Set<Integer> nationalLengths = new HashSet<>();
            for (AccountDetails person : details) {
                if (person.needsAccount() && person.phone() != null) {
                    String national = person.phone().substring(1);
                    nationalNumbers.add(national);
                    nationalLengths.add(national.length());
                }
            }
            Map<String, Integer> suffixCounts = new HashMap<>();
            for (UserRepository.AccountContact contact : contacts) {
                String username = contact.getUsername();
                if (username != null) {
                    usernames.add(username.toLowerCase(Locale.ROOT));
                }
                if (contact.getEmail() != null) {
                    emails.add(contact.getEmail().trim().toLowerCase(Locale.ROOT));
                }
                if (contact.getPhone() != null) {
                    usernames.add(contact.getPhone());
                }
                Set<String> matchedSuffixes = new HashSet<>();
                for (String identifier : new String[] { username, contact.getPhone() }) {
                    if (identifier == null || !identifier.startsWith("+")) {
                        continue;
                    }
                    for (int length : nationalLengths) {
                        if (identifier.length() > length) {
                            String suffix = identifier.substring(identifier.length() - length);
                            if (nationalNumbers.contains(suffix)) {
                                matchedSuffixes.add(suffix);
                            }
                        }
                    }
                }
                matchedSuffixes.forEach(suffix -> suffixCounts.merge(suffix, 1, Integer::sum));
            }
            return details.stream().map(person -> result(person, person.needsAccount()
                    && (usernames.contains(person.username())
                            || (person.email() != null && emails.contains(person.email()))
                            || (person.phone() != null && (usernames.contains(person.phone())
                                    || usernames.contains(person.rawPhone().trim().toLowerCase(Locale.ROOT))
                                    || suffixCounts.getOrDefault(person.phone().substring(1), 0) == 1)))))
                    .toList();
        }));
    }

    public List<MemberAccountResultDTO> create(List<Long> personIds) {
        if (personIds == null || personIds.isEmpty() || personIds.size() > 10
                || personIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select between 1 and 10 members");
        }
        Long organizationId = Objects.requireNonNull(transactions.execute(transaction -> {
            Long scope = requireOrganization("member_account.manage");
            memberRole(scope);
            return scope;
        }));
        List<MemberAccountResultDTO> results = new ArrayList<>();
        for (Long personId : new LinkedHashSet<>(personIds)) {
            PendingActivation pending;
            try {
                pending = Objects.requireNonNull(transactions.execute(transaction -> {
                    if (!organizationId.equals(requireOrganization("member_account.manage"))) {
                        throw new AccessDeniedException("Organization changed during account creation");
                    }
                    return createOne(personId, organizationId);
                }));
            } catch (PlanLimitExceededException e) {
                log.warn("Bulk member account limit reached for organization={}", organizationId);
                results.add(new MemberAccountResultDTO(personId, null, null, Status.PLAN_LIMIT_REACHED));
                continue;
            } catch (DataAccessException | IllegalArgumentException e) {
                log.error("Bulk account creation failed for organization={} person={}", organizationId, personId, e);
                results.add(new MemberAccountResultDTO(personId, null, null, Status.FAILED));
                continue;
            }
            MemberAccountResultDTO result = pending.result();
            if (pending.user() != null) {
                // Send only after the account, link and setup token have committed.
                try {
                    AccountActivationNotifier.Channel channel = notifier.deliverWelcome(
                            pending.person(), pending.user(), pending.setupToken(),
                            internationalPhone(pending.person().getPhone()));
                    result.setStatus(switch (channel) {
                        case EMAIL -> Status.CREATED_EMAIL;
                        case WHATSAPP -> Status.CREATED_WHATSAPP;
                        case MANUAL -> Status.CREATED_NO_NOTIFICATION;
                    });
                } catch (DataAccessException | IllegalStateException e) {
                    log.error("Bulk account committed but notification failed for organization={} person={}",
                            organizationId, personId, e);
                    result.setStatus(Status.CREATED_NO_NOTIFICATION);
                }
            }
            results.add(result);
        }
        return results;
    }

    private PendingActivation createOne(Long personId, Long organizationId) {
        organizations.findForAccountCreation(organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        Person person = persons.findForAccountCreation(personId, organizationId).orElse(null);
        if (person == null) {
            return new PendingActivation(new MemberAccountResultDTO(personId, null, null, Status.NOT_FOUND),
                    null, null, null);
        }
        MemberAccountResultDTO result = evaluate(person);
        if (result.getStatus() != Status.ELIGIBLE_EMAIL && result.getStatus() != Status.ELIGIBLE_WHATSAPP) {
            return new PendingActivation(result, null, null, null);
        }
        Integer limit = subscriptions.getFeatureLimit(organizationId, FeatureKeys.ADMIN_USERS_MAX);
        long current = users.countByOrganizationId(organizationId);
        if (limit != null && current >= limit) {
            throw new PlanLimitExceededException(FeatureKeys.ADMIN_USERS_MAX, limit, Math.toIntExact(current));
        }
        Role role = memberRole(organizationId);
        User user = new User();
        user.setOrganizationId(organizationId);
        user.setUsername(result.getUsername());
        userContacts.initializeMemberContacts(user,
                result.getStatus() == Status.ELIGIBLE_EMAIL ? normalizedEmail(person.getEmail()) : null,
                person.getPhone());
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setAccountEnabled(true);
        user.setMustChangePassword(true);
        user.setRoles(Set.of(role));
        users.saveAndFlush(user);

        UserMemberLink link = new UserMemberLink();
        link.setOrganizationId(organizationId);
        link.setPerson(person);
        link.setUser(user);
        links.saveAndFlush(link);
        String setupToken = UUID.randomUUID().toString();
        tokens.saveAndFlush(new PasswordResetToken(user, setupToken, LocalDateTime.now().plusHours(72)));
        log.info("Created bulk member account organization={} person={} user={}",
                organizationId, personId, user.getId());
        return new PendingActivation(result, person, user, setupToken);
    }

    private MemberAccountResultDTO evaluate(Person person) {
        AccountDetails details = details(person.getId(), person.getFirstName(), person.getLastName(),
                person.getEmail(), person.getPhone(), links.findByPersonId(person.getId()).isPresent(),
                person.getStatus() == PersonStatus.ACTIVE && person.getDateOfDeath() == null);
        boolean conflict = details.needsAccount() && authorization.withoutOrganizationFilter(() ->
                users.existsByAccountContact(details.username(), details.email())
                        || (details.phone() != null && users.existsByAccountContact(details.phone(), null))
                        || (details.phone() != null && loginResolver.resolve(details.phone()).isPresent())
                        || (details.phone() != null && loginResolver.resolve(details.rawPhone()).isPresent()));
        return result(details, conflict);
    }

    private AccountDetails details(Long id, String firstName, String lastName, String rawEmail, String rawPhone,
            boolean hasAccount, boolean active) {
        String name = ((firstName == null ? "" : firstName) + " "
                + (lastName == null ? "" : lastName)).trim();
        return new AccountDetails(id, name, normalizedEmail(rawEmail), internationalPhone(rawPhone),
                rawPhone, hasAccount, active);
    }

    private MemberAccountResultDTO result(AccountDetails person, boolean contactInUse) {
        Status status;
        if (person.hasAccount()) {
            status = Status.ALREADY_HAS_ACCOUNT;
        } else if (!person.active()) {
            status = Status.INACTIVE;
        } else if (person.username() == null) {
            status = Status.NO_VALID_CONTACT;
        } else if (contactInUse) {
            status = Status.CONTACT_IN_USE;
        } else {
            status = person.email() != null ? Status.ELIGIBLE_EMAIL : Status.ELIGIBLE_WHATSAPP;
        }
        return new MemberAccountResultDTO(person.id(), person.name(), person.username(), status);
    }

    private String normalizedEmail(String raw) {
        if (raw == null) {
            return null;
        }
        String email = raw.trim().toLowerCase(Locale.ROOT);
        return email.length() <= 50 && EMAIL.matcher(email).matches() ? email : null;
    }

    private String internationalPhone(String raw) {
        if (raw == null || !(raw.trim().startsWith("+") || raw.trim().startsWith("00"))) {
            return null;
        }
        return PhoneUtils.toE164(raw, null);
    }

    private Long requireOrganization(String permission) {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (!authorization.hasPermissionForOrganization(permission, organizationId)) {
            throw new AccessDeniedException("Insufficient permissions for bulk member accounts");
        }
        if (organizationId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select an organization first");
        }
        return organizationId;
    }

    private Role memberRole(Long organizationId) {
        Role role = roles.findByNameAndOrganizationId("MEMBER", organizationId)
                .or(() -> roles.findByNameAndOrganizationIdIsNull("MEMBER"))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "MEMBER role not found"));
        if (!governance.canAssignRole(role)) {
            throw new AccessDeniedException("You are not allowed to assign the MEMBER role");
        }
        return role;
    }

    private record PendingActivation(MemberAccountResultDTO result, Person person, User user, String setupToken) {
    }

    private record AccountDetails(Long id, String name, String email, String phone, String rawPhone,
            boolean hasAccount, boolean active) {
        String username() {
            return email != null ? email : phone;
        }

        boolean needsAccount() {
            return !hasAccount && active && username() != null;
        }
    }
}
