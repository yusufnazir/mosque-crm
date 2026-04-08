package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

/**
 * Backfills organization_id on all multi-tenant tables where it is NULL.
 * Assigns records to the default organization (id=1).
 * Super admin users are excluded — they must keep organization_id=NULL
 * so the tenant filter is not applied and they can see all data.
 */
public class DataBackfillOrganizationId extends CustomDataTaskChange {

    private String defaultOrganizationId;

    private static final String[] TABLES = {
        "persons",
        "memberships",
        "member_payments",
        "member_contribution_assignments",
        "member_contribution_exemptions",
        "contribution_types",
        "contribution_obligations",
        "donations",
        "exchange_rates",
        "organization_currencies",
        "groups",
        "group_members",
        "group_roles",
        "distribution_events",
        "member_distribution_registrations",
        "parcel_categories",
        "parcel_distributions",
        "non_member_recipients",
        "organization_subscriptions",
        "configurations",
        "gedcom_individuals",
        "gedcom_families",
        "gedcom_family_children",
        "gedcom_events",
        "gedcom_event_participants",
        "gedcom_sources",
        "gedcom_citations",
        "gedcom_notes",
        "gedcom_media",
        "gedcom_note_links",
        "gedcom_person_links",
        "users",
        "roles",
        "user_roles",
        "user_member_link"
    };

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        Long organizationId = Long.parseLong(defaultOrganizationId);

        for (String table : TABLES) {
            String sql = "UPDATE " + table + " SET organization_id = ? WHERE organization_id IS NULL";
            try (PreparedStatement ps = connection.prepareStatement(sql)) {
                ps.setLong(1, organizationId);
                int updated = ps.executeUpdate();
                if (updated > 0) {
                    System.out.println("  Backfilled organization_id=" + organizationId + " on " + updated + " rows in " + table);
                }
            }
        }

        // Super admin users must keep organization_id=NULL so the tenant filter
        // is not applied and they can see data across all organizations.
        String nullifySuperAdmins = "UPDATE users SET organization_id = NULL " +
                "WHERE id IN (SELECT ur.user_id FROM user_roles ur " +
                "JOIN roles r ON r.id = ur.role_id WHERE r.name = 'SUPER_ADMIN')";
        try (PreparedStatement ps = connection.prepareStatement(nullifySuperAdmins)) {
            int updated = ps.executeUpdate();
            if (updated > 0) {
                System.out.println("  Cleared organization_id on " + updated + " SUPER_ADMIN user(s)");
            }
        }
    }

    public String getDefaultOrganizationId() {
        return defaultOrganizationId;
    }

    public void setDefaultOrganizationId(String defaultOrganizationId) {
        this.defaultOrganizationId = defaultOrganizationId;
    }
}
