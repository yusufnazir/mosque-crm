package com.mosque.crm.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import java.util.stream.IntStream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.web.server.ResponseStatusException;

import com.mosque.crm.dto.MemberAccountResultDTO.Status;
import com.mosque.crm.entity.Organization;
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

class BulkMemberAccountServiceTest {
    private final PersonRepository persons = mock(PersonRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final UserMemberLinkRepository links = mock(UserMemberLinkRepository.class);
    private final RoleRepository roles = mock(RoleRepository.class);
    private final PasswordResetTokenRepository tokens = mock(PasswordResetTokenRepository.class);
    private final OrganizationRepository organizations = mock(OrganizationRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final AuthorizationService authorization = mock(AuthorizationService.class);
    private final RoleGovernanceService governance = mock(RoleGovernanceService.class);
    private final AccountActivationNotifier notifier = mock(AccountActivationNotifier.class);
    private final LoginIdentifierResolver resolver = mock(LoginIdentifierResolver.class);
    private final OrganizationSubscriptionService subscriptions = mock(OrganizationSubscriptionService.class);
    private final PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
    private final Role memberRole = new Role();
    private BulkMemberAccountService service;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentOrganizationId(7L);
        memberRole.setId(2L);
        memberRole.setName("MEMBER");
        when(transactionManager.getTransaction(any())).thenAnswer(invocation -> new SimpleTransactionStatus());
        when(authorization.hasPermissionForOrganization(anyString(), eq(7L))).thenReturn(true);
        when(authorization.withoutOrganizationFilter(any()))
                .thenAnswer(invocation -> ((Supplier<?>) invocation.getArgument(0)).get());
        when(roles.findByNameAndOrganizationId("MEMBER", 7L)).thenReturn(Optional.of(memberRole));
        when(governance.canAssignRole(memberRole)).thenReturn(true);
        when(organizations.findForAccountCreation(7L)).thenReturn(Optional.of(new Organization()));
        when(encoder.encode(anyString())).thenReturn("hashed-random-password");
        when(subscriptions.getFeatureLimit(7L, FeatureKeys.ADMIN_USERS_MAX)).thenReturn(null);
        when(users.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(99L);
            return user;
        });
        service = new BulkMemberAccountService(persons, users, links, roles, tokens, organizations,
                encoder, authorization, governance, notifier, resolver, subscriptions, transactionManager,
                new UserContactService(users, authorization));
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void createsMemberAccountAndCommitsBeforeSendingEmail() {
        Person person = person(1L, " MEMBER@EXAMPLE.COM ", "+5978123456");
        when(notifier.normalizePhone("+5978123456")).thenReturn("+5978123456");
        when(persons.findForAccountCreation(1L, 7L)).thenReturn(Optional.of(person));
        when(notifier.deliverWelcome(eq(person), any(User.class), anyString(), eq("+5978123456")))
                .thenReturn(AccountActivationNotifier.Channel.EMAIL);
        LocalDateTime before = LocalDateTime.now();

        var result = service.create(List.of(1L)).get(0);

        assertThat(result.getStatus()).isEqualTo(Status.CREATED_EMAIL);
        assertThat(result.getUsername()).isEqualTo("member@example.com");
        var userCaptor = ArgumentCaptor.forClass(User.class);
        var linkCaptor = ArgumentCaptor.forClass(UserMemberLink.class);
        var tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        var ordered = inOrder(users, links, tokens, transactionManager, notifier);
        ordered.verify(transactionManager).commit(any());
        ordered.verify(users).saveAndFlush(userCaptor.capture());
        ordered.verify(links).saveAndFlush(linkCaptor.capture());
        ordered.verify(tokens).saveAndFlush(tokenCaptor.capture());
        ordered.verify(transactionManager).commit(any());
        ordered.verify(notifier).deliverWelcome(eq(person), eq(userCaptor.getValue()),
                eq(tokenCaptor.getValue().getToken()), eq("+5978123456"));
        User user = userCaptor.getValue();
        assertThat(user.getOrganizationId()).isEqualTo(7L);
        assertThat(user.getPhone()).isEqualTo("+5978123456");
        assertThat(user.getRoles()).containsExactly(memberRole);
        assertThat(user.isAccountEnabled()).isTrue();
        assertThat(user.isMustChangePassword()).isTrue();
        assertThat(user.getPassword()).isEqualTo("hashed-random-password");
        assertThat(linkCaptor.getValue().getPerson()).isSameAs(person);
        assertThat(linkCaptor.getValue().getOrganizationId()).isEqualTo(7L);
        assertThat(tokenCaptor.getValue().getExpiresAt())
                .isBetween(before.plusHours(72), LocalDateTime.now().plusHours(72));
        assertThat(tokenCaptor.getValue().isUsed()).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = AccountActivationNotifier.Channel.class, names = {"WHATSAPP", "MANUAL"})
    void createsPhoneAccountAndReportsQueuedOrFailedNotification(AccountActivationNotifier.Channel channel) {
        Person person = person(1L, null, "+5978123456");
        when(persons.findForAccountCreation(1L, 7L)).thenReturn(Optional.of(person));
        when(notifier.normalizePhone("+5978123456")).thenReturn("+5978123456");
        when(notifier.deliverWelcome(eq(person), any(User.class), anyString(), eq("+5978123456")))
                .thenReturn(channel);

        var result = service.create(List.of(1L)).get(0);

        assertThat(result.getUsername()).isEqualTo("+5978123456");
        assertThat(result.getStatus()).isEqualTo(channel == AccountActivationNotifier.Channel.WHATSAPP
                ? Status.CREATED_WHATSAPP : Status.CREATED_NO_NOTIFICATION);
        var user = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(user.capture());
        assertThat(user.getValue().getEmail()).isNull();
    }

    @Test
    void skipsLinkedMembersIncludingDisabledAccountsOnRetry() {
        Person person = person(1L, "member@example.com", null);
        when(persons.findForAccountCreation(1L, 7L)).thenReturn(Optional.of(person));
        when(links.findByPersonId(1L)).thenReturn(Optional.empty(), Optional.of(new UserMemberLink()));
        when(notifier.deliverWelcome(eq(person), any(User.class), anyString(), eq(null)))
                .thenReturn(AccountActivationNotifier.Channel.EMAIL);

        assertThat(service.create(List.of(1L, 1L))).extracting(result -> result.getStatus())
                .containsExactly(Status.CREATED_EMAIL);
        assertThat(service.create(List.of(1L))).extracting(result -> result.getStatus())
                .containsExactly(Status.ALREADY_HAS_ACCOUNT);
        verify(users).saveAndFlush(any(User.class));
        verify(notifier).deliverWelcome(eq(person), any(User.class), anyString(), eq(null));
    }

    @Test
    void previewAndCreationSkipInactiveMissingContactsAndGlobalContactConflicts() {
        Person inactive = person(1L, "inactive@example.com", null);
        inactive.setStatus(PersonStatus.INACTIVE);
        Person deceased = person(2L, "deceased@example.com", null);
        deceased.setDateOfDeath(java.time.LocalDate.now());
        Person localPhone = person(3L, null, "8123456");
        Person conflict = person(4L, "other@example.com", null);
        when(users.existsByAccountContact("other@example.com", "other@example.com")).thenReturn(true);
        var people = List.of(inactive, deceased, localPhone, conflict);
        var projected = people.stream().map(person -> candidate(person, false)).toList();
        var contacts = List.of(contact("other-user", "OTHER@EXAMPLE.COM"));
        when(persons.findAccountCandidates(7L)).thenReturn(projected);
        when(users.findAccountContacts()).thenReturn(contacts);
        people.forEach(person -> when(persons.findForAccountCreation(person.getId(), 7L))
                .thenReturn(Optional.of(person)));

        assertThat(service.candidates()).extracting(result -> result.getStatus())
                .containsExactly(Status.INACTIVE, Status.INACTIVE, Status.NO_VALID_CONTACT, Status.CONTACT_IN_USE);
        assertThat(service.create(List.of(1L, 2L, 3L, 4L))).extracting(result -> result.getStatus())
                .containsExactly(Status.INACTIVE, Status.INACTIVE, Status.NO_VALID_CONTACT, Status.CONTACT_IN_USE);
        verify(users, never()).saveAndFlush(any());
        verify(notifier, never()).deliverWelcome(any(), any(), anyString(), any());
    }

    @Test
    void rejectsForeignMemberIdsEvenForPlatformAdminScope() {
        when(persons.findForAccountCreation(8L, 7L)).thenReturn(Optional.empty());

        assertThat(service.create(List.of(8L))).extracting(result -> result.getStatus())
                .containsExactly(Status.NOT_FOUND);
        verify(persons).findForAccountCreation(8L, 7L);
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void refusesUnscopedOrUnauthorizedActionsAndRoleAssignment() {
        when(authorization.hasPermissionForOrganization("member_account.manage", 7L)).thenReturn(false);
        assertThatThrownBy(() -> service.create(List.of(1L))).isInstanceOf(AccessDeniedException.class);
        when(authorization.hasPermissionForOrganization("member_account.manage", 7L)).thenReturn(true);
        when(governance.canAssignRole(memberRole)).thenReturn(false);
        assertThatThrownBy(() -> service.create(List.of(1L))).isInstanceOf(AccessDeniedException.class);

        TenantContext.clear();
        when(authorization.hasPermissionForOrganization("member_account.view", null)).thenReturn(true);
        assertThatThrownBy(() -> service.candidates()).isInstanceOf(ResponseStatusException.class);
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void enforcesSubscriptionLimitAndRollsBackFailureWithoutSending() {
        Person person = person(1L, "member@example.com", null);
        when(persons.findForAccountCreation(1L, 7L)).thenReturn(Optional.of(person));
        when(subscriptions.getFeatureLimit(7L, FeatureKeys.ADMIN_USERS_MAX)).thenReturn(2);
        when(users.countByOrganizationId(7L)).thenReturn(2L);

        assertThat(service.create(List.of(1L))).extracting(result -> result.getStatus())
                .containsExactly(Status.PLAN_LIMIT_REACHED);
        verify(transactionManager).rollback(any());
        verify(users, never()).saveAndFlush(any());
        verify(notifier, never()).deliverWelcome(any(), any(), anyString(), any());
    }

    @Test
    void failedAccountDoesNotPreventNextAccountAndNeverSendsItsUncommittedToken() {
        Person first = person(1L, "first@example.com", null);
        Person second = person(2L, "second@example.com", null);
        when(persons.findForAccountCreation(1L, 7L)).thenReturn(Optional.of(first));
        when(persons.findForAccountCreation(2L, 7L)).thenReturn(Optional.of(second));
        when(users.saveAndFlush(any(User.class))).thenThrow(new DataIntegrityViolationException("conflict"))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(notifier.deliverWelcome(eq(second), any(User.class), anyString(), eq(null)))
                .thenReturn(AccountActivationNotifier.Channel.EMAIL);

        assertThat(service.create(List.of(1L, 2L))).extracting(result -> result.getStatus())
                .containsExactly(Status.FAILED, Status.CREATED_EMAIL);
        verify(transactionManager).rollback(any());
        verify(notifier, never()).deliverWelcome(eq(first), any(), anyString(), any());
    }

    @Test
    void unusableEmailFallsBackToInternationalPhoneWithoutOverwritingContact() {
        Person person = person(1L, "not-an-email", "+5978123456");
        when(persons.findForAccountCreation(1L, 7L)).thenReturn(Optional.of(person));
        when(notifier.normalizePhone("+5978123456")).thenReturn("+5978123456");
        when(notifier.deliverWelcome(eq(person), any(User.class), anyString(), eq("+5978123456")))
                .thenReturn(AccountActivationNotifier.Channel.WHATSAPP);

        assertThat(service.create(List.of(1L)).get(0).getUsername()).isEqualTo("+5978123456");
        assertThat(person.getEmail()).isEqualTo("not-an-email");
        verify(persons, never()).save(any());
    }

    @Test
    void notificationConfigurationErrorIsReportedWithoutUndoingCommittedAccount() {
        Person person = person(1L, "member@example.com", null);
        when(persons.findForAccountCreation(1L, 7L)).thenReturn(Optional.of(person));
        when(notifier.deliverWelcome(eq(person), any(User.class), anyString(), eq(null)))
                .thenThrow(new IllegalStateException("Invalid message language"));

        assertThat(service.create(List.of(1L))).extracting(result -> result.getStatus())
                .containsExactly(Status.CREATED_NO_NOTIFICATION);
        verify(transactionManager, never()).rollback(any());
        verify(users).saveAndFlush(any());
    }

    @Test
    void previewUsesTwoBulkReadsForFiveHundredMembersWithoutPerMemberLookups() {
        var candidates = IntStream.rangeClosed(1, 500)
                .mapToObj(id -> candidate(person((long) id, "member" + id + "@example.com", null), false))
                .toList();
        var contacts = List.of(contact("unrelated-user", "unrelated@example.com"));
        when(persons.findAccountCandidates(7L)).thenReturn(candidates);
        when(users.findAccountContacts()).thenReturn(contacts);

        var preview = service.candidates();

        assertThat(preview).hasSize(500).allMatch(row -> row.getStatus() == Status.ELIGIBLE_EMAIL);
        verify(persons).findAccountCandidates(7L);
        verify(users).findAccountContacts();
        verifyNoMoreInteractions(persons, users);
        verifyNoInteractions(links, resolver, notifier);
    }

    @Test
    void previewPreservesCaseInsensitiveEmailAndUniquePhoneSuffixConflictRules() {
        var members = List.of(
                person(1L, "owner@example.com", null),
                person(2L, "email-only@example.com", null),
                person(3L, null, "+5978123456"),
                person(4L, null, "+5978223456"),
                person(5L, null, "+597 8323456"));
        var projected = members.stream().map(person -> candidate(person, false)).toList();
        var contacts = List.of(
                contact("OWNER@EXAMPLE.COM", null),
                contact("different-username", "EMAIL-ONLY@EXAMPLE.COM"),
                contact("+315978123456", null),
                contact("+315978223456", null),
                contact("+445978223456", null),
                contact("+597 8323456", null));
        when(persons.findAccountCandidates(7L)).thenReturn(projected);
        when(users.findAccountContacts()).thenReturn(contacts);

        assertThat(service.candidates()).extracting(row -> row.getStatus()).containsExactly(
                Status.CONTACT_IN_USE, Status.CONTACT_IN_USE, Status.CONTACT_IN_USE,
                Status.ELIGIBLE_WHATSAPP, Status.CONTACT_IN_USE);
        verifyNoInteractions(links, resolver, notifier);
    }

    @Test
    void previewDoesNotLoadGlobalContactsWhenAllMembersAlreadyHaveAccounts() {
        var projected = List.of(candidate(person(1L, "member@example.com", null), true));
        when(persons.findAccountCandidates(7L)).thenReturn(projected);

        assertThat(service.candidates()).extracting(row -> row.getStatus())
                .containsExactly(Status.ALREADY_HAS_ACCOUNT);
        verifyNoInteractions(users, links, resolver, notifier);
    }

    @Test
    void previewIncludesAccountPhoneAliasesAndCountsMatchingUsersRatherThanMatchingFields() {
        var projected = List.of(
                candidate(person(1L, null, "+5978123456"), false),
                candidate(person(2L, null, "+5978223456"), false));
        var exact = contact("email-owner", null);
        when(exact.getPhone()).thenReturn("+5978123456");
        var suffix = contact("+315978223456", null);
        when(suffix.getPhone()).thenReturn("+445978223456");
        when(persons.findAccountCandidates(7L)).thenReturn(projected);
        when(users.findAccountContacts()).thenReturn(List.of(exact, suffix));

        assertThat(service.candidates()).extracting(row -> row.getStatus())
                .containsExactly(Status.CONTACT_IN_USE, Status.CONTACT_IN_USE);
        verifyNoInteractions(resolver, links, notifier);
    }

    @Test
    void aNewAliasConflictFailsOnlyThatAccountWithoutCreatingOrNotifyingIt() {
        var person = person(1L, "member@example.com", "+5978123456");
        when(persons.findForAccountCreation(1L, 7L)).thenReturn(Optional.of(person));
        when(users.existsByLoginContactExcludingUser("member@example.com", null)).thenReturn(true);

        assertThat(service.create(List.of(1L))).extracting(row -> row.getStatus())
                .containsExactly(Status.FAILED);
        verify(users, never()).saveAndFlush(any());
        verifyNoInteractions(notifier, tokens);
    }

    private PersonRepository.AccountCandidate candidate(Person person, boolean hasAccount) {
        var candidate = mock(PersonRepository.AccountCandidate.class);
        when(candidate.getId()).thenReturn(person.getId());
        when(candidate.getFirstName()).thenReturn(person.getFirstName());
        when(candidate.getLastName()).thenReturn(person.getLastName());
        when(candidate.getEmail()).thenReturn(person.getEmail());
        when(candidate.getPhone()).thenReturn(person.getPhone());
        when(candidate.getStatus()).thenReturn(person.getStatus());
        when(candidate.getDateOfDeath()).thenReturn(person.getDateOfDeath());
        when(candidate.getHasAccount()).thenReturn(hasAccount);
        return candidate;
    }

    private UserRepository.AccountContact contact(String username, String email) {
        var contact = mock(UserRepository.AccountContact.class);
        when(contact.getUsername()).thenReturn(username);
        when(contact.getEmail()).thenReturn(email);
        return contact;
    }

    private Person person(Long id, String email, String phone) {
        Person person = new Person();
        person.setId(id);
        person.setOrganizationId(7L);
        person.setFirstName("Member " + id);
        person.setEmail(email);
        person.setPhone(phone);
        person.setStatus(PersonStatus.ACTIVE);
        return person;
    }
}
