package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.JoinRequestCreateDTO;
import com.mosque.crm.dto.JoinRequestDTO;
import com.mosque.crm.entity.JoinRequest;
import com.mosque.crm.entity.MembershipTermsVersion;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.PasswordResetToken;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserMemberLink;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.JoinRequestRepository;
import com.mosque.crm.repository.MembershipTermsVersionRepository;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.PasswordResetTokenRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.UserMemberLinkRepository;
import com.mosque.crm.repository.UserRepository;

@Service
@Transactional
public class JoinRequestService {

    private static final Logger log = LoggerFactory.getLogger(JoinRequestService.class);
    private static final int APPROVAL_TOKEN_HOURS = 72;

    private final JoinRequestRepository joinRequestRepository;
    private final OrganizationRepository organizationRepository;
    private final PersonRepository personRepository;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserMemberLinkRepository userMemberLinkRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final ConfigurationService configurationService;
    private final MembershipTermsVersionRepository membershipTermsVersionRepository;

    public JoinRequestService(
            JoinRequestRepository joinRequestRepository,
            OrganizationRepository organizationRepository,
            PersonRepository personRepository,
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            UserMemberLinkRepository userMemberLinkRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            ConfigurationService configurationService,
            MembershipTermsVersionRepository membershipTermsVersionRepository) {
        this.joinRequestRepository = joinRequestRepository;
        this.organizationRepository = organizationRepository;
        this.personRepository = personRepository;
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.userMemberLinkRepository = userMemberLinkRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.configurationService = configurationService;
        this.membershipTermsVersionRepository = membershipTermsVersionRepository;
    }

    /**
     * Public endpoint — no tenant context. Looks up org by handle.
     */
    public JoinRequestDTO apply(JoinRequestCreateDTO dto) {
        Organization org = organizationRepository.findByHandle(dto.getOrgHandle())
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + dto.getOrgHandle()));

        String normalizedEmail = normalizeEmail(dto.getEmail());

        if (joinRequestRepository.existsByEmailIgnoreCaseAndOrganizationId(normalizedEmail, org.getId())) {
            throw new IllegalStateException("This email already has a registration request in this organization.");
        }

        if (userRepository.existsByEmailIgnoreCaseAndOrganizationId(normalizedEmail, org.getId())) {
            throw new IllegalStateException("This email is already registered in this organization.");
        }

        Optional<MembershipTermsVersion> activeTerms = membershipTermsVersionRepository
                .findFirstByOrganizationIdAndActiveTrueOrderByVersionNumberDesc(org.getId());
        if (activeTerms.isPresent()) {
            Long acceptedTermsVersionId = dto.getAcceptedTermsVersionId();
            if (acceptedTermsVersionId == null || !acceptedTermsVersionId.equals(activeTerms.get().getId())) {
                throw new IllegalStateException("You must accept the latest membership terms before signing up.");
            }
        }

        JoinRequest request = new JoinRequest();
        request.setOrganizationId(org.getId());
        request.setStatus(JoinRequest.Status.PENDING.name());
        request.setFirstName(dto.getFirstName());
        request.setLastName(dto.getLastName());
        request.setEmail(normalizedEmail);
        request.setPhone(dto.getPhone());
        request.setGender(dto.getGender());
        request.setDateOfBirth(dto.getDateOfBirth());
        request.setAddress(dto.getAddress());
        request.setCity(dto.getCity());
        request.setCountry(dto.getCountry());
        request.setPostalCode(dto.getPostalCode());
        request.setIdNumber(dto.getIdNumber());
        request.setSubmittedAt(LocalDateTime.now());
        if (activeTerms.isPresent()) {
            MembershipTermsVersion termsVersion = activeTerms.get();
            request.setTermsVersionId(termsVersion.getId());
            request.setTermsVersionNumber(termsVersion.getVersionNumber());
            request.setTermsTitle(termsVersion.getTitle());
            request.setTermsAcceptedAt(LocalDateTime.now());
        }

        JoinRequest saved = joinRequestRepository.save(request);

        // Notify the registrant
        try {
            String appName = configurationService.getAppName();
            emailService.sendJoinRequestReceivedEmail(dto.getEmail(), dto.getFirstName(), org.getName(), appName, "en");
        } catch (Exception e) {
            log.warn("Failed to send join request received email: {}", e.getMessage());
        }

        // Notify all org admins
        try {
            String adminUrl = buildOrgUrl(org.getHandle(), "/member-requests");
            String appName = configurationService.getAppName();
            String requesterName = dto.getFirstName() + " " + dto.getLastName();
            List<User> admins = userRepository.findAdminUsersWithEmail(org.getId());
            if (admins.isEmpty()) {
                log.warn("No admin recipients with email found for organization {}. Join request id={}", org.getId(), saved.getId());
            }
            for (User admin : admins) {
                try {
                    emailService.sendJoinRequestAdminNotification(
                            admin.getEmail(), requesterName, dto.getEmail(),
                            org.getName(), appName, adminUrl, "en");
                } catch (Exception e) {
                    log.warn("Failed to send admin notification to {}: {}", admin.getEmail(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send admin notifications: {}", e.getMessage());
        }

        return toDTO(saved);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("Email is required.");
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Email is required.");
        }
        return normalized;
    }

    public List<JoinRequestDTO> getAll() {
        return joinRequestRepository.findAllByOrderBySubmittedAtDesc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<JoinRequestDTO> getByStatus(String status) {
        return joinRequestRepository.findByStatusOrderBySubmittedAtDesc(status)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public long getPendingCount() {
        return joinRequestRepository.countByStatus(JoinRequest.Status.PENDING.name());
    }

    public JoinRequestDTO getById(Long id) {
        JoinRequest request = joinRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Join request not found: " + id));
        return toDTO(request);
    }

    /**
     * Admin — delete a join request record.
     *
     * Note: If the request was already approved and created a user/person,
     * deleting the request does NOT delete those linked records.
     */
    public void delete(Long id) {
        JoinRequest request = joinRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Join request not found: " + id));

        if (JoinRequest.Status.APPROVED.name().equals(request.getStatus())) {
            throw new IllegalStateException("Approved join requests cannot be deleted.");
        }

        joinRequestRepository.delete(request);
    }

    public JoinRequestDTO approve(Long id, String reviewedBy) {
        JoinRequest request = joinRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Join request not found: " + id));

        if (!JoinRequest.Status.PENDING.name().equals(request.getStatus())) {
            throw new IllegalStateException("Join request is not in PENDING status");
        }

        String token = UUID.randomUUID().toString();
        request.setApprovalToken(token);
        request.setTokenExpiresAt(LocalDateTime.now().plusHours(APPROVAL_TOKEN_HOURS));
        request.setStatus(JoinRequest.Status.APPROVED.name());
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(reviewedBy);

        Organization org = organizationRepository.findById(request.getOrganizationId())
            .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        // Create person + user immediately when approved
        if (request.getPersonId() == null) {
            Person savedPerson = createPersonFromRequest(request, org);
            User user = createMemberUserFromRequest(request, org);
            createUserMemberLink(org, user, savedPerson);
            request.setPersonId(savedPerson.getId());
        }

        joinRequestRepository.save(request);

        User user = userRepository.findByUsername(request.getEmail())
            .orElseThrow(() -> new IllegalStateException("Approved member user not found"));
        String setupToken = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken(user, setupToken,
            LocalDateTime.now().plusHours(APPROVAL_TOKEN_HOURS));
        passwordResetTokenRepository.save(resetToken);

        // Send approval email with password setup link
        try {
            String completionUrl = buildOrgUrl(org.getHandle(), "/reset-password?token=" + setupToken);
            String appName = configurationService.getAppName();
            emailService.sendJoinRequestApprovedEmail(
                    request.getEmail(), request.getFirstName(), org.getName(), appName, completionUrl, "en");
        } catch (Exception e) {
            log.warn("Failed to send approval email: {}", e.getMessage());
        }

        return toDTO(request);
    }

    private Person createPersonFromRequest(JoinRequest request, Organization org) {
        Person person = new Person();
        person.setOrganizationId(org.getId());
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setEmail(request.getEmail());
        person.setPhone(request.getPhone());
        person.setGender(request.getGender());
        person.setDateOfBirth(request.getDateOfBirth());
        person.setAddress(request.getAddress());
        person.setCity(request.getCity());
        person.setCountry(request.getCountry());
        person.setPostalCode(request.getPostalCode());
        person.setIdNumber(request.getIdNumber());
        return personRepository.save(person);
    }

    private User createMemberUserFromRequest(JoinRequest request, Organization org) {
        String username = request.getEmail();
        User existing = userRepository.findByUsername(username).orElse(null);
        if (existing != null) {
            if (existing.getOrganizationId() == null || !existing.getOrganizationId().equals(org.getId())) {
                throw new IllegalStateException(
                        "This email is already used by an account in another organization.");
            }
            return existing;
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setMustChangePassword(true);
        user.setAccountEnabled(true);
        user.setOrganizationId(org.getId());
        user.setSelectedOrganizationId(org.getId());

        // Member accounts from join requests are always MEMBER only.
        Role memberRole = roleRepository.findByNameAndOrganizationId("MEMBER", org.getId())
                .orElseGet(() -> roleRepository.findByNameAndOrganizationIdIsNull("MEMBER")
                        .orElseThrow(() -> new IllegalStateException("MEMBER role not found")));
        Set<Role> roles = new HashSet<>();
        roles.add(memberRole);
        user.setRoles(roles);

        return userRepository.save(user);
    }

    private void createUserMemberLink(Organization org, User user, Person person) {
        UserMemberLink link = new UserMemberLink();
        link.setOrganizationId(org.getId());
        link.setUser(user);
        link.setPerson(person);
        userMemberLinkRepository.save(link);
    }

    public JoinRequestDTO reject(Long id, String rejectionReason, String reviewedBy) {
        JoinRequest request = joinRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Join request not found: " + id));

        if (!JoinRequest.Status.PENDING.name().equals(request.getStatus())) {
            throw new IllegalStateException("Join request is not in PENDING status");
        }

        request.setStatus(JoinRequest.Status.REJECTED.name());
        request.setRejectionReason(rejectionReason);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(reviewedBy);

        joinRequestRepository.save(request);

        // Send rejection email
        try {
            Organization org = organizationRepository.findById(request.getOrganizationId())
                    .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
            String appName = configurationService.getAppName();
            emailService.sendJoinRequestRejectedEmail(
                    request.getEmail(), request.getFirstName(), org.getName(), appName, rejectionReason, "en");
        } catch (Exception e) {
            log.warn("Failed to send rejection email: {}", e.getMessage());
        }

        return toDTO(request);
    }

    /**
     * Public — validates approval token and returns basic info for the completion form.
     * Uses native query to bypass Hibernate @Filter.
     */
    @Transactional(readOnly = true)
    public JoinRequestDTO validateToken(String token) {
        JoinRequest request = joinRequestRepository.findByApprovalTokenNative(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired token"));

        if (!JoinRequest.Status.APPROVED.name().equals(request.getStatus())) {
            throw new IllegalStateException("Token is not for an approved request");
        }
        if (request.getTokenExpiresAt() != null && request.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Token has expired");
        }

        return toDTO(request);
    }

    /**
     * Public — completes registration: creates Person, User, UserMemberLink.
     * Returns the org handle so the frontend can redirect to the correct subdomain.
     */
    public String completeRegistration(String token, String password) {
        JoinRequest request = joinRequestRepository.findByApprovalTokenNative(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired token"));

        if (!JoinRequest.Status.APPROVED.name().equals(request.getStatus())) {
            throw new IllegalStateException("Token is not valid");
        }
        if (request.getTokenExpiresAt() != null && request.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Token has expired");
        }
        if (request.getPersonId() != null) {
            throw new IllegalStateException("Registration already completed");
        }

        Organization org = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        // Create Person
        Person person = new Person();
        person.setOrganizationId(org.getId());
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setEmail(request.getEmail());
        person.setPhone(request.getPhone());
        person.setGender(request.getGender());
        person.setDateOfBirth(request.getDateOfBirth());
        person.setAddress(request.getAddress());
        person.setCity(request.getCity());
        person.setCountry(request.getCountry());
        person.setPostalCode(request.getPostalCode());
        person.setIdNumber(request.getIdNumber());
        Person savedPerson = personRepository.save(person);

        // Create User (email = username)
        String username = request.getEmail();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            user = new User();
            user.setUsername(username);
            user.setEmail(request.getEmail());
            user.setPassword(passwordEncoder.encode(password));
            user.setAccountEnabled(true);
            user.setOrganizationId(org.getId());
            user.setSelectedOrganizationId(org.getId());

            // Assign MEMBER role
            Role memberRole = roleRepository.findByNameAndOrganizationId("MEMBER", org.getId())
                    .orElseGet(() -> roleRepository.findByNameAndOrganizationIdIsNull("MEMBER")
                            .orElseThrow(() -> new IllegalStateException("MEMBER role not found")));
            Set<Role> roles = new HashSet<>();
            roles.add(memberRole);
            user.setRoles(roles);

            userRepository.save(user);
        }

        // Create UserMemberLink
        UserMemberLink link = new UserMemberLink();
        link.setOrganizationId(org.getId());
        link.setUser(user);
        link.setPerson(savedPerson);
        userMemberLinkRepository.save(link);

        // Mark join request as completed
        request.setPersonId(savedPerson.getId());
        // Invalidate token
        request.setApprovalToken(null);
        joinRequestRepository.save(request);

        return org.getHandle();
    }

    /**
     * Send a membership invitation email to the given address for the current tenant.
     */
    public void sendInvite(String email, String locale) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        if (orgId == null) {
            throw new IllegalStateException("No organization context found.");
        }
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
        String encodedEmail;
        try {
            encodedEmail = java.net.URLEncoder.encode(email, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception ex) {
            encodedEmail = email;
        }
        String registrationUrl = buildOrgUrl(org.getHandle(), "/register-member?email=" + encodedEmail);
        String appName = configurationService.getAppName();
        emailService.sendMemberInviteEmail(email, org.getName(), appName, registrationUrl,
                locale != null ? locale : "en");
    }

    private String buildOrgUrl(String orgHandle, String path) {
        String protocol = configurationService.getFrontendProtocol();
        String baseDomain = configurationService.getFrontendBaseDomain();
        return protocol + "://" + orgHandle + "." + baseDomain + path;
    }

    private JoinRequestDTO toDTO(JoinRequest r) {
        JoinRequestDTO dto = new JoinRequestDTO();
        dto.setId(r.getId());
        dto.setOrganizationId(r.getOrganizationId());
        dto.setStatus(r.getStatus());
        dto.setFirstName(r.getFirstName());
        dto.setLastName(r.getLastName());
        dto.setEmail(r.getEmail());
        dto.setPhone(r.getPhone());
        dto.setGender(r.getGender());
        dto.setDateOfBirth(r.getDateOfBirth());
        dto.setAddress(r.getAddress());
        dto.setCity(r.getCity());
        dto.setCountry(r.getCountry());
        dto.setPostalCode(r.getPostalCode());
        dto.setIdNumber(r.getIdNumber());
        dto.setReviewedAt(r.getReviewedAt());
        dto.setReviewedBy(r.getReviewedBy());
        dto.setRejectionReason(r.getRejectionReason());
        dto.setPersonId(r.getPersonId());
        dto.setSubmittedAt(r.getSubmittedAt());
        dto.setTermsVersionId(r.getTermsVersionId());
        dto.setTermsVersionNumber(r.getTermsVersionNumber());
        dto.setTermsTitle(r.getTermsTitle());
        dto.setTermsAcceptedAt(r.getTermsAcceptedAt());
        return dto;
    }
}
