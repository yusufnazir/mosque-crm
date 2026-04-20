package com.mosque.crm.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Multi-tenancy isolation tests.
 *
 * Principle: every data-bearing entity has an organization_id column.
 * The Hibernate "organizationFilter" is applied per-request using the
 * organizationId claim embedded in the JWT.  A user from Tenant Alpha must
 * never see, modify, or delete data that belongs to Tenant Beta, and vice versa.
 *
 * Test strategy:
 *  - All test IDs (persons, documents, groups) are set up in TestTenantFixture
 *    with known organization_id values.
 *  - Alpha admin / member attempts to access Beta entity IDs → 404 (hidden by filter).
 *  - Beta admin / member attempts to access Alpha entity IDs → 404.
 *  - List endpoints return only own-tenant records (IDs of the other tenant absent).
 */
@DisplayName("Multi-Tenancy Isolation")
class MultiTenancyIT extends BaseIT {

    private final ObjectMapper om = new ObjectMapper();

    // ── Cross-tenant person access ─────────────────────────────────────────────

    @Test
    @DisplayName("Alpha admin cannot read Beta person by ID (returns 404)")
    void alphaAdminCannotReadBetaPerson() {
        String betaPersonId = String.valueOf(fixture.betaPersonId);
        ResponseEntity<String> response = get("/persons/" + betaPersonId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Beta admin cannot read Alpha person by ID (returns 404)")
    void betaAdminCannotReadAlphaPerson() {
        String alphaPersonId = String.valueOf(fixture.alphaPersonId);
        ResponseEntity<String> response = get("/persons/" + alphaPersonId, betaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Alpha admin person list does not contain Beta persons")
    void alphaPersonListExcludesBetaPersons() throws Exception {
        ResponseEntity<String> response = get("/persons", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        JsonNode body = om.readTree(response.getBody());
        JsonNode items = body.isArray() ? body : body.path("content");

        String betaP1 = String.valueOf(fixture.betaPersonId);
        String betaP2 = String.valueOf(fixture.betaPersonId2);
        items.forEach(node -> {
            String id = node.path("id").asText();
            assertThat(id).isNotEqualTo(betaP1).isNotEqualTo(betaP2);
        });
    }

    @Test
    @DisplayName("Beta admin person list does not contain Alpha persons")
    void betaPersonListExcludesAlphaPersons() throws Exception {
        ResponseEntity<String> response = get("/persons", betaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        JsonNode body = om.readTree(response.getBody());
        JsonNode items = body.isArray() ? body : body.path("content");

        String alphaP1 = String.valueOf(fixture.alphaPersonId);
        String alphaP2 = String.valueOf(fixture.alphaPersonId2);
        items.forEach(node -> {
            String id = node.path("id").asText();
            assertThat(id).isNotEqualTo(alphaP1).isNotEqualTo(alphaP2);
        });
    }

    // ── Cross-tenant document access ──────────────────────────────────────────

    @Test
    @DisplayName("Alpha admin cannot read Beta document by ID (returns 404)")
    void alphaAdminCannotReadBetaDocument() {
        String betaDocId = String.valueOf(fixture.betaDocumentId);
        ResponseEntity<String> response = get("/documents/" + betaDocId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Beta admin cannot read Alpha document by ID (returns 404)")
    void betaAdminCannotReadAlphaDocument() {
        String alphaDocId = String.valueOf(fixture.alphaDocumentId);
        ResponseEntity<String> response = get("/documents/" + alphaDocId, betaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Alpha admin cannot read Beta document folder by ID (returns 404)")
    void alphaAdminCannotReadBetaFolder() {
        String betaFolderId = String.valueOf(fixture.betaFolderId);
        ResponseEntity<String> response = get("/document-folders/" + betaFolderId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Alpha member cannot read Beta document (returns 404)")
    void alphaMemberCannotReadBetaDocument() {
        String betaDocId = String.valueOf(fixture.betaDocumentId);
        ResponseEntity<String> response = get("/documents/" + betaDocId, alphaMemberToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Alpha document list does not contain Beta documents")
    void alphaDocumentListExcludesBeta() throws Exception {
        ResponseEntity<String> response = get("/documents", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        JsonNode body = om.readTree(response.getBody());
        JsonNode items = body.isArray() ? body : body.path("content");

        String betaDocId = String.valueOf(fixture.betaDocumentId);
        items.forEach(node ->
            assertThat(node.path("id").asText()).isNotEqualTo(betaDocId)
        );
    }

    // ── Cross-tenant group access ─────────────────────────────────────────────

    @Test
    @DisplayName("Alpha admin cannot read Beta group by ID (returns 404)")
    void alphaAdminCannotReadBetaGroup() {
        ResponseEntity<String> response = get("/groups/" + fixture.betaGroupId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Alpha group list does not contain Beta groups")
    void alphaGroupListExcludesBeta() throws Exception {
        ResponseEntity<String> response = get("/groups", alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        JsonNode body = om.readTree(response.getBody());
        JsonNode items = body.isArray() ? body : body.path("content");

        String betaGroupId = String.valueOf(fixture.betaGroupId);
        items.forEach(node ->
            assertThat(node.path("id").asText()).isNotEqualTo(betaGroupId)
        );
    }

    // ── Cross-tenant write attempt ────────────────────────────────────────────

    @Test
    @DisplayName("Alpha admin cannot delete Beta document (returns 404, not 403)")
    void alphaAdminCannotDeleteBetaDocument() {
        // 404 means the filter hid the entity; a 403 would imply it was visible but forbidden.
        // 404 is the safer response — it reveals nothing about cross-tenant existence.
        String betaDocId = String.valueOf(fixture.betaDocumentId);
        ResponseEntity<String> response = delete("/documents/" + betaDocId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Alpha admin cannot delete Beta person (returns 404)")
    void alphaAdminCannotDeleteBetaPerson() {
        String betaPersonId = String.valueOf(fixture.betaPersonId);
        ResponseEntity<String> response = delete("/persons/" + betaPersonId, alphaAdminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
