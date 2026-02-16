package com.mosque.crm.controller;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.PermissionDTO;
import com.mosque.crm.dto.RoleDTO;
import com.mosque.crm.dto.RolePermissionUpdateRequest;
import com.mosque.crm.entity.Permission;
import com.mosque.crm.entity.Role;
import com.mosque.crm.repository.PermissionRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.service.AuthorizationService;

import jakarta.validation.Valid;

/**
 * Admin endpoints for managing roles and their permission assignments.
 * Read endpoints require "privilege.view", write endpoints require "privilege.manage".
 * The GET /admin/roles list is also accessible with "user.manage" (needed by member-edit role picker).
 */
@RestController
@RequestMapping("/admin/roles")
public class RoleManagementController {

    private static final Logger log = LoggerFactory.getLogger(RoleManagementController.class);

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AuthorizationService authorizationService;

    public RoleManagementController(RoleRepository roleRepository,
                                    PermissionRepository permissionRepository,
                                    AuthorizationService authorizationService) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.authorizationService = authorizationService;
    }

    /**
     * List all roles with their assigned permission codes.
     * Accessible with either "user.manage" (for member-edit role picker) or "privilege.view".
     * The SUPER_ADMIN role is only visible to users with the superadmin.manage permission.
     */
    @GetMapping
    @PreAuthorize("@auth.hasAnyPermission('user.manage', 'privilege.view')")
    public ResponseEntity<List<RoleDTO>> getAllRoles() {
        List<Role> roles = roleRepository.findAll();
        boolean canManageSuperAdmin = authorizationService.hasPermission("superadmin.manage");
        List<RoleDTO> dtos = roles.stream()
                .filter(r -> canManageSuperAdmin || !"SUPER_ADMIN".equals(r.getName()))
                .map(this::toRoleDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get a single role with its assigned permission codes.
     */
    @GetMapping("/{id}")
    @PreAuthorize("@auth.hasAnyPermission('user.manage', 'privilege.view')")
    public ResponseEntity<RoleDTO> getRoleById(@PathVariable Long id) {
        return roleRepository.findById(id)
                .map(this::toRoleDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * List all available permissions (so the UI can show checkboxes).
     * Only the "superadmin" category is hidden from non-super-admins.
     */
    @GetMapping("/permissions")
    @PreAuthorize("@auth.hasAnyPermission('user.manage', 'privilege.view')")
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
    @PreAuthorize("@auth.hasAnyPermission('user.manage', 'privilege.manage')")
    public ResponseEntity<RoleDTO> updateRolePermissions(
            @PathVariable Long id,
            @Valid @RequestBody RolePermissionUpdateRequest request) {

        Role role = roleRepository.findById(id).orElse(null);
        if (role == null) {
            return ResponseEntity.notFound().build();
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

        role.setPermissions(newPermissions);
        roleRepository.save(role);

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
    @PreAuthorize("@auth.hasPermission('privilege.manage')")
    public ResponseEntity<RoleDTO> updateRoleAssignablePermissions(
            @PathVariable Long id,
            @Valid @RequestBody RolePermissionUpdateRequest request) {

        Role role = roleRepository.findById(id).orElse(null);
        if (role == null) {
            return ResponseEntity.notFound().build();
        }

        boolean canManageSuperAdmin = authorizationService.hasPermission("superadmin.manage");

        if ("SUPER_ADMIN".equals(role.getName()) && !canManageSuperAdmin) {
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

        role.setAssignablePermissions(newAssignable);
        role.setPermissions(prunedGranted);
        roleRepository.save(role);

        authorizationService.evictAllCaches();

        log.info("Updated assignable permissions for role '{}' (id={}): pool={}, granted pruned from {} to {}",
                role.getName(), id, request.getPermissionCodes().size(),
                currentGranted.size(), prunedGranted.size());

        return ResponseEntity.ok(toRoleDTO(role));
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
        return new RoleDTO(role.getId(), role.getName(), role.getDescription(), permCodes, assignableCodes);
    }

    private PermissionDTO toPermissionDTO(Permission p) {
        return new PermissionDTO(p.getId(), p.getCode(), p.getDescription(), p.getCategory());
    }
}
