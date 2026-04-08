package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.Collections;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.RegistrationRequest;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.enums.PlanBillingCycle;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.UserRepository;

@Service
public class RegistrationService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationService.class);

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleTemplateService roleTemplateService;
    private final OrganizationSubscriptionService organizationSubscriptionService;

    public RegistrationService(UserRepository userRepository,
                               OrganizationRepository organizationRepository,
                               RoleRepository roleRepository,
                               PasswordEncoder passwordEncoder,
                               RoleTemplateService roleTemplateService,
                               OrganizationSubscriptionService organizationSubscriptionService) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.roleTemplateService = roleTemplateService;
        this.organizationSubscriptionService = organizationSubscriptionService;
    }

    @Transactional
    public User register(RegistrationRequest request) {
        validateRequest(request);

        // 1. Resolve handle (user-provided or auto-generated)
        String handle = resolveHandle(request);

        // 2. Create the organization (organization)
        Organization organization = new Organization();
        organization.setName(request.getOrganizationName().trim());
        organization.setHandle(handle);
        organization.setActive(true);
        Organization savedOrganization = organizationRepository.save(organization);
        log.info("Created organization '{}' with id={} handle='{}'",
                savedOrganization.getName(), savedOrganization.getId(), savedOrganization.getHandle());

        // 2. Provision default roles from templates (ADMIN, MEMBER, TREASURER, IMAM)
        roleTemplateService.provisionDefaultRolesForOrganization(savedOrganization.getId());
        log.info("Provisioned default roles for organizationId={}", savedOrganization.getId());

        // 3. Find the ADMIN role for this organization
        Role adminRole = roleRepository.findByNameAndOrganizationId("ADMIN", savedOrganization.getId())
                .orElseThrow(() -> new RuntimeException("ADMIN role not found after provisioning"));

        // 4. Create the admin user
        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail() != null ? request.getEmail().trim() : null);
        user.setOrganizationId(savedOrganization.getId());
        user.setAccountEnabled(true);
        user.setRoles(Collections.singleton(adminRole));
        User savedUser = userRepository.save(user);
        log.info("Created admin user '{}' with id={} for organizationId={}",
                savedUser.getUsername(), savedUser.getId(), savedOrganization.getId());

        // 5. Assign the FREE plan
        organizationSubscriptionService.createSubscription(
                savedOrganization.getId(),
                "FREE",
                PlanBillingCycle.MONTHLY,
                LocalDateTime.now(),
                null,
                true,
                false
        );
        log.info("Assigned FREE plan to organizationId={}", savedOrganization.getId());

        return savedUser;
    }

    private void validateRequest(RegistrationRequest request) {
        if (request.getOrganizationName() == null || request.getOrganizationName().trim().isEmpty()) {
            throw new IllegalArgumentException("Organization name is required");
        }
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }
        if (organizationRepository.existsByName(request.getOrganizationName().trim())) {
            throw new IllegalArgumentException("Organization name already exists");
        }
        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()
                && userRepository.existsByEmail(request.getEmail().trim())) {
            throw new IllegalArgumentException("Email already in use");
        }
        // Validate user-provided handle if present
        if (request.getHandle() != null && !request.getHandle().trim().isEmpty()) {
            String handle = request.getHandle().trim().toLowerCase();
            if (!handle.matches("[a-z0-9\\-]+")) {
                throw new IllegalArgumentException("Handle may only contain lowercase letters, numbers, and hyphens");
            }
            if (organizationRepository.existsByHandle(handle)) {
                throw new IllegalArgumentException("Organization handle already exists");
            }
        }
    }

    /**
     * Returns a valid, unique handle. Uses the user-provided value if present,
     * otherwise auto-generates one from the organization name.
     * If the generated slug is taken, appends a numeric suffix until unique.
     */
    private String resolveHandle(RegistrationRequest request) {
        if (request.getHandle() != null && !request.getHandle().trim().isEmpty()) {
            return request.getHandle().trim().toLowerCase();
        }
        String base = generateSlug(request.getOrganizationName());
        if (!organizationRepository.existsByHandle(base)) {
            return base;
        }
        // Append incrementing suffix until unique
        int suffix = 2;
        while (organizationRepository.existsByHandle(base + "-" + suffix)) {
            suffix++;
        }
        return base + "-" + suffix;
    }

    /**
     * Converts a display name to a URL-safe slug:
     * "Al-Noor Organization" → "al-noor-organization"
     */
    private String generateSlug(String name) {
        return name.trim()
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s\\-]", "")   // remove special chars
                .replaceAll("[\\s]+", "-")             // spaces → hyphens
                .replaceAll("-{2,}", "-")              // collapse multiple hyphens
                .replaceAll("^-|-$", "");              // strip leading/trailing hyphens
    }
}
