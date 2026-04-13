package com.mosque.crm.service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.Permission;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.RoleTemplate;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.RoleTemplateRepository;

/**
 * Manages provisioning of default roles for new tenants and syncing of
 * template changes to all existing tenant role copies.
 *
 * Source of truth: {@code role_templates} table (not null-organization_id rows in {@code roles}).
 */
@Service
public class RoleTemplateService {

    private static final Logger log = LoggerFactory.getLogger(RoleTemplateService.class);

    private final RoleTemplateRepository templateRepository;
    private final RoleRepository roleRepository;

    public RoleTemplateService(RoleTemplateRepository templateRepository,
                                RoleRepository roleRepository) {
        this.templateRepository = templateRepository;
        this.roleRepository = roleRepository;
    }

    /**
     * Provision tenant roles for a newly created organization by copying ALL active templates.
     * Uses a 2-pass approach:
     * 1. Create/update all tenant roles (permissions + assignable permissions)
     * 2. Wire up assignable roles (template→template mappings resolved to tenant roles)
     */
    @Transactional
    public void provisionDefaultRolesForOrganization(Long organizationId) {
        if (organizationId == null) {
            return;
        }

        List<RoleTemplate> templates = templateRepository.findByActiveTrueOrderBySortOrderAscNameAsc();

        // Pass 1: create all tenant roles (permissions + assignable permissions)
        for (RoleTemplate template : templates) {
            upsertTenantRoleFromTemplate(template, organizationId);
        }

        // Pass 2: wire up assignable roles from template relationships
        Map<String, Role> tenantRolesByName = buildTenantRoleMap(organizationId);
        for (RoleTemplate template : templates) {
            Role tenantRole = tenantRolesByName.get(template.getName());
            if (tenantRole == null) {
                continue;
            }
            Set<Role> assignableRoles = new HashSet<>();
            for (RoleTemplate assignableTpl : template.getAssignableRoleTemplates()) {
                Role target = tenantRolesByName.get(assignableTpl.getName());
                if (target != null) {
                    assignableRoles.add(target);
                }
            }
            tenantRole.getAssignableRoles().clear();
            tenantRole.getAssignableRoles().addAll(assignableRoles);
            roleRepository.save(tenantRole);
        }

        log.info("Provisioned {} template roles for organization_id={}", templates.size(), organizationId);
    }

    /**
     * Propagate template permission changes to all existing tenant role copies.
     * Called after super-admin updates a template's permissions.
     */
    @Transactional
    public void syncTemplateToAllTenants(String templateName) {
        RoleTemplate template = templateRepository.findByName(templateName).orElse(null);
        if (template == null) {
            log.warn("syncTemplateToAllTenants: template '{}' not found", templateName);
            return;
        }

        List<Role> tenantRoles = roleRepository.findByNameAndOrganizationIdIsNotNull(templateName);
        for (Role tenantRole : tenantRoles) {
            tenantRole.setDescription(template.getDescription());
            Set<Permission> newAssignable = new HashSet<>(template.getAssignablePermissions());
            Set<Permission> newGranted = pruneByPool(new HashSet<>(template.getPermissions()), newAssignable);
            tenantRole.getAssignablePermissions().clear();
            tenantRole.getAssignablePermissions().addAll(newAssignable);
            tenantRole.getPermissions().clear();
            tenantRole.getPermissions().addAll(newGranted);

            // Sync assignable roles from template relationships
            if (tenantRole.getOrganizationId() != null) {
                Map<String, Role> tenantRoleMap = buildTenantRoleMap(tenantRole.getOrganizationId());
                Set<Role> assignableRoles = new HashSet<>();
                for (RoleTemplate assignableTpl : template.getAssignableRoleTemplates()) {
                    Role target = tenantRoleMap.get(assignableTpl.getName());
                    if (target != null) {
                        assignableRoles.add(target);
                    }
                }
                tenantRole.getAssignableRoles().clear();
                tenantRole.getAssignableRoles().addAll(assignableRoles);
            }

            roleRepository.save(tenantRole);
        }

        log.info("Synced template '{}' to {} tenant role copies", templateName, tenantRoles.size());
    }

    /**
     * @deprecated Use {@link #syncTemplateToAllTenants(String)} instead.
     *             Kept for backwards compatibility with existing callers in RoleManagementController.
     */
    @Deprecated
    public void syncTemplateRoleToAllTenants(String roleName) {
        syncTemplateToAllTenants(roleName);
    }

    /**
     * Check if a role is a default template copy (i.e., has a organization_id and a corresponding template exists).
     */
    public boolean isTemplateRole(Role role) {
        return role != null
                && role.getOrganizationId() != null
                && templateRepository.existsByName(role.getName());
    }

    /**
     * @deprecated Kept for backwards compatibility with RoleManagementController.
     */
    @Deprecated
    public boolean isDefaultTemplateRole(Role role) {
        return isTemplateRole(role);
    }

    // ─── private helpers ─────────────────────────────────────────────

    private void upsertTenantRoleFromTemplate(RoleTemplate template, Long organizationId) {
        Role tenantRole = roleRepository.findByNameAndOrganizationId(template.getName(), organizationId).orElse(null);
        if (tenantRole == null) {
            tenantRole = new Role();
            tenantRole.setName(template.getName());
            tenantRole.setOrganizationId(organizationId);
        }

        tenantRole.setDescription(template.getDescription());

        Set<Permission> assignable = new HashSet<>(template.getAssignablePermissions());
        Set<Permission> granted = pruneByPool(new HashSet<>(template.getPermissions()), assignable);

        tenantRole.getAssignablePermissions().clear();
        tenantRole.getAssignablePermissions().addAll(assignable);
        tenantRole.getPermissions().clear();
        tenantRole.getPermissions().addAll(granted);

        roleRepository.save(tenantRole);
    }

    private Set<Permission> pruneByPool(Set<Permission> granted, Set<Permission> assignable) {
        Set<String> poolCodes = assignable.stream().map(Permission::getCode).collect(Collectors.toSet());
        return granted.stream()
                .filter(p -> poolCodes.contains(p.getCode()))
                .collect(Collectors.toSet());
    }

    private Map<String, Role> buildTenantRoleMap(Long organizationId) {
        Map<String, Role> map = new HashMap<>();
        for (Role role : roleRepository.findByOrganizationId(organizationId)) {
            map.put(role.getName(), role);
        }
        return map;
    }
}
