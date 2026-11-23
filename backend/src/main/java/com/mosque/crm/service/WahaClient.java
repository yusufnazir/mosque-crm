package com.mosque.crm.service;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.mosque.crm.config.WahaProperties;

import jakarta.annotation.PostConstruct;

/**
 * Thin client for the WAHA (WhatsApp HTTP API) container.
 *
 * Only the endpoints needed by the dispatcher are wrapped. All calls are made from the
 * background worker — never from a request thread.
 */
@Service
public class WahaClient {

    private static final Logger log = LoggerFactory.getLogger(WahaClient.class);

    private final WahaProperties properties;
    private final WahaSettingsService settings;
    private RestTemplate restTemplate;

    public WahaClient(WahaProperties properties, WahaSettingsService settings) {
        this.properties = properties;
        this.settings = settings;
    }

    @PostConstruct
    void init() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(properties.getConnectTimeoutMillis()));
        factory.setReadTimeout(Duration.ofMillis(properties.getReadTimeoutMillis()));
        this.restTemplate = new RestTemplate(factory);
    }

    public boolean isConfigured() {
        return settings.isConfigured();
    }

    /** "WORKING", "SCAN_QR_CODE", "STOPPED", ... or "UNREACHABLE". */
    public String getSessionStatus() {
        return fetchSessionStatus(settings.baseUrl(), settings.apiKey(), settings.session());
    }

    /** Tests connection values that are not saved yet ("Test connection" button). */
    public String testConnection(String baseUrl, String apiKey, String session) {
        String effectiveSession = session == null || session.isBlank() ? "default" : session.trim();
        return fetchSessionStatus(baseUrl, apiKey, effectiveSession);
    }

    private String fetchSessionStatus(String baseUrl, String apiKey, String session) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "NOT_CONFIGURED";
        }
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url(baseUrl, "/api/sessions/" + session),
                    HttpMethod.GET,
                    new HttpEntity<>(headers(apiKey)),
                    JsonNode.class);
            JsonNode body = response.getBody();
            if (body != null && body.hasNonNull("status")) {
                return body.get("status").asText();
            }
            return "UNKNOWN";
        } catch (RestClientException e) {
            log.warn("Could not read WAHA session status: {}", e.getMessage());
            return "UNREACHABLE";
        }
    }

    public void startTyping(String chatId) {
        post("/api/startTyping", chatId);
    }

    public void stopTyping(String chatId) {
        post("/api/stopTyping", chatId);
    }

    /**
     * Sends the text and returns WAHA's message id (may be null when WAHA does not echo it).
     *
     * @throws WahaException with {@code retryable=false} for client errors (bad number,
     *                       session not working) and {@code retryable=true} for transient ones.
     */
    public String sendText(String chatId, String text) {
        Map<String, Object> body = baseBody();
        body.put("chatId", chatId);
        body.put("text", text);
        // Ask WAHA to show "typing…" itself as well; harmless when unsupported.
        body.put("linkPreview", false);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    url(settings.baseUrl(), "/api/sendText"),
                    new HttpEntity<>(body, headers(settings.apiKey())),
                    JsonNode.class);

            JsonNode responseBody = response.getBody();
            if (responseBody != null && responseBody.hasNonNull("id")) {
                JsonNode id = responseBody.get("id");
                if (id.isTextual()) {
                    return id.asText();
                }
                if (id.hasNonNull("_serialized")) {
                    return id.get("_serialized").asText();
                }
            }
            return null;
        } catch (HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            boolean retryable = status == 429 || status >= 500;
            throw new WahaException("WAHA sendText failed with HTTP " + status + ": " + shorten(e.getResponseBodyAsString()),
                    retryable, e);
        } catch (RestClientException e) {
            throw new WahaException("WAHA sendText failed: " + e.getMessage(), true, e);
        }
    }

    private void post(String path, String chatId) {
        Map<String, Object> body = baseBody();
        body.put("chatId", chatId);
        try {
            restTemplate.postForEntity(url(settings.baseUrl(), path),
                    new HttpEntity<>(body, headers(settings.apiKey())), String.class);
        } catch (RestClientException e) {
            // Typing indicators are cosmetic — never fail a send because of them.
            log.debug("WAHA {} failed for {}: {}", path, chatId, e.getMessage());
        }
    }

    /** "+31612345678" -> "31612345678@c.us" */
    public static String toChatId(String phoneE164) {
        String digits = phoneE164 == null ? "" : phoneE164.replaceAll("[^0-9]", "");
        return digits + "@c.us";
    }

    private Map<String, Object> baseBody() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("session", settings.session());
        return body;
    }

    private HttpHeaders headers(String apiKey) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
        if (apiKey != null && !apiKey.isBlank()) {
            headers.set("X-Api-Key", apiKey);
        }
        return headers;
    }

    private String url(String baseUrl, String path) {
        String base = baseUrl == null ? "" : baseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + path;
    }

    private String shorten(String text) {
        if (text == null) {
            return "";
        }
        return text.length() > 400 ? text.substring(0, 400) + "…" : text;
    }

    /** Signals a WAHA failure; {@code retryable} drives whether the queue retries the message. */
    public static class WahaException extends RuntimeException {

        private final boolean retryable;

        public WahaException(String message, boolean retryable, Throwable cause) {
            super(message, cause);
            this.retryable = retryable;
        }

        public boolean isRetryable() {
            return retryable;
        }
    }
}
