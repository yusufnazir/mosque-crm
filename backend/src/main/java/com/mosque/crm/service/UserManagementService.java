package com.mosque.crm.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.CreateUserRequest;
import com.mosque.crm.dto.UpdateUserRequest;
import com.mosque.crm.dto.UserListDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.PasswordResetTokenRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.UserPreferencesRepository;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanLimitExceededException;
import com.mosque.crm.service.OrganizationSubscriptionService;

@Service
public class UserManagementService {

    private static final Logger log = LoggerFactory.getLogger(UserManagementService.class);

    /** Permission code that controls visibility and management of super admin users/roles. */
    private static final String SUPERADMIN_MANAGE = "superadmin.manage";
    /** The role name for super administrators. */
    private static final String SUPER_ADMIN_ROLE = "SUPER_ADMIN";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthorizationService authorizationService;
    private final UserPreferencesRepository userPreferencesRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final OrganizationSubscriptionService organizationSubscriptionService;
    private final RoleGovernanceService roleGovernanceService;

    public UserManagementService(UserRepository userRepository,
                                  RoleRepository roleRepository,
                                  OrganizationRepository organizationRepository,
                                  PasswordEncoder passwordEncoder,
                                  AuthorizationService authorizationService,
                                  UserPreferencesRepository userPreferencesRepository,
                                  PasswordResetTokenRepository passwordResetTokenRepository,
                                  OrganizationSubscriptionService organizationSubscriptionService,
                                  RoleGovernanceService roleGovernanceService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.authorizationService = authorizationService;
        this.userPreferencesRepository = userPreferencesRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.organizationSubscriptionService = organizationSubscriptionService;
        this.roleGovernanceService = roleGovernanceService;
    }

    /**
     * Returns true if the given user holds the SUPER_ADMIN role.
     */
    private boolean isSuperAdminUser(User user) {
        return user.getRoles().stream()
                .anyMatch(r -> SUPER_ADMIN_ROLE.equals(r.getName()));
    }

    /**
     * Returns true if the given role list contains the SUPER_ADMIN role.
     */
    private boolean containsSuperAdminRole(List<String> roleNames) {
        return roleNames != null && roleNames.contains(SUPER_ADMIN_ROLE);
    }

    /**
     * Returns true if the current requester has the superadmin.manage permission.
     */
    private boolean canManageSuperAdmin() {
        return authorizationService.hasPermission(SUPERADMIN_MANAGE);
    }

    /**
     * Returns the ID of the currently authenticated user.
     */
    private Long getCurrentUserId() {
        User current = authorizationService.getCurrentUser();
        return current != null ? current.getId() : null;
    }

    public List<UserListDTO> getAllUsers() {
        List<User> users = userRepository.findAll();
        boolean canSeeSuperAdmins = canManageSuperAdmin();
        Long currentUserId = getCurrentUserId();
        return users.stream()
                .filter(u -> canSeeSuperAdmins || !isSuperAdminUser(u))
                .map(u -> toUserListDTO(u, currentUserId))
                .collect(Collectors.toList());
    }

    public UserListDTO getUserById(Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return null;
        }
        // Hide super admin users from non-super-admin viewers
        if (isSuperAdminUser(user) && !canManageSuperAdmin()) {
            return null;
        }
        return toUserListDTO(user, getCurrentUserId());
    }

    @Transactional
    public UserListDTO createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + request.getEmail());
        }

        // Plan limit check: enforce max users per organization based on subscription plan.
        // Skipped for super-admin created users (organizationId == null).
        Long targetOrganizationId = request.getOrganizationId();
        if (targetOrganizationId != null) {
            try {
                Integer userLimit = organizationSubscriptionService.getFeatureLimit(targetOrganizationId, FeatureKeys.ADMIN_USERS_MAX);
                if (userLimit != null) {
                    long currentCount = userRepository.countByOrganizationId(targetOrganizationId);
                    if (currentCount >= userLimit) {
                        throw new PlanLimitExceededException(FeatureKeys.ADMIN_USERS_MAX, userLimit, (int) currentCount);
                    }
                }
            } catch (PlanLimitExceededException e) {
                throw e;
            } catch (RuntimeException e) {
                // No active subscription found — allow creation with a warning (grace period for new organizations)
                log.warn("Could not verify user limit for organizationId={}: {}", targetOrganizationId, e.getMessage());
            }
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setAccountEnabled(true);
        user.setAccountLocked(false);
        user.setCredentialsExpired(false);
        user.setOrganizationId(request.getOrganizationId());

        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            // Block SUPER_ADMIN role assignment unless requester has the permission
            if (containsSuperAdminRole(request.getRoles()) && !canManageSuperAdmin()) {
                throw new IllegalArgumentException("Insufficient permissions to assign SUPER_ADMIN role");
            }
            Set<Role> roles = resolveRoles(request.getRoles());
            // Rule C: verify each role is within actor's assignable-role pool
            for (Role role : roles) {
                if (!roleGovernanceService.canAssignRole(role)) {
                    throw new IllegalArgumentException("You are not allowed to assign role: " + role.getName());
                }
            }
            user.setRoles(roles);
        }

        User saved = userRepository.save(user);
        log.info("Created user '{}' (id={})", saved.getUsername(), saved.getId());
        return toUserListDTO(saved, getCurrentUserId());
    }

    @Transactional
    public UserListDTO updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return null;
        }

        // Block editing super admin users unless requester has the permission
        if (isSuperAdminUser(user) && !canManageSuperAdmin()) {
            throw new IllegalArgumentException("Insufficient permissions to modify a super admin user");
        }

        // Rule D: verify actor can modify this user (all target roles ∈ actor's assignable roles)
        if (!roleGovernanceService.canModifyUser(user)) {
            throw new IllegalArgumentException("You do not have permission to modify this user's roles");
        }

        boolean isSelf = id.equals(getCurrentUserId());

        // Self-protection: users cannot disable their own account
        if (isSelf && request.getAccountEnabled() != null && !request.getAccountEnabled()) {
            throw new IllegalArgumentException("You cannot disable your own account");
        }

        if (request.getEmail() != null) {
            // Check email uniqueness (excluding current user)
            if (!request.getEmail().isBlank()) {
                userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new IllegalArgumentException("Email already in use by another user");
                    }
                });
            }
            user.setEmail(request.getEmail());
        }

        if (request.getAccountEnabled() != null) {
            user.setAccountEnabled(request.getAccountEnabled());
        }

        if (request.getAccountLocked() != null) {
            user.setAccountLocked(request.getAccountLocked());
        }

        if (request.getOrganizationId() != null) {
            user.setOrganizationId(request.getOrganizationId());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRoles() != null) {
            // Block SUPER_ADMIN role assignment unless requester has the permission
            if (containsSuperAdminRole(request.getRoles()) && !canManageSuperAdmin()) {
                throw new IllegalArgumentException("Insufficient permissions to assign SUPER_ADMIN role");
            }
            // Self-protection: users cannot remove their own roles
            if (isSelf) {
                Set<String> currentRoleNames = user.getRoles().stream()
                        .map(Role::getName)
                        .collect(Collectors.toSet());
                Set<String> newRoleNames = new HashSet<>(request.getRoles());
                if (!newRoleNames.containsAll(currentRoleNames)) {
                    throw new IllegalArgumentException("You cannot remove roles from your own account");
                }
            }
            Set<Role> newRoles = resolveRoles(request.getRoles());
            // Rule C: verify each newly added role is within actor's assignable-role pool
            Set<Role> currentRoles = user.getRoles();
            for (Role role : newRoles) {
                if (!currentRoles.contains(role) && !roleGovernanceService.canAssignRole(role)) {
                    throw new IllegalArgumentException("You are not allowed to assign role: " + role.getName());
                }
            }
            // Rule E: verify each removed role is within actor's assignable-role pool
            for (Role role : currentRoles) {
                if (!newRoles.contains(role) && !roleGovernanceService.canRemoveRole(role)) {
                    throw new IllegalArgumentException("You are not allowed to remove role: " + role.getName());
                }
            }
            user.getRoles().clear();
            user.getRoles().addAll(newRoles);
            // Evict permission cache for this user since roles changed
            authorizationService.evictCache(id);
        }

        User saved = userRepository.save(user);
        log.info("Updated user '{}' (id={})", saved.getUsername(), saved.getId());
        return toUserListDTO(saved, getCurrentUserId());
    }

    @Transactional
    public boolean deleteUser(Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return false;
        }
        // Self-protection: users cannot delete their own account
        if (id.equals(getCurrentUserId())) {
            throw new IllegalArgumentException("You cannot delete your own account");
        }
        // Block deleting super admin users unless requester has the permission
        if (isSuperAdminUser(user) && !canManageSuperAdmin()) {
            throw new IllegalArgumentException("Insufficient permissions to delete a super admin user");
        }
        // Rule D: verify actor can modify this user (all target roles ∈ actor's assignable roles)
        if (!roleGovernanceService.canModifyUser(user)) {
            throw new IllegalArgumentException("You do not have permission to delete this user");
        }
        // Clean up related records that have FK constraints to users table
        userPreferencesRepository.deleteByUserId(id);
        passwordResetTokenRepository.deleteByUserId(id);
        userRepository.delete(user);
        authorizationService.evictCache(id);
        log.info("Deleted user '{}' (id={})", user.getUsername(), id);
        return true;
    }

    @Transactional
    public UserListDTO toggleEnabled(Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return null;
        }
        // Self-protection: users cannot disable their own account
        if (id.equals(getCurrentUserId())) {
            throw new IllegalArgumentException("You cannot enable/disable your own account");
        }
        // Block toggling super admin users unless requester has the permission
        if (isSuperAdminUser(user) && !canManageSuperAdmin()) {
            throw new IllegalArgumentException("Insufficient permissions to modify a super admin user");
        }
        // Rule D: verify actor can modify this user
        if (!roleGovernanceService.canModifyUser(user)) {
            throw new IllegalArgumentException("You do not have permission to modify this user");
        }
        user.setAccountEnabled(!user.isAccountEnabled());
        User saved = userRepository.save(user);
        log.info("Toggled enabled for user '{}' (id={}) → {}", saved.getUsername(), id, saved.isAccountEnabled());
        return toUserListDTO(saved, getCurrentUserId());
    }

    private Set<Role> resolveRoles(List<String> roleNames) {
        Long currentOrganizationId = getCurrentOrganizationId();
        boolean canManageSuperAdmin = canManageSuperAdmin();

        Set<Role> roles = new HashSet<>();
        for (String name : roleNames) {
            Role role = null;

            if (currentOrganizationId != null) {
                role = roleRepository.findByNameAndOrganizationId(name, currentOrganizationId).orElse(null);
            }

            if (role == null) {
                role = roleRepository.findByNameAndOrganizationIdIsNull(name).orElse(null);
            }

            if (role == null) {
                continue;
            }

            // Tenant admins cannot assign global roles (organization_id NULL).
            if (role.getOrganizationId() == null && !canManageSuperAdmin) {
                continue;
            }

            roles.add(role);
        }
        return roles;
    }

    private Long getCurrentOrganizationId() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId != null) {
            return organizationId;
        }
        User current = authorizationService.getCurrentUser();
        return current != null ? current.getOrganizationId() : null;
    }

    private UserListDTO toUserListDTO(User user, Long currentUserId) {
        UserListDTO dto = new UserListDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setAccountEnabled(user.isAccountEnabled());
        dto.setAccountLocked(user.isAccountLocked());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setLastLogin(user.getLastLogin());
        dto.setOrganizationId(user.getOrganizationId());
        dto.setCurrentUser(user.getId().equals(currentUserId));

        // Resolve organization name
        if (user.getOrganizationId() != null) {
            organizationRepository.findById(user.getOrganizationId())
                    .ifPresent(organization -> dto.setOrganizationName(organization.getName()));
        }

        // Map roles
        dto.setRoles(user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList()));

        // Map linked person
        Person person = user.getPerson();
        if (person != null) {
            dto.setPersonId(person.getId());
            String fullName = person.getFirstName();
            if (person.getLastName() != null) {
                fullName += " " + person.getLastName();
            }
            dto.setPersonName(fullName);
        }

        return dto;
    }
}
