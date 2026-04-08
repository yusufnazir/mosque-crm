package com.mosque.crm.subscription;

/**
 * Canonical string constants for plan feature keys stored in
 * {@code plan_entitlements.feature_key}.
 *
 * Use these constants everywhere in service/aspect code instead of
 * raw string literals to prevent typo-induced bugs.
 */
public final class FeatureKeys {

    private FeatureKeys() {
        // constants class
    }

    // -------------------------------------------------------------------------
    // User / admin limits
    // -------------------------------------------------------------------------
    /** Maximum number of users allowed for the organization. Stored as limit_value. */
    public static final String ADMIN_USERS_MAX = "admin.users.max";

    /** Maximum number of members (persons) allowed for the organization. Stored as limit_value. */
    public static final String MEMBERS_MAX = "members.max";

    // -------------------------------------------------------------------------
    // Member portal access
    // -------------------------------------------------------------------------
    /** Whether members can log in to the self-service portal. */
    public static final String MEMBER_PORTAL = "member.portal";

    // -------------------------------------------------------------------------
    // Reports
    // -------------------------------------------------------------------------
    /** Access to the advanced reporting module. */
    public static final String REPORTS_ADVANCED = "reports.advanced";

    // -------------------------------------------------------------------------
    // Import / Export
    // -------------------------------------------------------------------------
    /** Bulk Excel import of members/contributions. */
    public static final String IMPORT_EXCEL = "import.excel";

    // -------------------------------------------------------------------------
    // Finance
    // -------------------------------------------------------------------------
    /** Multi-currency support. */
    public static final String FINANCE_MULTI_CURRENCY = "finance.multi_currency";

    // -------------------------------------------------------------------------
    // Family tree / genealogy
    // -------------------------------------------------------------------------
    /** GEDCOM-based family tree module. */
    public static final String FAMILY_TREE = "family.tree";
}
