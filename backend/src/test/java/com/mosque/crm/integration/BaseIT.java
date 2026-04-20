package com.mosque.crm.integration;

import java.util.Map;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import com.mosque.crm.integration.fixtures.TestTenantFixture;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Base class for all integration tests.
 *
 * Lifecycle (PER_CLASS so @BeforeAll/@AfterAll can use instance fields):
 *  1. setupFixtures() — create two Pro tenants + one Starter tenant in the real DB
 *  2. Tests run
 *  3. tearDownFixtures() — delete all test data in reverse order
 *
 * Token helpers:
 *   authHeaders(token)          → HttpHeaders with Authorization: Bearer
 *   login(username, password)   → JWT string
 *   get(url, token)             → ResponseEntity<String>
 *   post(url, body, token)      → ResponseEntity<String>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public abstract class BaseIT {

    @LocalServerPort
    protected int port;

    @Autowired
    protected TestTenantFixture fixture;

    @Autowired
    protected TestRestTemplate restTemplate;

    // Tokens obtained once per class (re-used across test methods)
    protected String alphaAdminToken;
    protected String alphaMemberToken;
    protected String betaAdminToken;
    protected String betaMemberToken;
    protected String starterAdminToken;

    // ─────────────────────────────────────────────────────────────────────────
    //  Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    @BeforeAll
    void setupFixtures() {
        fixture.setupAll();

        alphaAdminToken   = login("test_alpha_admin",   TestTenantFixture.TEST_PASSWORD);
        alphaMemberToken  = login("test_alpha_member",  TestTenantFixture.TEST_PASSWORD);
        betaAdminToken    = login("test_beta_admin",    TestTenantFixture.TEST_PASSWORD);
        betaMemberToken   = login("test_beta_member",   TestTenantFixture.TEST_PASSWORD);
        starterAdminToken = login("test_starter_admin", TestTenantFixture.TEST_PASSWORD);
    }

    @AfterAll
    void tearDownFixtures() {
        fixture.cleanupAll();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HTTP helpers
    // ─────────────────────────────────────────────────────────────────────────

    protected String login(String username, String password) {
        Map<String, String> body = Map.of("username", username, "password", password);
        ResponseEntity<Map> response = restTemplate.postForEntity(url("/auth/login"), body, Map.class);
        assertThat(response.getStatusCode())
            .as("Login for %s should succeed", username)
            .isEqualTo(HttpStatus.OK);
        String token = (String) response.getBody().get("token");
        assertThat(token).as("JWT token for %s must not be null", username).isNotNull();
        return token;
    }

    protected HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    protected ResponseEntity<String> get(String path, String token) {
        HttpEntity<Void> entity = new HttpEntity<>(authHeaders(token));
        return restTemplate.exchange(url(path), HttpMethod.GET, entity, String.class);
    }

    protected ResponseEntity<String> post(String path, Object body, String token) {
        HttpEntity<Object> entity = new HttpEntity<>(body, authHeaders(token));
        return restTemplate.exchange(url(path), HttpMethod.POST, entity, String.class);
    }

    protected ResponseEntity<String> put(String path, Object body, String token) {
        HttpEntity<Object> entity = new HttpEntity<>(body, authHeaders(token));
        return restTemplate.exchange(url(path), HttpMethod.PUT, entity, String.class);
    }

    protected ResponseEntity<String> delete(String path, String token) {
        HttpEntity<Void> entity = new HttpEntity<>(authHeaders(token));
        return restTemplate.exchange(url(path), HttpMethod.DELETE, entity, String.class);
    }

    protected String url(String path) {
        return "http://localhost:" + port + "/api" + path;
    }
}
