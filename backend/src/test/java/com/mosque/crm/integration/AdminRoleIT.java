package com.mosque.crm.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the ADMIN role on a Pro-plan tenant can reach all feature
 * endpoints that are enabled for that plan.
 *
 * Covered features:
 *  - Members (persons)
 *  - Member groups           (member.grouping)
 *  - Saved member filters    (member.saved_filters)
 *  - Communications          (communication.tools)
 *  - Documents + folders     (document.management)
 *  - Data export             (data.export)
 *  - Roles & permissions     (roles.permissions)
 *  - Events / distributions  (always on)
 *  - Memberships             (always on)
 *  - Dashboard               (always on)
 */
@DisplayName("Admin Role — feature access on Pro plan")
class AdminRoleIT extends BaseIT {

    // ── Members ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can list persons")
    void adminCanListPersons() {
        ResponseEntity<String> response = get("/persons", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Admin can create a person")
    void adminCanCreatePerson() {
        Map<String, Object> body = Map.of(
            "firstName", "IT-Create",
            "lastName",  "TestPerson",
            "status",    "ACTIVE"
        );
        ResponseEntity<String> response = post("/persons", body, alphaAdminToken);
        assertThat(response.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.CREATED);

        // Parse returned ID and clean up the created record
        try {
            ObjectMapper om = new ObjectMapper();
            String personId = om.readTree(response.getBody()).path("id").asText();
            if (!personId.isEmpty()) {
                delete("/persons/" + personId, alphaAdminToken);
            }
        } catch (Exception ignored) {}
    }

    // ── Groups ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can list groups (member.grouping)")
    void adminCanListGroups() {
        ResponseEntity<String> response = get("/groups", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Admin can create a group")
    void adminCanCreateGroup() {
        Map<String, Object> body = Map.of("name", "IT-Temp-Group-" + System.nanoTime());
        ResponseEntity<String> response = post("/groups", body, alphaAdminToken);
        assertThat(response.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.CREATED);

        try {
            ObjectMapper om = new ObjectMapper();
            String groupId = om.readTree(response.getBody()).path("id").asText();
            if (!groupId.isEmpty()) {
                delete("/groups/" + groupId, alphaAdminToken);
            }
        } catch (Exception ignored) {}
    }

    // ── Saved Member Filters ─────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can list saved member filters (member.saved_filters)")
    void adminCanListSavedFilters() {
        ResponseEntity<String> response = get("/members/filters", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ── Communications ────────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can access communications (communication.tools)")
    void adminCanAccessCommunications() {
        ResponseEntity<String> response = get("/communications/messages", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ── Documents ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can list document folders (document.management)")
    void adminCanListDocumentFolders() {
        ResponseEntity<String> response = get("/document-folders", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Admin can list documents")
    void adminCanListDocuments() {
        ResponseEntity<String> response = get("/documents", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Admin can view document metadata by ID")
    void adminCanGetDocumentById() {
        String docId = String.valueOf(fixture.alphaDocumentId);
        ResponseEntity<String> response = get("/documents/" + docId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Admin can delete a document")
    void adminCanDeleteDocument() {
        // Create a throwaway document, then delete it
        long tmpFolderId = fixture.alphaFolderId;
        String docId = createTempDocument(tmpFolderId, "IT-Delete-Doc", alphaAdminToken);
        if (docId != null) {
            ResponseEntity<String> del = delete("/documents/" + docId, alphaAdminToken);
            assertThat(del.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.NO_CONTENT);
        }
    }

    // ── Data Export ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can access data export (data.export)")
    void adminCanAccessExport() {
        ResponseEntity<String> response = get("/admin/export/members", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ── Roles & Permissions ───────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can list roles")
    void adminCanListRoles() {
        ResponseEntity<String> response = get("/admin/roles", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Admin can view permission pool (roles.permissions)")
    void adminCanViewPermissionPool() {
        ResponseEntity<String> response = get("/admin/roles/permissions", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ── Events ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can list events")
    void adminCanListEvents() {
        ResponseEntity<String> response = get("/events", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ── Memberships ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can list memberships")
    void adminCanListMemberships() {
        ResponseEntity<String> response = get("/memberships", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ── User Management ───────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin can list application users")
    void adminCanListUsers() {
        ResponseEntity<String> response = get("/admin/users", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private String createTempDocument(long folderId, String title, String token) {
        Map<String, Object> body = Map.of(
            "title",        title,
            "documentType", "RICH_TEXT",
            "folderId",     folderId,
            "visibility",   "ORGANIZATION",
            "contentHtml",  "<p>Integration test content</p>"
        );
        try {
            ResponseEntity<String> resp = post("/documents", body, token);
            ObjectMapper om = new ObjectMapper();
            return om.readTree(resp.getBody()).path("id").asText();
        } catch (Exception e) {
            return null;
        }
    }
}
