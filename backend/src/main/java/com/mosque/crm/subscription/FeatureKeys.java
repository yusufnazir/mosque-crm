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
    // Member features
    // -------------------------------------------------------------------------
    /** Saved search filters (advanced). Basic search is always available. */
    public static final String MEMBER_SAVED_FILTERS = "member.saved_filters";

    /** Member grouping / group management module. */
    public static final String MEMBER_GROUPING = "member.grouping";

    // -------------------------------------------------------------------------
    // Distribution / Events
    // -------------------------------------------------------------------------
    /** Maximum number of distribution events (Eid, etc.) the organization can create. Stored as limit_value. */
    public static final String EVENTS_MAX = "events.max";

    // -------------------------------------------------------------------------
    // Payment tracking
    // -------------------------------------------------------------------------
    /** Member payment tracking (history, status, overdue). */
    public static final String PAYMENT_TRACKING = "payment.tracking";

    // -------------------------------------------------------------------------
    // Family tree / genealogy
    // -------------------------------------------------------------------------
    /** GEDCOM-based family tree module. */
    public static final String FAMILY_TREE = "family.tree";

    // -------------------------------------------------------------------------
    // Communications
    // -------------------------------------------------------------------------
    /** Bulk email communications to members. */
    public static final String COMMUNICATION_TOOLS = "communication.tools";

    // -------------------------------------------------------------------------
    // Document Management
    // -------------------------------------------------------------------------
    /** Document management: file uploads, rich-text docs, sharing, versioning. */
    public static final String DOCUMENT_MANAGEMENT = "document.management";

    // -------------------------------------------------------------------------
    // Roles & Permissions management
    // -------------------------------------------------------------------------
    /** Custom role creation and fine-grained permission management UI. */
    public static final String ROLES_PERMISSIONS = "roles.permissions";

    // -------------------------------------------------------------------------
    // Data Export
    // -------------------------------------------------------------------------
    /** Bulk data export of members, payments, and contributions to Excel. */
    public static final String DATA_EXPORT = "data.export";

    // -------------------------------------------------------------------------
    // Attendance
    // -------------------------------------------------------------------------
    /** Advanced attendance tracking (detailed records, analytics). */
    public static final String ATTENDANCE_ADVANCED = "attendance.advanced";

    // -------------------------------------------------------------------------
    // Member search
    // -------------------------------------------------------------------------
    /** Member search (gated per plan; basic search always available). */
    public static final String MEMBER_SEARCH = "member.search";
}
