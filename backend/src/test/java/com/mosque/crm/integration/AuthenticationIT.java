package com.mosque.crm.integration;

import com.mosque.crm.integration.fixtures.TestTenantFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Authentication endpoint contract tests.
 *
 * Verifies: valid credentials → 200 + token, bad credentials → 401,
 * unknown user → 401 (no user-enumeration), unauthenticated request → 401/403.
 */
@DisplayName("Authentication")
class AuthenticationIT extends BaseIT {

    @Test
    @DisplayName("Admin login returns 200 and a JWT token")
    void adminLoginSucceeds() {
        Map<String, String> creds = Map.of("username", "test_alpha_admin", "password", TestTenantFixture.TEST_PASSWORD);
        ResponseEntity<Map> response = restTemplate.postForEntity(url("/auth/login"), creds, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsKey("token");
        assertThat((String) response.getBody().get("token")).isNotBlank();
    }

    @Test
    @DisplayName("Member login returns 200 and a JWT token")
    void memberLoginSucceeds() {
        Map<String, String> creds = Map.of("username", "test_alpha_member", "password", TestTenantFixture.TEST_PASSWORD);
        ResponseEntity<Map> response = restTemplate.postForEntity(url("/auth/login"), creds, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsKey("token");
    }

    @Test
    @DisplayName("Wrong password returns 401 — does not reveal whether username exists")
    void wrongPasswordReturns401() {
        Map<String, String> creds = Map.of("username", "test_alpha_admin", "password", "WrongPassword!");
        ResponseEntity<Map> response = restTemplate.postForEntity(url("/auth/login"), creds, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        // Error code must be generic — no hint about which field was wrong (OWASP)
        assertThat((String) response.getBody().get("code")).isEqualTo("invalid_credentials");
    }

    @Test
    @DisplayName("Unknown username returns 401 — same error as bad password (no enumeration)")
    void unknownUsernameReturns401() {
        Map<String, String> creds = Map.of("username", "nobody_9999", "password", "anything");
        ResponseEntity<Map> response = restTemplate.postForEntity(url("/auth/login"), creds, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat((String) response.getBody().get("code")).isEqualTo("invalid_credentials");
    }

    @Test
    @DisplayName("Request to protected endpoint without token returns 401 or 403")
    void noTokenReturnsUnauthorized() {
        // No Authorization header
        ResponseEntity<String> response = restTemplate.getForEntity(url("/persons"), String.class);
        assertThat(response.getStatusCode().value()).isIn(401, 403);
    }

    @Test
    @DisplayName("Login response contains role, organizationId, and permissions list")
    void loginResponseStructureIsComplete() {
        Map<String, String> creds = Map.of("username", "test_alpha_admin", "password", TestTenantFixture.TEST_PASSWORD);
        ResponseEntity<Map> response = restTemplate.postForEntity(url("/auth/login"), creds, Map.class);

        assertThat(response.getBody())
            .containsKey("token")
            .containsKey("role")
            .containsKey("organizationId")
            .containsKey("permissions");
        assertThat((String) response.getBody().get("role")).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("Tokens from different tenants contain different organizationIds")
    void tokensAreOrganizationScoped() {
        Map<String, String> alphaCreds = Map.of("username", "test_alpha_admin", "password", TestTenantFixture.TEST_PASSWORD);
        Map<String, String> betaCreds  = Map.of("username", "test_beta_admin",  "password", TestTenantFixture.TEST_PASSWORD);

        ResponseEntity<Map> alphaResp = restTemplate.postForEntity(url("/auth/login"), alphaCreds, Map.class);
        ResponseEntity<Map> betaResp  = restTemplate.postForEntity(url("/auth/login"), betaCreds, Map.class);

        Object alphaOrgId = alphaResp.getBody().get("organizationId");
        Object betaOrgId  = betaResp.getBody().get("organizationId");

        assertThat(alphaOrgId).isNotNull().isNotEqualTo(betaOrgId);
    }
}
