package com.mosque.crm.controller;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.PermissionDTO;
import com.mosque.crm.dto.RoleCreateRequest;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanFeatureRequired;
import com.mosque.crm.dto.RoleDTO;
import com.mosque.crm.dto.RolePermissionUpdateRequest;
import com.mosque.crm.entity.Permission;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.PermissionRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.RoleGovernanceService;
import com.mosque.crm.service.RoleTemplateService;

import jakarta.validation.Valid;

/**
 * Admin endpoints for managing roles and their permission assignments.
 * Read endpoints require "role.view", write endpoints require "role.manage".
 * Pool/assignable-permission endpoints require "privilege.view" / "privilege.manage".
 * The GET /admin/roles list is also accessible with "user.manage" (needed by member-edit role picker).
 */
@RestController
@RequestMapping("/admin/roles")
public class RoleManagementController {

    private static final Logger log = LoggerFactory.getLogger(RoleManagementController.class);

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AuthorizationService authorizationService;
    private final RoleTemplateService roleTemplateService;
    private final RoleGovernanceService roleGovernanceService;

    public RoleManagementController(RoleRepository roleRepository,
                                    PermissionRepository permissionRepository,
                                    AuthorizationService authorizationService,
                                    RoleTemplateService roleTemplateService,
                                    RoleGovernanceService roleGovernanceService) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.authorizationService = authorizationService;
        this.roleTemplateService = roleTemplateService;
        this.roleGovernanceService = roleGovernanceService;
    }

    /**
     * List all roles with their assigned permission codes.
     * Accessible with either "user.manage" (for member-edit role picker) or "privilege.view".
     * The SUPER_ADMIN role is only visible to users with the superadmin.manage permission.
     */
    @GetMapping
    @PreAuthorize("@auth.hasAnyPermission('user.manage', 'role.view', 'privilege.view')")
    public ResponseEntity<List<RoleDTO>> getAllRoles() {
        List<Role> roles = getReadableRoles();
        boolean canManageSuperAdmin = authorizationService.hasPermission("superadmin.manage");
        List<RoleDTO> dtos = roles.stream()
                .filter(r -> canManageSuperAdmin || !"SUPER_ADMIN".equals(r.getName()))
                .map(this::toRoleDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * List only the roles that the current user is allowed to assign.
     * Used by role-picker dropdowns in member-edit and user management UIs.
     */
    @GetMapping("/assignable")
    @PreAuthorize("@auth.hasAnyPermission('user.manage', 'role.manage')")
    public ResponseEntity<List<RoleDTO>> getAssignableRoles() {
        boolean isSuperAdmin = authorizationService.hasPermission("superadmin.manage");
        List<Role> roles;
        if (isSuperAdmin) {
            // Super admin can assign all tenant-scoped roles in the selected organization
            Long organizationId = getCurrentOrganizationId();
            roles = organizationId != null
                    ? roleRepository.findByOrganizationId(organizationId)
                    : roleRepository.findAll();
        } else {
            Set<Role> assignable = roleGovernanceService.getAssignableRolesForCurrentUser();
            roles = List.copyOf(assignable);
        }
        List<RoleDTO> dtos = roles.stream()
                .filter(r -> !"SUPER_ADMIN".equals(r.getName()))
                .map(this::toRoleDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get a single role with its assigned permission codes.
     */
    @GetMapping("/{id}")
    @PreAuthorize("@auth.hasAnyPermission('user.manage', 'role.view', 'privilege.view')")
    public ResponseEntity<RoleDTO> getRoleById(@PathVariable Long id) {
        Role role = roleRepository.findById(id).orElse(null);
        if (role == null) {
            return ResponseEntity.notFound().build();
        }
        if (!canReadRole(role)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(toRoleDTO(role));
    }

    /**
     * List all available permissions (so the UI can show checkboxes).
     * Only the "superadmin" category is hidden from non-super-admins.
     */
    @GetMapping("/permissions")
    @PlanFeatureRequired(FeatureKeys.ROLES_PERMISSIONS)
    @PreAuthorize("@auth.hasAnyPermission('user.manage', 'role.view', 'privilege.view')")
    public ResponseEntity<List<PermissionDTO>> getAllPermissions() {
        List<Permission> permissions = permissionRepository.findAll();
        boolean canManageSuperAdmin = authorizationService.hasPermission("superadmin.manage");
        List<PermissionDTO> dtos = permissions.stream()
                .filter(p -> canManageSuperAdmin || !"superadmin".equals(p.getCategory()))
                .map(this::toPermissionDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Update the permissions assigned to a role.
     * Replaces the entire permission set with the codes provided in the request body.
     * Only permissions that are in the role's assignable pool are allowed.
     */
    @PutMapping("/{id}/permissions")
    @PlanFeatureRequired(FeatureKeys.ROLES_PERMISSIONS)
    @PreAuthorize("@auth.hasAnyPermission('role.manage', 'privilege.manage')")
    public ResponseEntity<RoleDTO> updateRolePermissions(
            @PathVariable Long id,
            @Valid @RequestBody RolePermissionUpdateRequest request) {

        Role role = roleRepository.findById(id).orElse(null);
        if (role == null) {
            return ResponseEntity.notFound().build();
        }

        boolean canMutate = canMutateRole(role);
        if (!canMutate) {
            return ResponseEntity.status(403).build();
        }

        boolean canManageSuperAdmin = authorizationService.hasPermission("superadmin.manage");

        // Block editing the SUPER_ADMIN role unless requester has the permission
        if ("SUPER_ADMIN".equals(role.getName()) && !canManageSuperAdmin) {
            return ResponseEntity.status(403).build();
        }

        // Get the assignable pool for this role
        Set<String> assignableCodes = role.getAssignablePermissions().stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet());

        // Resolve all requested permission entities — only allow those in the assignable pool
        Set<Permission> newPermissions = new HashSet<>();
        for (String code : request.getPermissionCodes()) {
            // Block assigning superadmin-category permissions unless requester has the permission
            if (!canManageSuperAdmin && code.startsWith("superadmin.")) {
                continue;
            }
            // Only allow permissions that are in the assignable pool
            if (!assignableCodes.contains(code)) {
                continue;
            }
            permissionRepository.findByCode(code).ifPresent(newPermissions::add);
        }

        role.getPermissions().clear();
        role.getPermissions().addAll(newPermissions);
        roleRepository.save(role);

        if (shouldSyncTemplateRole(role)) {
            roleTemplateService.syncTemplateRoleToAllTenants(role.getName());
        }

        // Evict all caches since the role-permission mapping changed and may affect many users
        authorizationService.evictAllCaches();

        log.info("Updated permissions for role '{}' (id={}): {}", role.getName(), id,
                request.getPermissionCodes());

        return ResponseEntity.ok(toRoleDTO(role));
    }

    /**
     * Update the assignable permissions pool for a role.
     * Managed from the Privileges view.
     * When a permission is removed from the pool, it is also removed from the granted set.
     */
    @PutMapping("/{id}/assignable-permissions")
    @PlanFeatureRequired(FeatureKeys.ROLES_PERMISSIONS)
    @PreAuthorize("@auth.hasPermission('privilege.manage')")
    public ResponseEntity<RoleDTO> updateRoleAssignablePermissions(
            @PathVariable Long id,
            @Valid @RequestBody RolePermissionUpdateRequest request) {

        Role role = roleRepository.findById(id).orElse(null);
        if (role == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canMutateRole(role)) {
            return ResponseEntity.status(403).build();
        }

        boolean canManageSuperAdmin = authorizationService.hasPermission("superadmin.manage");

        if ("SUPER_ADMIN".equals(role.getName()) && !canManageSuperAdmin) {
            return ResponseEntity.status(403).build();
        }

        // Rule F: verify actor can modify this role's pool and that changes ⊆ actor's assignable permissions
        if (!roleGovernanceService.canModifyRolePool(role, new HashSet<>(request.getPermissionCodes()))) {
            return ResponseEntity.status(403).build();
        }

        // Resolve new assignable permissions
        Set<Permission> newAssignable = new HashSet<>();
        for (String code : request.getPermissionCodes()) {
            if (!canManageSuperAdmin && code.startsWith("superadmin.")) {
                continue;
            }
            permissionRepository.findByCode(code).ifPresent(newAssignable::add);
        }

        Set<String> newAssignableCodes = newAssignable.stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet());

        // Remove granted permissions that are no longer in the assignable pool
        Set<Permission> currentGranted = role.getPermissions();
        Set<Permission> prunedGranted = currentGranted.stream()
                .filter(p -> newAssignableCodes.contains(p.getCode()))
                .collect(Collectors.toSet());

        role.getAssignablePermissions().clear();
        role.getAssignablePermissions().addAll(newAssignable);
        role.getPermissions().clear();
        role.getPermissions().addAll(prunedGranted);
        roleRepository.save(role);

        if (shouldSyncTemplateRole(role)) {
            roleTemplateService.syncTemplateRoleToAllTenants(role.getName());
        }

        authorizationService.evictAllCaches();

        log.info("Updated assignable permissions for role '{}' (id={}): pool={}, granted pruned from {} to {}",
                role.getName(), id, request.getPermissionCodes().size(),
                currentGranted.size(), prunedGranted.size());

        return ResponseEntity.ok(toRoleDTO(role));
    }

    // ─── Global permission pool endpoints ───────────────────────────────

    /**
     * Get the global permission pool.
     * Returns the set of permission codes that are available for assignment to any role.
     * The pool is derived from the union of all non-SUPER_ADMIN roles' assignable permissions.
     */
    @GetMapping("/pool")
    @PlanFeatureRequired(FeatureKeys.ROLES_PERMISSIONS)
    @PreAuthorize("@auth.hasPermission('privilege.view')")
    public ResponseEntity<List<String>> getPermissionPool() {
        List<Role> roles = getManageableRolesForPool();
        Set<String> pool = new HashSet<>();
        for (Role role : roles) {
            if ("SUPER_ADMIN".equals(role.getName())) {
                continue;
            }
            for (Permission p : role.getAssignablePermissions()) {
                pool.add(p.getCode());
            }
        }
        List<String> sorted = pool.stream().sorted().collect(Collectors.toList());
        return ResponseEntity.ok(sorted);
    }

    /**
     * Update the global permission pool.
     * Sets the same assignable permissions for ALL non-SUPER_ADMIN roles.
     * When a permission is removed from the pool, it is also removed from each role's granted permissions.
     */
    @PutMapping("/pool")
    @PlanFeatureRequired(FeatureKeys.ROLES_PERMISSIONS)
    @PreAuthorize("@auth.hasPermission('privilege.manage')")
    public ResponseEntity<List<String>> updatePermissionPool(
            @Valid @RequestBody RolePermissionUpdateRequest request) {

        boolean canManageSuperAdmin = authorizationService.hasPermission("superadmin.manage");

        // Resolve new pool permissions
        Set<Permission> newPool = new HashSet<>();
        for (String code : request.getPermissionCodes()) {
            if (!canManageSuperAdmin && code.startsWith("superadmin.")) {
                continue;
            }
            permissionRepository.findByCode(code).ifPresent(newPool::add);
        }

        Set<String> newPoolCodes = newPool.stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet());

        final List<Role> poolTargets;
        if (canManageSuperAdmin) {
            // Tenant ADMIN/MEMBER copies follow role_templates; update templates first, then sync.
            roleTemplateService.applyGlobalAssignablePoolToAdminMemberTemplates(newPool, newPoolCodes);

            // Keep legacy null-organization_id Role rows aligned for any code paths that still read them.
            List<Role> globalRoles = roleRepository.findByNameInAndOrganizationIdIsNull(List.of("ADMIN", "MEMBER"));
            for (Role role : globalRoles) {
                if ("SUPER_ADMIN".equals(role.getName())) {
                    continue;
                }
                role.getAssignablePermissions().clear();
                role.getAssignablePermissions().addAll(new HashSet<>(newPool));
                Set<Permission> prunedGranted = role.getPermissions().stream()
                        .filter(p -> newPoolCodes.contains(p.getCode()))
                        .collect(Collectors.toSet());
                role.getPermissions().clear();
                role.getPermissions().addAll(prunedGranted);
            }
            roleRepository.saveAll(globalRoles);
            poolTargets = globalRoles;
        } else {
            List<Role> roles = getManageableRolesForPool();
            for (Role role : roles) {
                if ("SUPER_ADMIN".equals(role.getName())) {
                    continue;
                }
                role.getAssignablePermissions().clear();
                role.getAssignablePermissions().addAll(new HashSet<>(newPool));
                Set<Permission> prunedGranted = role.getPermissions().stream()
                        .filter(p -> newPoolCodes.contains(p.getCode()))
                        .collect(Collectors.toSet());
                role.getPermissions().clear();
                role.getPermissions().addAll(prunedGranted);
            }
            roleRepository.saveAll(roles);
            poolTargets = roles;
        }

        authorizationService.evictAllCaches();

        log.info("Updated global permission pool: {} permissions for {} roles",
                newPool.size(),
                poolTargets.stream().filter(r -> !"SUPER_ADMIN".equals(r.getName())).count());

        List<String> sorted = newPoolCodes.stream().sorted().collect(Collectors.toList());
        return ResponseEntity.ok(sorted);
    }

    // ─── Role CRUD endpoints ────────────────────────────────────────────

    /**
     * Create a new role.
     * The new role is automatically assigned the current global permission pool as its assignable permissions.
     * Its granted permissions start empty.
     */
    @PostMapping
    @PlanFeatureRequired(FeatureKeys.ROLES_PERMISSIONS)
    @PreAuthorize("@auth.hasPermission('role.manage')")
    public ResponseEntity<?> createRole(@Valid @RequestBody RoleCreateRequest request) {
        String name = request.getName().trim().toUpperCase().replace(' ', '_');

        Long scopedOrganizationId = getCurrentOrganizationId();

        if (scopedOrganizationId == null
            ? roleRepository.existsByNameAndOrganizationIdIsNull(name)
            : roleRepository.existsByNameAndOrganizationId(name, scopedOrganizationId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "A role with name '" + name + "' already exists"));
        }

        // Get current scoped pool (union of manageable non-SUPER_ADMIN roles' assignable permissions)
        Set<Permission> pool = new HashSet<>();
        List<Role> existingRoles = getManageableRolesForPool();
        for (Role existing : existingRoles) {
            if (!"SUPER_ADMIN".equals(existing.getName())) {
                pool.addAll(existing.getAssignablePermissions());
            }
        }

        Role role = new Role();
        role.setName(name);
        role.setDescription(request.getDescription());
        role.setOrganizationId(scopedOrganizationId);
        role.setAssignablePermissions(pool);
        role.setPermissions(new HashSet<>());

        Role saved = roleRepository.save(role);

        log.info("Created new role '{}' (id={}) with {} pool permissions",
                saved.getName(), saved.getId(), pool.size());

        return ResponseEntity.ok(toRoleDTO(saved));
    }

    /**
     * Update a role's name and/or description.
     */
    @PutMapping("/{id}")
    @PlanFeatureRequired(FeatureKeys.ROLES_PERMISSIONS)
    @PreAuthorize("@auth.hasPermission('role.manage')")
    public ResponseEntity<?> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody RoleCreateRequest request) {

        Role role = roleRepository.findById(id).orElse(null);
        if (role == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canMutateRole(role)) {
            return ResponseEntity.status(403).build();
        }

        // Don't allow renaming SUPER_ADMIN unless superadmin.manage
        boolean canManageSuperAdmin = authorizationService.hasPermission("superadmin.manage");
        if ("SUPER_ADMIN".equals(role.getName()) && !canManageSuperAdmin) {
            return ResponseEntity.status(403).build();
        }

        String newName = request.getName().trim().toUpperCase().replace(' ', '_');

        if (roleTemplateService.isDefaultTemplateRole(role) && !role.getName().equals(newName)) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Default template roles ADMIN and MEMBER cannot be renamed"));
        }

        // Check uniqueness if name changed
        if (!role.getName().equals(newName)) {
            boolean exists = role.getOrganizationId() == null
                ? roleRepository.existsByNameAndOrganizationIdIsNull(newName)
                : roleRepository.existsByNameAndOrganizationId(newName, role.getOrganizationId());
            if (exists) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "A role with name '" + newName + "' already exists"));
            }
        }

        role.setName(newName);
        role.setDescription(request.getDescription());
        roleRepository.save(role);

        if (shouldSyncTemplateRole(role)) {
            roleTemplateService.syncTemplateRoleToAllTenants(role.getName());
        }

        authorizationService.evictAllCaches();

        log.info("Updated role '{}' (id={})", role.getName(), id);

        return ResponseEntity.ok(toRoleDTO(role));
    }

    /**
     * Delete a role. Only allowed if no users are assigned to it.
     * SUPER_ADMIN role cannot be deleted.
     */
    @DeleteMapping("/{id}")
    @PlanFeatureRequired(FeatureKeys.ROLES_PERMISSIONS)
    @PreAuthorize("@auth.hasPermission('role.manage')")
    public ResponseEntity<?> deleteRole(@PathVariable Long id) {
        Role role = roleRepository.findById(id).orElse(null);
        if (role == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canMutateRole(role)) {
            return ResponseEntity.status(403).build();
        }

        if ("SUPER_ADMIN".equals(role.getName())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "The SUPER_ADMIN role cannot be deleted"));
        }

        if (roleTemplateService.isDefaultTemplateRole(role)
                && !authorizationService.hasPermission("superadmin.manage")) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Template role '" + role.getName() + "' cannot be deleted"));
        }

        if (role.getUsers() != null && !role.getUsers().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Cannot delete role '" + role.getName()
                            + "' because it is assigned to " + role.getUsers().size() + " user(s)"));
        }

        // Clear assignable-role references: this role's own outgoing set,
        // plus any other role that lists this role as assignable.
        role.getAssignableRoles().clear();
        for (Role other : roleRepository.findAll()) {
            if (other.getAssignableRoles().remove(role)) {
                roleRepository.save(other);
            }
        }

        roleRepository.delete(role);
        authorizationService.evictAllCaches();

        log.info("Deleted role '{}' (id={})", role.getName(), id);

        return ResponseEntity.ok(Map.of("message", "Role deleted successfully"));
    }

    // ─── Mapping helpers ───────────────────────────────────────────────

    private RoleDTO toRoleDTO(Role role) {
        List<String> permCodes = role.getPermissions().stream()
                .map(Permission::getCode)
                .sorted()
                .collect(Collectors.toList());
        List<String> assignableCodes = role.getAssignablePermissions().stream()
                .map(Permission::getCode)
                .sorted()
                .collect(Collectors.toList());
        List<String> assignableRoleNames = role.getAssignableRoles().stream()
                .map(Role::getName)
                .sorted()
                .collect(Collectors.toList());
        boolean isTemplate = roleTemplateService.isTemplateRole(role);
        return new RoleDTO(role.getId(), role.getName(), role.getDescription(),
                permCodes, assignableCodes, assignableRoleNames, isTemplate);
    }

    private PermissionDTO toPermissionDTO(Permission p) {
        return new PermissionDTO(p.getId(), p.getCode(), p.getDescription(), p.getCategory());
    }

    private List<Role> getReadableRoles() {
        Long organizationId = getCurrentOrganizationId();
        if (authorizationService.hasPermission("superadmin.manage")) {
            // Super admin sees tenant-scoped roles for the selected org + the global SUPER_ADMIN role.
            // Legacy null-organization_id rows (ADMIN/MEMBER/TREASURER/IMAM) are templates managed
            // via /admin/role-templates and are excluded from this view.
            if (organizationId != null) {
                List<Role> orgRoles = roleRepository.findByOrganizationId(organizationId);
                roleRepository.findByNameAndOrganizationIdIsNull("SUPER_ADMIN")
                        .ifPresent(orgRoles::add);
                return orgRoles;
            }
            return roleRepository.findAll().stream()
                    .filter(r -> r.getOrganizationId() != null || "SUPER_ADMIN".equals(r.getName()))
                    .collect(java.util.stream.Collectors.toList());
        }

        return roleRepository.findByOrganizationId(organizationId);
    }

    private List<Role> getManageableRolesForPool() {
        Long organizationId = getCurrentOrganizationId();
        if (authorizationService.hasPermission("superadmin.manage")) {
            if (organizationId != null) {
                return roleRepository.findByOrganizationId(organizationId);
            }
            return roleRepository.findAll();
        }
        return roleRepository.findByOrganizationId(organizationId);
    }

    private boolean canReadRole(Role role) {
        if (authorizationService.hasPermission("superadmin.manage")) {
            return true;
        }
        Long currentOrganizationId = getCurrentOrganizationId();
        return role.getOrganizationId() == null || role.getOrganizationId().equals(currentOrganizationId);
    }

    private boolean canMutateRole(Role role) {
        if (authorizationService.hasPermission("superadmin.manage")) {
            return true;
        }
        Long currentOrganizationId = getCurrentOrganizationId();
        return role.getOrganizationId() != null && role.getOrganizationId().equals(currentOrganizationId);
    }

    private Long getCurrentOrganizationId() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId != null) {
            return organizationId;
        }
        User currentUser = authorizationService.getCurrentUser();
        return currentUser != null ? currentUser.getOrganizationId() : null;
    }

    private boolean shouldSyncTemplateRole(Role role) {
        return authorizationService.hasPermission("superadmin.manage")
                && roleTemplateService.isDefaultTemplateRole(role);
    }
}
