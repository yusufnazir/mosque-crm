package com.mosque.crm.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.Organization;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.service.RoleTemplateService;

/**
 * Ensures every organization has up-to-date tenant role copies on startup.
 * <p>
 * DDL changeset 048 creates tenant role copies, but it runs before DML seed
 * data exists on a fresh database, making it a no-op. This provisioner fills
 * that gap by running after Liquibase completes and all seed data is present.
 * <p>
 * Also migrates any user_roles still pointing at global (organization_id IS NULL)
 * ADMIN/MEMBER roles to the tenant-specific copies, matching the intent of
 * changeset 048.
 * <p>
 * Safe to run on every startup: {@link RoleTemplateService#provisionDefaultRolesForOrganization}
 * upserts roles from templates, so existing roles are updated and missing ones created.
 */
@Component
public class TenantRoleStartupProvisioner {

    private static final Logger log = LoggerFactory.getLogger(TenantRoleStartupProvisioner.class);

    private final OrganizationRepository organizationRepository;
    private final RoleTemplateService roleTemplateService;
    private final JdbcTemplate jdbcTemplate;

    public TenantRoleStartupProvisioner(OrganizationRepository organizationRepository,
                                         RoleTemplateService roleTemplateService,
                                         JdbcTemplate jdbcTemplate) {
        this.organizationRepository = organizationRepository;
        this.roleTemplateService = roleTemplateService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void provisionTenantRoles() {
        List<Organization> organizations = organizationRepository.findAll();
        if (organizations.isEmpty()) {
            return;
        }

        log.info("Provisioning tenant roles for {} organization(s)...", organizations.size());
        for (Organization organization : organizations) {
            roleTemplateService.provisionDefaultRolesForOrganization(organization.getId());
        }

        // Migrate any user_roles still pointing to global ADMIN/MEMBER
        // to the tenant-specific copies (same intent as DDL changeset 048).
        migrateGlobalRoleAssignments();

        log.info("Tenant role provisioning complete.");
    }

    /**
     * For every user with a organization_id who is still assigned a global
     * (organization_id IS NULL) template role, add a tenant role assignment
     * and remove the stale global one.
     */
    private void migrateGlobalRoleAssignments() {
        // Insert tenant assignments for users still on global roles
        int inserted = jdbcTemplate.update(
            "INSERT IGNORE INTO user_roles (user_id, role_id, organization_id, start_date, end_date) "
          + "SELECT ur.user_id, tr.id, COALESCE(ur.organization_id, u.organization_id), ur.start_date, ur.end_date "
          + "FROM user_roles ur "
          + "JOIN users u ON u.id = ur.user_id "
          + "JOIN roles gr ON gr.id = ur.role_id AND gr.organization_id IS NULL "
          + "JOIN role_templates rt ON rt.name COLLATE utf8mb4_unicode_ci = gr.name COLLATE utf8mb4_unicode_ci AND rt.is_active = TRUE "
          + "JOIN roles tr ON tr.name = gr.name AND tr.organization_id = u.organization_id "
          + "WHERE u.organization_id IS NOT NULL"
        );

        // Remove the now-redundant global role assignments
        int deleted = jdbcTemplate.update(
            "DELETE ur FROM user_roles ur "
          + "JOIN users u ON u.id = ur.user_id "
          + "JOIN roles gr ON gr.id = ur.role_id AND gr.organization_id IS NULL "
          + "JOIN role_templates rt ON rt.name COLLATE utf8mb4_unicode_ci = gr.name COLLATE utf8mb4_unicode_ci AND rt.is_active = TRUE "
          + "JOIN roles tr ON tr.name = gr.name AND tr.organization_id = u.organization_id "
          + "WHERE u.organization_id IS NOT NULL"
        );

        if (inserted > 0 || deleted > 0) {
            log.info("Migrated user_roles: {} inserted (tenant), {} deleted (global)", inserted, deleted);
        }
    }

}
