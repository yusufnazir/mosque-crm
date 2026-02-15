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
import com.mosque.crm.entity.Mosque;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.MosqueRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.UserRepository;

@Service
public class UserManagementService {

    private static final Logger log = LoggerFactory.getLogger(UserManagementService.class);

    /** Permission code that controls visibility and management of super admin users/roles. */
    private static final String SUPERADMIN_MANAGE = "superadmin.manage";
    /** The role name for super administrators. */
    private static final String SUPER_ADMIN_ROLE = "SUPER_ADMIN";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final MosqueRepository mosqueRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthorizationService authorizationService;

    public UserManagementService(UserRepository userRepository,
                                  RoleRepository roleRepository,
                                  MosqueRepository mosqueRepository,
                                  PasswordEncoder passwordEncoder,
                                  AuthorizationService authorizationService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.mosqueRepository = mosqueRepository;
        this.passwordEncoder = passwordEncoder;
        this.authorizationService = authorizationService;
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

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setAccountEnabled(true);
        user.setAccountLocked(false);
        user.setCredentialsExpired(false);
        user.setMosqueId(request.getMosqueId());

        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            // Block SUPER_ADMIN role assignment unless requester has the permission
            if (containsSuperAdminRole(request.getRoles()) && !canManageSuperAdmin()) {
                throw new IllegalArgumentException("Insufficient permissions to assign SUPER_ADMIN role");
            }
            Set<Role> roles = resolveRoles(request.getRoles());
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

        if (request.getMosqueId() != null) {
            user.setMosqueId(request.getMosqueId());
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
            Set<Role> roles = resolveRoles(request.getRoles());
            user.setRoles(roles);
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
        user.setAccountEnabled(!user.isAccountEnabled());
        User saved = userRepository.save(user);
        log.info("Toggled enabled for user '{}' (id={}) → {}", saved.getUsername(), id, saved.isAccountEnabled());
        return toUserListDTO(saved, getCurrentUserId());
    }

    private Set<Role> resolveRoles(List<String> roleNames) {
        Set<Role> roles = new HashSet<>();
        for (String name : roleNames) {
            roleRepository.findByName(name).ifPresent(roles::add);
        }
        return roles;
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
        dto.setMosqueId(user.getMosqueId());
        dto.setCurrentUser(user.getId().equals(currentUserId));

        // Resolve mosque name
        if (user.getMosqueId() != null) {
            mosqueRepository.findById(user.getMosqueId())
                    .ifPresent(mosque -> dto.setMosqueName(mosque.getName()));
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
