package com.mosque.crm.service;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.mosque.crm.entity.Permission;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserRole;
import com.mosque.crm.repository.PermissionRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.UserRoleRepository;

/**
 * Enforces the governance rules defined in MULTI-TENANT-SECURITY.md:
 * <ul>
 *     <li>Rule C: Role assignment — actor may only assign roles in their assignable-role pool
 *                  whose permissions are a subset of actor's assignable-permission pool.</li>
 *     <li>Rule D: User modification — actor may only modify users whose every role
 *                  is in actor's assignable-role pool.</li>
 *     <li>Rule E: Role removal — actor may only remove roles in their assignable-role pool.</li>
 *     <li>Rule F: Pool management — changes to assignable pools must be within actor's own pools.</li>
 * </ul>
 * Super-admin users (with {@code superadmin.manage} permission) bypass all governance checks.
 */
@Service
public class RoleGovernanceService {

    private static final Logger log = LoggerFactory.getLogger(RoleGovernanceService.class);

    private final AuthorizationService authorizationService;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public RoleGovernanceService(AuthorizationService authorizationService,
                                 UserRoleRepository userRoleRepository,
                                 RoleRepository roleRepository,
                                 PermissionRepository permissionRepository) {
        this.authorizationService = authorizationService;
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
    }

    // ─── Rule C: Role assignment ────────────────────────────────────────

    /**
     * Check if the current user can assign the given role to another user.
     * <p>Rule C: R ∈ actor.assignable_roles AND permissions(R) ⊆ actor.assignable_permissions</p>
     */
    public boolean canAssignRole(Role targetRole) {
        if (isSuperAdmin()) {
            return true;
        }

        Set<Long> actorRoleIds = getActiveRoleIds(authorizationService.getCurrentUser());
        if (actorRoleIds.isEmpty()) {
            return false;
        }

        Set<Role> assignableRoles = roleRepository.findAssignableRolesByRoleIds(actorRoleIds);
        if (!assignableRoles.contains(targetRole)) {
            log.debug("canAssignRole denied: role '{}' not in actor's assignable roles", targetRole.getName());
            return false;
        }

        // Also check: permissions(targetRole) ⊆ actor.assignablePermissions
        Set<String> actorAssignablePerms = permissionRepository.findAssignablePermissionCodesByRoleIds(actorRoleIds);
        Set<String> targetPermCodes = targetRole.getPermissions().stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet());

        if (!actorAssignablePerms.containsAll(targetPermCodes)) {
            log.debug("canAssignRole denied: role '{}' has permissions outside actor's assignable pool", targetRole.getName());
            return false;
        }

        return true;
    }

    // ─── Rule D: User modification ──────────────────────────────────────

    /**
     * Check if the current user can modify the given target user.
     * <p>Rule D: ALL roles of target user ∈ actor.assignable_roles</p>
     */
    public boolean canModifyUser(User targetUser) {
        if (isSuperAdmin()) {
            return true;
        }

        Set<Long> actorRoleIds = getActiveRoleIds(authorizationService.getCurrentUser());
        if (actorRoleIds.isEmpty()) {
            return false;
        }

        Set<Role> assignableRoles = roleRepository.findAssignableRolesByRoleIds(actorRoleIds);
        Set<Role> targetRoles = targetUser.getRoles();

        for (Role role : targetRoles) {
            if (!assignableRoles.contains(role)) {
                log.debug("canModifyUser denied: target user '{}' has role '{}' outside actor's assignable roles",
                        targetUser.getUsername(), role.getName());
                return false;
            }
        }

        return true;
    }

    // ─── Rule E: Role removal ───────────────────────────────────────────

    /**
     * Check if the current user can remove the given role from a user.
     * <p>Rule E: role ∈ actor.assignable_roles</p>
     */
    public boolean canRemoveRole(Role role) {
        if (isSuperAdmin()) {
            return true;
        }

        Set<Long> actorRoleIds = getActiveRoleIds(authorizationService.getCurrentUser());
        if (actorRoleIds.isEmpty()) {
            return false;
        }

        Set<Role> assignableRoles = roleRepository.findAssignableRolesByRoleIds(actorRoleIds);
        return assignableRoles.contains(role);
    }

    // ─── Rule F: Pool management anti-escalation ────────────────────────

    /**
     * Check if the current user can modify the assignable permission pool of the given role.
     * <p>Rule F: role ∈ actor.assignable_roles AND changes ⊆ actor.assignable_permissions</p>
     */
    public boolean canModifyRolePool(Role targetRole, Set<String> newPermissionCodes) {
        if (isSuperAdmin()) {
            return true;
        }

        Set<Long> actorRoleIds = getActiveRoleIds(authorizationService.getCurrentUser());
        if (actorRoleIds.isEmpty()) {
            return false;
        }

        // Role must be in actor's assignable roles
        Set<Role> assignableRoles = roleRepository.findAssignableRolesByRoleIds(actorRoleIds);
        if (!assignableRoles.contains(targetRole)) {
            return false;
        }

        // New permissions must be a subset of actor's assignable permissions
        Set<String> actorAssignablePerms = permissionRepository.findAssignablePermissionCodesByRoleIds(actorRoleIds);
        return actorAssignablePerms.containsAll(newPermissionCodes);
    }

    // ─── Utility: get assignable roles for current user ─────────────────

    /**
     * Return all roles the current user is allowed to assign.
     * Used by UI to filter role dropdowns.
     */
    public Set<Role> getAssignableRolesForCurrentUser() {
        if (isSuperAdmin()) {
            // Super admin can assign all tenant-scoped roles;
            // we don't filter further here — the caller should scope by mosque.
            return Collections.emptySet(); // caller handles super-admin specially
        }

        User actor = authorizationService.getCurrentUser();
        if (actor == null) {
            return Collections.emptySet();
        }

        Set<Long> actorRoleIds = getActiveRoleIds(actor);
        if (actorRoleIds.isEmpty()) {
            return Collections.emptySet();
        }

        return roleRepository.findAssignableRolesByRoleIds(actorRoleIds);
    }

    // ─── internal ───────────────────────────────────────────────────────

    private boolean isSuperAdmin() {
        return authorizationService.hasPermission("superadmin.manage");
    }

    private Set<Long> getActiveRoleIds(User user) {
        if (user == null) {
            return Collections.emptySet();
        }
        return userRoleRepository.findByIdUserId(user.getId()).stream()
                .filter(UserRole::isActive)
                .map(UserRole::getRoleId)
                .collect(Collectors.toSet());
    }
}
