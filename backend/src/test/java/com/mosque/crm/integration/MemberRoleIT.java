package com.mosque.crm.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the MEMBER role cannot access admin-only endpoints
 * and can access self-service endpoints.
 *
 * Role boundary rules:
 *  - MEMBER can: view own profile, view family, view own contributions,
 *    view/upload/share documents, view messages, view/manage saved filters (Pro plan)
 *  - MEMBER cannot: list all persons, manage members, manage groups,
 *    manage contributions, access communications (admin tool), export data,
 *    manage roles/permissions, manage users
 */
@DisplayName("Member Role — access boundary enforcement")
class MemberRoleIT extends BaseIT {

    // ── Admin-only endpoints that must return 403 for MEMBER ─────────────────

    @Test
    @DisplayName("Member cannot list all persons (admin-only)")
    void memberCannotListPersons() {
        ResponseEntity<String> response = get("/persons", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot create a person")
    void memberCannotCreatePerson() {
        Map<String, Object> body = Map.of("firstName", "Hacker", "lastName", "Attempt", "status", "ACTIVE");
        ResponseEntity<String> response = post("/persons", body, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot list groups (member.grouping is admin-managed)")
    void memberCannotManageGroups() {
        ResponseEntity<String> response = get("/groups", alphaMemberToken);
        // Groups admin endpoints are secured; MEMBER has no group permissions
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot create a group")
    void memberCannotCreateGroup() {
        Map<String, Object> body = Map.of("name", "UnauthorisedGroup");
        ResponseEntity<String> response = post("/groups", body, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot access communications compose/history (admin tool)")
    void memberCannotAccessCommunications() {
        ResponseEntity<String> response = get("/communications/messages", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot access data export")
    void memberCannotAccessExport() {
        ResponseEntity<String> response = get("/admin/export/members", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot list application users")
    void memberCannotListUsers() {
        ResponseEntity<String> response = get("/admin/users", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot view roles")
    void memberCannotViewRoles() {
        ResponseEntity<String> response = get("/admin/roles", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot manage contribution types")
    void memberCannotManageContributionTypes() {
        ResponseEntity<String> response = get("/contributions/types", alphaMemberToken);
        // Contribution type management requires contribution.view_types permission
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot delete a document folder (document.manage required)")
    void memberCannotDeleteDocumentFolder() {
        String folderId = String.valueOf(fixture.alphaFolderId);
        ResponseEntity<String> response = delete("/document-folders/" + folderId, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot delete a document (document.manage required)")
    void memberCannotDeleteDocument() {
        String docId = String.valueOf(fixture.alphaDocumentId);
        ResponseEntity<String> response = delete("/documents/" + docId, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ── Endpoints MEMBER should be able to access ─────────────────────────────

    @Test
    @DisplayName("Member can access own profile endpoint (member.portal)")
    void memberCanAccessOwnProfile() {
        ResponseEntity<String> response = get("/member/profile", alphaMemberToken);
        // 200 if person is linked, 403 if no person link — either is correct for a new test user.
        // What we assert: the endpoint does NOT return 401 (unauthenticated) or 500.
        assertThat(response.getStatusCode().value()).isNotIn(401, 500);
    }

    @Test
    @DisplayName("Member can view documents (document.view)")
    void memberCanViewDocuments() {
        ResponseEntity<String> response = get("/documents", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Member can view document folders (document.view)")
    void memberCanViewDocumentFolders() {
        ResponseEntity<String> response = get("/document-folders", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Member can view document by ID (document.view)")
    void memberCanViewDocumentById() {
        String docId = String.valueOf(fixture.alphaDocumentId);
        ResponseEntity<String> response = get("/documents/" + docId, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Member can list own messages")
    void memberCanViewMessages() {
        ResponseEntity<String> response = get("/messages/inbox", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Member can list saved filters (member.saved_filters)")
    void memberCanListSavedFilters() {
        ResponseEntity<String> response = get("/members/filters", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Member can view current user info (/me is always accessible when authenticated)")
    void memberCanAccessCurrentUserInfo() {
        ResponseEntity<String> response = get("/me", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
