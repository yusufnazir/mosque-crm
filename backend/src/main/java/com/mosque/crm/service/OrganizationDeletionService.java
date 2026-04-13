package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.Organization;
import com.mosque.crm.repository.OrganizationRepository;

@Service
public class OrganizationDeletionService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationDeletionService.class);

    private final OrganizationRepository organizationRepository;
    private final JdbcTemplate jdbcTemplate;

    public OrganizationDeletionService(OrganizationRepository organizationRepository, JdbcTemplate jdbcTemplate) {
        this.organizationRepository = organizationRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public boolean deleteOrganizationCascade(Long organizationId) {
        Optional<Organization> existing = organizationRepository.findById(organizationId);
        if (existing.isEmpty()) {
            return false;
        }

        // Keep super-admin users intact if they only selected this tenant.
        jdbcTemplate.update(
                "UPDATE users SET selected_organization_id = NULL "
                        + "WHERE selected_organization_id = ? "
                        + "AND (organization_id IS NULL OR organization_id <> ?)",
                organizationId, organizationId);

        // These tables reference roles/users but don't carry organization_id.
        jdbcTemplate.update(
                "DELETE FROM role_assignable_roles "
                        + "WHERE role_id IN (SELECT id FROM roles WHERE organization_id = ?) "
                        + "OR assignable_role_id IN (SELECT id FROM roles WHERE organization_id = ?)",
                organizationId, organizationId);
        jdbcTemplate.update(
                "DELETE FROM role_assignable_permissions "
                        + "WHERE role_id IN (SELECT id FROM roles WHERE organization_id = ?)",
                organizationId);
        jdbcTemplate.update(
                "DELETE FROM role_permissions "
                        + "WHERE role_id IN (SELECT id FROM roles WHERE organization_id = ?)",
                organizationId);
        jdbcTemplate.update(
                "DELETE FROM password_reset_tokens "
                        + "WHERE user_id IN (SELECT id FROM users WHERE organization_id = ?)",
                organizationId);
        jdbcTemplate.update(
                "DELETE FROM user_preferences "
                        + "WHERE user_id IN (SELECT id FROM users WHERE organization_id = ?)",
                organizationId);

        List<String> organizationScopedTables = jdbcTemplate.queryForList(
                "SELECT DISTINCT table_name "
                        + "FROM information_schema.columns "
                        + "WHERE table_schema = DATABASE() "
                        + "AND column_name = 'organization_id' "
                        + "AND table_name <> 'organizations'",
                String.class);

        Set<String> remaining = new LinkedHashSet<>(organizationScopedTables);
        int guard = Math.max(remaining.size() * 2, 10);

        while (!remaining.isEmpty() && guard-- > 0) {
            boolean progress = false;
            Iterator<String> iterator = remaining.iterator();
            while (iterator.hasNext()) {
                String tableName = iterator.next();
                try {
                    jdbcTemplate.update("DELETE FROM `" + tableName + "` WHERE organization_id = ?", organizationId);
                    iterator.remove();
                    progress = true;
                } catch (DataIntegrityViolationException ex) {
                    // Parent row still referenced by another table; try again next pass.
                }
            }
            if (!progress) {
                break;
            }
        }

        if (!remaining.isEmpty()) {
            List<String> blockedTables = new ArrayList<>(remaining);
            throw new IllegalStateException("Unable to delete organization due to FK dependencies in: " + blockedTables);
        }

        organizationRepository.delete(existing.get());
        log.info("Deleted organization id={} and all tenant-scoped data", organizationId);
        return true;
    }
}
