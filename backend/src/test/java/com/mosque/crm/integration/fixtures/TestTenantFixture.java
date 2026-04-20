package com.mosque.crm.integration.fixtures;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates and tears down two test tenants (Alpha Pro, Beta Pro) plus one
 * Starter tenant for plan-entitlement tests.  All IDs are tracked so
 * {@link #cleanupAll()} leaves the database exactly as it was before setup.
 *
 * Tenant layout
 * ─────────────
 *  Alpha  (Pro)    test_alpha_admin  /  test_alpha_member
 *  Beta   (Pro)    test_beta_admin   /  test_beta_member
 *  Starter         test_starter_admin
 *
 * Each Pro tenant gets: 2 persons, 1 group, 1 document folder, 1 document (no file bytes).
 *
 * Table notes (verified against Liquibase DDL):
 *  - persons.id          BIGINT auto-increment
 *  - org_document_folders  (not document_folders)
 *  - org_documents         (not documents)
 *  - groups                has no updated_at column
 *  - organization_subscriptions.id  BIGINT auto-increment (omit from INSERT)
 */
@Component
public class TestTenantFixture {

    // ── plan IDs (from 037-data-subscription-plans.xml) ──────────────────────
    public static final long PLAN_ID_STARTER = 1L;
    public static final long PLAN_ID_PRO     = 3L;

    // ── role IDs (from 020-data-roles.xml) ───────────────────────────────────
    private static final long ROLE_ADMIN  = 1L;
    private static final long ROLE_MEMBER = 2L;

    // ── test password (plain-text; hashed at runtime) ────────────────────────
    public static final String TEST_PASSWORD = "TestPass123!";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // ── public IDs exposed to tests ──────────────────────────────────────────
    public long alphaOrgId;
    public long betaOrgId;
    public long starterOrgId;

    public long alphaAdminUserId;
    public long alphaMemberUserId;
    public long betaAdminUserId;
    public long betaMemberUserId;
    public long starterAdminUserId;

    // persons.id is BIGINT
    public long alphaPersonId;
    public long alphaPersonId2;
    public long betaPersonId;
    public long betaPersonId2;

    // org_document_folders.id is BIGINT
    public long alphaFolderId;
    public long betaFolderId;

    // org_documents.id is BIGINT
    public long alphaDocumentId;
    public long betaDocumentId;

    public long alphaGroupId;
    public long betaGroupId;

    // ── internal tracking for cleanup ────────────────────────────────────────
    private final List<Runnable> cleanupSteps = new ArrayList<>();

    // ─────────────────────────────────────────────────────────────────────────
    //  Public API
    // ─────────────────────────────────────────────────────────────────────────

    public void setupAll() {
        String hash = passwordEncoder.encode(TEST_PASSWORD);

        // ── Alpha (Pro) ──────────────────────────────────────────────────────
        alphaOrgId = createOrganization("IT Test Alpha Mosque", "it-test-alpha");
        subscribeOrgToPlan(alphaOrgId, PLAN_ID_PRO);
        alphaAdminUserId  = createUser("test_alpha_admin",  hash, "it-alpha-admin@test.invalid",  alphaOrgId, ROLE_ADMIN);
        alphaMemberUserId = createUser("test_alpha_member", hash, "it-alpha-member@test.invalid", alphaOrgId, ROLE_MEMBER);
        alphaPersonId     = createPerson("Alpha", "PersonOne", "it-alpha-p1@test.invalid", alphaOrgId);
        alphaPersonId2    = createPerson("Alpha", "PersonTwo", "it-alpha-p2@test.invalid", alphaOrgId);
        alphaFolderId     = createDocumentFolder("Alpha Docs", alphaOrgId, alphaAdminUserId);
        alphaDocumentId   = createDocument("Alpha Test Doc", alphaFolderId, alphaOrgId, alphaAdminUserId);
        alphaGroupId      = createGroup("Alpha Group", alphaOrgId);

        // ── Beta (Pro) ───────────────────────────────────────────────────────
        betaOrgId = createOrganization("IT Test Beta Mosque", "it-test-beta");
        subscribeOrgToPlan(betaOrgId, PLAN_ID_PRO);
        betaAdminUserId  = createUser("test_beta_admin",  hash, "it-beta-admin@test.invalid",  betaOrgId, ROLE_ADMIN);
        betaMemberUserId = createUser("test_beta_member", hash, "it-beta-member@test.invalid", betaOrgId, ROLE_MEMBER);
        betaPersonId     = createPerson("Beta", "PersonOne", "it-beta-p1@test.invalid", betaOrgId);
        betaPersonId2    = createPerson("Beta", "PersonTwo", "it-beta-p2@test.invalid", betaOrgId);
        betaFolderId     = createDocumentFolder("Beta Docs", betaOrgId, betaAdminUserId);
        betaDocumentId   = createDocument("Beta Test Doc", betaFolderId, betaOrgId, betaAdminUserId);
        betaGroupId      = createGroup("Beta Group", betaOrgId);

        // ── Starter ──────────────────────────────────────────────────────────
        starterOrgId = createOrganization("IT Test Starter Mosque", "it-test-starter");
        subscribeOrgToPlan(starterOrgId, PLAN_ID_STARTER);
        starterAdminUserId = createUser("test_starter_admin", hash, "it-starter-admin@test.invalid", starterOrgId, ROLE_ADMIN);
    }

    public void cleanupAll() {
        // Run in reverse-insertion order to respect FK constraints
        for (int i = cleanupSteps.size() - 1; i >= 0; i--) {
            try {
                cleanupSteps.get(i).run();
            } catch (Exception e) {
                // Best-effort cleanup — log but don't abort
                System.err.println("[TestTenantFixture] cleanup step failed: " + e.getMessage());
            }
        }
        cleanupSteps.clear();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private long createOrganization(String name, String handle) {
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(
            "INSERT INTO organizations (name, handle, active, created_at, updated_at) VALUES (?,?,?,?,?)",
            name, handle, true, now, now
        );
        Long id = jdbc.queryForObject("SELECT id FROM organizations WHERE handle = ?", Long.class, handle);
        cleanupSteps.add(() -> jdbc.update("DELETE FROM organizations WHERE id = ?", id));
        return id;
    }

    private void subscribeOrgToPlan(long orgId, long planId) {
        LocalDateTime now = LocalDateTime.now();
        // id is BIGINT auto-increment — omit from INSERT
        jdbc.update(
            "INSERT INTO organization_subscriptions "
            + "(organization_id, plan_id, billing_cycle, status, starts_at, auto_renew, billing_enabled, created_at, updated_at) "
            + "VALUES (?,?,?,?,?,?,?,?,?)",
            orgId, planId, "MONTHLY", "ACTIVE", now, true, false, now, now
        );
        cleanupSteps.add(() ->
            jdbc.update("DELETE FROM organization_subscriptions WHERE organization_id = ?", orgId)
        );
    }

    private long createUser(String username, String passwordHash, String email, long orgId, long roleId) {
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(
            "INSERT INTO users (username, password, email, account_enabled, account_locked, credentials_expired, must_change_password, organization_id, created_at, updated_at) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?)",
            username, passwordHash, email, true, false, false, false, orgId, now, now
        );
        Long userId = jdbc.queryForObject("SELECT id FROM users WHERE username = ?", Long.class, username);
        jdbc.update("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", userId, roleId);

        cleanupSteps.add(() -> jdbc.update("DELETE FROM user_roles WHERE user_id = ?", userId));
        cleanupSteps.add(() -> jdbc.update("DELETE FROM users WHERE id = ?", userId));
        return userId;
    }

    /**
     * persons.id is BIGINT auto-increment.
     * persons.email has a unique constraint (global across all orgs).
     * persons.hash has a unique constraint — we generate a random one.
     */
    private long createPerson(String firstName, String lastName, String email, long orgId) {
        String uniqueHash = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(
            "INSERT INTO persons (first_name, last_name, email, status, hash, organization_id, created_at, updated_at) "
            + "VALUES (?,?,?,?,?,?,?,?)",
            firstName, lastName, email, "ACTIVE", uniqueHash, orgId, now, now
        );
        Long id = jdbc.queryForObject(
            "SELECT id FROM persons WHERE email = ?", Long.class, email
        );
        cleanupSteps.add(() -> jdbc.update("DELETE FROM persons WHERE id = ?", id));
        return id;
    }

    /**
     * Table is org_document_folders (verified against DDL 150-create-org-document-folders-table.xml).
     * id is BIGINT auto-increment.
     */
    private long createDocumentFolder(String name, long orgId, long ownerUserId) {
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(
            "INSERT INTO org_document_folders (organization_id, name, owner_user_id, visibility, created_at, updated_at) "
            + "VALUES (?,?,?,?,?,?)",
            orgId, name, ownerUserId, "ORGANIZATION", now, now
        );
        Long id = jdbc.queryForObject(
            "SELECT id FROM org_document_folders WHERE name = ? AND organization_id = ?",
            Long.class, name, orgId
        );
        cleanupSteps.add(() -> jdbc.update("DELETE FROM org_document_folders WHERE id = ?", id));
        return id;
    }

    /**
     * Table is org_documents (verified against DDL 151-create-org-documents-table.xml).
     * id is BIGINT auto-increment.  document_type=RICH_TEXT, no file bytes or Minio needed.
     */
    private long createDocument(String title, long folderId, long orgId, long ownerUserId) {
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(
            "INSERT INTO org_documents (organization_id, folder_id, title, document_type, file_size, status, visibility, owner_user_id, version_count, expiry_notification_sent, created_at, updated_at) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            orgId, folderId, title, "RICH_TEXT", 0L, "ACTIVE", "ORGANIZATION",
            ownerUserId, 1, false, now, now
        );
        Long id = jdbc.queryForObject(
            "SELECT id FROM org_documents WHERE title = ? AND organization_id = ?",
            Long.class, title, orgId
        );
        cleanupSteps.add(() -> jdbc.update("DELETE FROM org_documents WHERE id = ?", id));
        return id;
    }

    /**
     * groups table has no updated_at column (verified against DDL 070-create-groups-table.xml).
     */
    private long createGroup(String name, long orgId) {
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(
            "INSERT INTO `groups` (name, organization_id, created_at) VALUES (?,?,?)",
            name, orgId, now
        );
        Long id = jdbc.queryForObject(
            "SELECT id FROM `groups` WHERE name = ? AND organization_id = ?", Long.class, name, orgId
        );
        cleanupSteps.add(() -> jdbc.update("DELETE FROM `groups` WHERE id = ?", id));
        return id;
    }
}
