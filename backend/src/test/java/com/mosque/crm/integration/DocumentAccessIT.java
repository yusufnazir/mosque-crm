package com.mosque.crm.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Document access control tests.
 *
 * Covers:
 *  - Admin full CRUD on folders and documents (metadata only — no file bytes, no Minio).
 *  - Member: can view/share but cannot delete folders or documents.
 *  - Cross-tenant: Alpha can never see Beta's documents (404 from Hibernate filter).
 *
 * Note: documents inserted by TestTenantFixture have document_type=RICH_TEXT,
 * file_size=0, storage_key=null — no Minio server is needed.
 */
@DisplayName("Document Access Control")
class DocumentAccessIT extends BaseIT {

    private final ObjectMapper om = new ObjectMapper();

    // ── Admin CRUD on document folders ────────────────────────────────────────

    @Test
    @DisplayName("Admin can create a document folder")
    void adminCanCreateFolder() throws Exception {
        Map<String, Object> body = Map.of(
            "name",       "IT-Folder-Create-Test",
            "visibility", "ORGANIZATION"
        );
        ResponseEntity<String> response = post("/document-folders", body, alphaAdminToken);
        assertThat(response.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.CREATED);

        String id = om.readTree(response.getBody()).path("id").asText();
        if (!id.isEmpty()) {
            delete("/document-folders/" + id, alphaAdminToken);
        }
    }

    @Test
    @DisplayName("Admin can view a folder by ID")
    void adminCanViewFolder() {
        String folderId = String.valueOf(fixture.alphaFolderId);
        ResponseEntity<String> response = get("/document-folders/" + folderId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Admin can delete a document folder")
    void adminCanDeleteFolder() throws Exception {
        // Create a throwaway folder then delete it
        Map<String, Object> body = Map.of("name", "IT-Folder-Delete-Test", "visibility", "ORGANIZATION");
        ResponseEntity<String> create = post("/document-folders", body, alphaAdminToken);
        String id = om.readTree(create.getBody()).path("id").asText();
        if (!id.isEmpty()) {
            ResponseEntity<String> del = delete("/document-folders/" + id, alphaAdminToken);
            assertThat(del.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.NO_CONTENT);
        }
    }

    // ── Admin CRUD on documents ───────────────────────────────────────────────

    @Test
    @DisplayName("Admin can create a document (RICH_TEXT, no file upload required)")
    void adminCanCreateDocument() throws Exception {
        Map<String, Object> body = Map.of(
            "title",        "IT-Doc-Create-Test",
            "documentType", "RICH_TEXT",
            "folderId",     fixture.alphaFolderId,
            "visibility",   "ORGANIZATION",
            "contentHtml",  "<p>Integration test content</p>"
        );
        ResponseEntity<String> response = post("/documents", body, alphaAdminToken);
        assertThat(response.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.CREATED);

        String id = om.readTree(response.getBody()).path("id").asText();
        if (!id.isEmpty()) {
            delete("/documents/" + id, alphaAdminToken);
        }
    }

    @Test
    @DisplayName("Admin can read an existing document by ID")
    void adminCanReadDocumentById() {
        String docId = String.valueOf(fixture.alphaDocumentId);
        ResponseEntity<String> response = get("/documents/" + docId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Admin can list documents")
    void adminCanListDocuments() {
        ResponseEntity<String> response = get("/documents", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Admin can delete a document")
    void adminCanDeleteDocument() throws Exception {
        Map<String, Object> body = Map.of(
            "title", "IT-Doc-To-Delete", "documentType", "RICH_TEXT",
            "folderId", fixture.alphaFolderId, "visibility", "ORGANIZATION"
        );
        ResponseEntity<String> create = post("/documents", body, alphaAdminToken);
        String id = om.readTree(create.getBody()).path("id").asText();
        if (!id.isEmpty()) {
            ResponseEntity<String> del = delete("/documents/" + id, alphaAdminToken);
            assertThat(del.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.NO_CONTENT);
        }
    }

    // ── Member document permissions ───────────────────────────────────────────

    @Test
    @DisplayName("Member can list documents (document.view)")
    void memberCanListDocuments() {
        ResponseEntity<String> response = get("/documents", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Member can view a document by ID (document.view)")
    void memberCanViewDocumentById() {
        String docId = String.valueOf(fixture.alphaDocumentId);
        ResponseEntity<String> response = get("/documents/" + docId, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Member can list document folders (document.view)")
    void memberCanListFolders() {
        ResponseEntity<String> response = get("/document-folders", alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Member cannot delete a document (document.manage required)")
    void memberCannotDeleteDocument() {
        String docId = String.valueOf(fixture.alphaDocumentId);
        ResponseEntity<String> response = delete("/documents/" + docId, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot delete a document folder (document.manage required)")
    void memberCannotDeleteFolder() {
        String folderId = String.valueOf(fixture.alphaFolderId);
        ResponseEntity<String> response = delete("/document-folders/" + folderId, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Member cannot create a document folder (document.manage required)")
    void memberCannotCreateFolder() {
        Map<String, Object> body = Map.of("name", "Unauthorized Folder", "visibility", "ORGANIZATION");
        ResponseEntity<String> response = post("/document-folders", body, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ── Cross-tenant document isolation ───────────────────────────────────────

    @Test
    @DisplayName("Alpha admin cannot access Beta document (returns 404)")
    void alphaCannotAccessBetaDocument() {
        String betaDocId = String.valueOf(fixture.betaDocumentId);
        ResponseEntity<String> response = get("/documents/" + betaDocId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Beta admin cannot access Alpha document (returns 404)")
    void betaCannotAccessAlphaDocument() {
        String alphaDocId = String.valueOf(fixture.alphaDocumentId);
        ResponseEntity<String> response = get("/documents/" + alphaDocId, betaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Alpha member cannot access Beta document (returns 404)")
    void alphaMemberCannotAccessBetaDocument() {
        String betaDocId = String.valueOf(fixture.betaDocumentId);
        ResponseEntity<String> response = get("/documents/" + betaDocId, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Alpha admin cannot delete Beta document (returns 404)")
    void alphaCannotDeleteBetaDocument() {
        String betaDocId = String.valueOf(fixture.betaDocumentId);
        ResponseEntity<String> response = delete("/documents/" + betaDocId, alphaAdminToken);
        // 404 means the Hibernate filter hid the entity entirely — better than 403
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
