package com.mosque.crm.waha;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
import com.mosque.crm.service.WahaSettingsService;

import jakarta.annotation.PostConstruct;

/**
 * The only class that speaks the WAHA (WhatsApp HTTP API) protocol.
 *
 * Everything protocol-shaped lives here: endpoint paths, JSON field names and session states.
 * The base URL, API key and HTTP timeouts come from configuration, and every call takes an
 * explicit session — there is no "current session" inside the client, because the application
 * sends from several numbers and a hidden default is exactly how a message ends up leaving
 * from the wrong one.
 *
 * Calls are only made from the background worker, from admin actions and from the webhook
 * resolver — never from a bulk request path.
 */
@Service
public class WahaClient {

    private static final Logger log = LoggerFactory.getLogger(WahaClient.class);

    /** WAHA endpoints used by this application (protocol paths, defined once). */
    public static final class Path {
        public static final String SESSIONS = "/api/sessions";
        public static final String SESSIONS_ALL = SESSIONS + "?all=true";
        public static final String SEND_TEXT = "/api/sendText";
        /** Sends a document/image with an optional caption (Base64 or URL). */
        public static final String SEND_FILE = "/api/sendFile";
        public static final String START_TYPING = "/api/startTyping";
        public static final String STOP_TYPING = "/api/stopTyping";
        /** {@code GET /api/{session}/chats} — kept for the documented protocol surface. */
        public static final String CHATS = "/api/%s/chats";
        /** {@code GET /api/{session}/chats/{chatId}/messages}. */
        public static final String CHAT_MESSAGES = "/api/%s/chats/%s/messages";
        /** {@code GET /api/{session}/auth/qr} — the QR the operator scans to link a number. */
        public static final String AUTH_QR = "/api/%s/auth/qr";

        private Path() {
        }

        public static String session(String session) {
            return SESSIONS + "/" + session;
        }

        /**
         * The account's own jid. The short form {@code /api/{session}/me} answers 404 on WAHA,
         * so the {@code sessions/} segment is required.
         */
        public static String sessionMe(String session) {
            return SESSIONS + "/" + session + "/me";
        }
    }

    /** HTTP header names WAHA uses. */
    public static final class Header {
        /** Authentication header for every WAHA call. */
        public static final String API_KEY = "X-Api-Key";
        /** Header WAHA sends with each webhook delivery (the channel token). */
        public static final String WEBHOOK_TOKEN = "X-Webhook-Token";

        private Header() {
        }
    }

    /** JSON field names used in requests and responses. */
    public static final class Field {
        public static final String SESSION = "session";
        public static final String CHAT_ID = "chatId";
        public static final String TEXT = "text";
        public static final String FILE = "file";
        public static final String MIMETYPE = "mimetype";
        public static final String FILENAME = "filename";
        public static final String DATA = "data";
        public static final String CAPTION = "caption";
        public static final String NAME = "name";
        public static final String STATUS = "status";
        public static final String ME = "me";
        public static final String ID = "id";
        public static final String SERIALIZED = "_serialized";
        public static final String LINK_PREVIEW = "linkPreview";

        private Field() {
        }
    }

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

    // ─── connection ───────────────────────────────────────────────────────────

    public boolean isConfigured() {
        return settings.isConfigured();
    }

    /**
     * Every session WAHA knows about, with its live state and the number behind it.
     *
     * @throws WahaException when WAHA cannot be reached or does not answer with a JSON array —
     *                       callers must be able to tell "no sessions" from "not reachable".
     */
    public List<WahaSessionInfo> listSessions() {
        String baseUrl = settings.baseUrl();
        String apiKey = settings.apiKey();
        JsonNode body;
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url(baseUrl, Path.SESSIONS_ALL), HttpMethod.GET,
                    new HttpEntity<>(headers(apiKey)), JsonNode.class);
            body = response.getBody();
        } catch (HttpStatusCodeException e) {
            throw new WahaException("WAHA refused the session list (HTTP " + e.getStatusCode().value() + ")"
                    + hint(e), e.getStatusCode().value() >= 500, e);
        } catch (RestClientException e) {
            throw new WahaException("Could not reach WAHA: " + e.getMessage(), true, e);
        }
        List<WahaSessionInfo> sessions = new ArrayList<>();
        if (body == null || !body.isArray()) {
            return sessions;
        }
        for (JsonNode node : body) {
            String name = node.path(Field.NAME).asText(null);
            if (name == null || name.isBlank()) {
                continue;
            }
            sessions.add(new WahaSessionInfo(
                    name,
                    WahaSessionStatus.fromWire(node.path(Field.STATUS).asText(null)),
                    meIdOf(node.path(Field.ME))));
        }
        return sessions;
    }

    /** The session with this name, when WAHA reports it. */
    public Optional<WahaSessionInfo> findSession(String session) {
        if (session == null || session.isBlank()) {
            return Optional.empty();
        }
        return listSessions().stream()
                .filter(info -> info.name().equals(session.trim()))
                .findFirst();
    }

    /** Live state of one session; {@link WahaSessionStatus#UNREACHABLE} when WAHA is down. */
    public WahaSessionStatus status(String session) {
        if (!isConfigured() || session == null || session.isBlank()) {
            return WahaSessionStatus.NOT_CONFIGURED;
        }
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url(settings.baseUrl(), Path.session(session)),
                    HttpMethod.GET, new HttpEntity<>(headers(settings.apiKey())), JsonNode.class);
            JsonNode body = response.getBody();
            return WahaSessionStatus.fromWire(body == null ? null : body.path(Field.STATUS).asText(null));
        } catch (RestClientException e) {
            log.debug("Could not read the state of WAHA session '{}': {}", session, e.getMessage());
            return WahaSessionStatus.UNREACHABLE;
        }
    }

    /** Tests values that are not saved yet ("Test connection" in the settings screen). */
    public WahaSessionStatus testConnection(String baseUrl, String apiKey, String session) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return WahaSessionStatus.NOT_CONFIGURED;
        }
        if (session == null || session.isBlank()) {
            return WahaSessionStatus.UNKNOWN;
        }
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url(baseUrl, Path.session(session.trim())),
                    HttpMethod.GET, new HttpEntity<>(headers(apiKey)), JsonNode.class);
            JsonNode body = response.getBody();
            return WahaSessionStatus.fromWire(body == null ? null : body.path(Field.STATUS).asText(null));
        } catch (RestClientException e) {
            log.info("WAHA connection test failed: {}", e.getMessage());
            return WahaSessionStatus.UNREACHABLE;
        }
    }

    /**
     * The account WAHA reports for this session (its own jid), or {@code null}.
     * Display only — a channel is identified by its own id.
     */
    public String meId(String session) {
        if (!isConfigured() || session == null || session.isBlank()) {
            return null;
        }
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url(settings.baseUrl(), Path.sessionMe(session)),
                    HttpMethod.GET, new HttpEntity<>(headers(settings.apiKey())), JsonNode.class);
            return meIdOf(response.getBody());
        } catch (RestClientException e) {
            log.debug("Could not read the account of WAHA session '{}': {}", session, e.getMessage());
            return null;
        }
    }

    // ─── sending ──────────────────────────────────────────────────────────────

    /**
     * Sends a text message from an explicit session and returns WAHA's message id.
     *
     * @throws WahaException {@code retryable=false} for client errors (bad number, session not
     *                       working), {@code retryable=true} for transient ones.
     */
    public String sendText(String session, String chatId, String text) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(Field.SESSION, session);
        body.put(Field.CHAT_ID, chatId);
        body.put(Field.TEXT, text);
        body.put(Field.LINK_PREVIEW, Boolean.FALSE);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    url(settings.baseUrl(), Path.SEND_TEXT),
                    new HttpEntity<>(body, headers(settings.apiKey())),
                    JsonNode.class);
            return messageIdOf(response.getBody());
        } catch (HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            throw new WahaException("WAHA sendText failed with HTTP " + status + ": "
                    + shorten(e.getResponseBodyAsString()), status == 429 || status >= 500, e);
        } catch (RestClientException e) {
            throw new WahaException("WAHA sendText failed: " + e.getMessage(), true, e);
        }
    }

    /**
     * Sends a document (Base64 content) with an optional caption and returns WAHA's message id.
     *
     * @throws WahaException same contract as {@link #sendText(String, String, String)}.
     */
    public String sendFile(String session, String chatId, String filename, String mimetype,
                           String base64Data, String caption) {
        Map<String, Object> file = new LinkedHashMap<>();
        file.put(Field.MIMETYPE, mimetype);
        file.put(Field.FILENAME, filename);
        file.put(Field.DATA, base64Data);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put(Field.SESSION, session);
        body.put(Field.CHAT_ID, chatId);
        body.put(Field.FILE, file);
        if (caption != null && !caption.isBlank()) {
            body.put(Field.CAPTION, caption);
        }

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    url(settings.baseUrl(), Path.SEND_FILE),
                    new HttpEntity<>(body, headers(settings.apiKey())),
                    JsonNode.class);
            return messageIdOf(response.getBody());
        } catch (HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            throw new WahaException("WAHA sendFile failed with HTTP " + status + ": "
                    + shorten(e.getResponseBodyAsString()), status == 429 || status >= 500, e);
        } catch (RestClientException e) {
            throw new WahaException("WAHA sendFile failed: " + e.getMessage(), true, e);
        }
    }

    public void startTyping(String session, String chatId) {
        postTyping(Path.START_TYPING, session, chatId);
    }
    public void stopTyping(String session, String chatId) {
        postTyping(Path.STOP_TYPING, session, chatId);
    }

    /** Typing indicators are cosmetic — never fail a send because of them. */
    private void postTyping(String path, String session, String chatId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(Field.SESSION, session);
        body.put(Field.CHAT_ID, chatId);
        try {
            restTemplate.postForEntity(url(settings.baseUrl(), path),
                    new HttpEntity<>(body, headers(settings.apiKey())), String.class);
        } catch (RestClientException e) {
            log.debug("WAHA {} failed for session '{}' and {}: {}", path, session, chatId, e.getMessage());
        }
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private String messageIdOf(JsonNode body) {
        if (body == null || !body.hasNonNull(Field.ID)) {
            return null;
        }
        JsonNode id = body.get(Field.ID);
        if (id.isTextual()) {
            return id.asText();
        }
        if (id.hasNonNull(Field.SERIALIZED)) {
            return id.get(Field.SERIALIZED).asText();
        }
        return null;
    }

    private String meIdOf(JsonNode me) {
        if (me == null || me.isMissingNode() || me.isNull()) {
            return null;
        }
        if (me.isTextual()) {
            return me.asText();
        }
        JsonNode id = me.isObject() ? me.path(Field.ID) : me;
        return id.isTextual() && !id.asText().isBlank() ? id.asText() : null;
    }

    private HttpHeaders headers(String apiKey) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        if (apiKey != null && !apiKey.isBlank()) {
            headers.set(Header.API_KEY, apiKey);
        }
        return headers;
    }

    private String url(String baseUrl, String path) {
        String base = baseUrl == null ? "" : baseUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + path;
    }

    private String hint(HttpStatusCodeException e) {
        int status = e.getStatusCode().value();
        if (status == 401 || status == 403) {
            return " — check the API key";
        }
        return "";
    }

    private String shorten(String text) {
        if (text == null) {
            return "";
        }
        return text.length() > 400 ? text.substring(0, 400) + "…" : text;
    }
}
