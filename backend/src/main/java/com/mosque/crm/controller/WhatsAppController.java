package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.mosque.crm.dto.WhatsAppChannelDTO;
import com.mosque.crm.dto.WhatsAppChannelRequest;
import com.mosque.crm.dto.WhatsAppEnqueueRequest;
import com.mosque.crm.dto.WhatsAppEnqueueResultDTO;
import com.mosque.crm.dto.WhatsAppMessageDTO;
import com.mosque.crm.dto.WhatsAppOptOutDTO;
import com.mosque.crm.dto.WhatsAppStatsDTO;
import com.mosque.crm.dto.WahaSettingsDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.WhatsAppChannel;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.WahaSettingsService;
import com.mosque.crm.service.WhatsAppChannelService;
import com.mosque.crm.service.WhatsAppOutboundService;
import com.mosque.crm.service.WhatsAppWebhookService;
import com.mosque.crm.waha.WahaClient;
import com.mosque.crm.waha.WahaException;
import com.mosque.crm.waha.WahaSessionInfo;
import com.mosque.crm.waha.WahaSessionStatus;

/**
 * WhatsApp (WAHA) endpoints.
 *
 * Admins only ever touch the queue and the channel list here — sending happens in the
 * background worker, so no campaign endpoint fires a WhatsApp API call synchronously. The single
 * exception is the per-channel "test send", which exists precisely to try one number.
 */
@RestController
@RequestMapping("/whatsapp")
public class WhatsAppController {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppController.class);

    private final WhatsAppOutboundService outboundService;
    private final WhatsAppWebhookService webhookService;
    private final WhatsAppChannelService channelService;
    private final WahaClient wahaClient;
    private final WahaSettingsService wahaSettingsService;
    private final AuthorizationService authorizationService;

    public WhatsAppController(WhatsAppOutboundService outboundService,
                              WhatsAppWebhookService webhookService,
                              WhatsAppChannelService channelService,
                              WahaClient wahaClient,
                              WahaSettingsService wahaSettingsService,
                              AuthorizationService authorizationService) {
        this.outboundService = outboundService;
        this.webhookService = webhookService;
        this.channelService = channelService;
        this.wahaClient = wahaClient;
        this.wahaSettingsService = wahaSettingsService;
        this.authorizationService = authorizationService;
    }

    // ==================== Public webhook ====================

    /**
     * Receives WAHA events (inbound replies).
     *
     * Authentication is per channel: the event is routed to the channel that received it
     * ({@code session}, else {@code me.id}) and the token must match that channel's own token
     * (or the global secret when the channel has none). An event for an unknown or disabled
     * channel is refused with a 4xx and nothing is written — a reply that cannot be attributed
     * must not end up in someone else's thread.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(
            @RequestHeader(value = WahaClient.Header.WEBHOOK_TOKEN, required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken,
            @RequestBody(required = false) JsonNode event) {

        Optional<WhatsAppChannel> resolved = webhookService.resolveChannel(event);
        if (resolved.isEmpty()) {
            log.warn("WAHA webhook rejected: the payload names no known channel");
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "UNKNOWN_SESSION",
                    "error", "The payload does not name a configured WhatsApp channel."));
        }
        WhatsAppChannel channel = resolved.get();

        if (!webhookService.isWebhookConfigured(channel)) {
            log.error("WAHA webhook called for channel '{}' but no webhook secret is configured — refusing events",
                    channel.getLabel());
            return ResponseEntity.status(503).body(Map.of("error", "WhatsApp webhook is not configured."));
        }
        if (!channel.isEnabled()) {
            log.warn("WAHA webhook rejected: channel '{}' is disabled", channel.getLabel());
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "CHANNEL_DISABLED",
                    "error", "The WhatsApp channel for this event is disabled."));
        }

        String presented = headerToken != null && !headerToken.isBlank() ? headerToken : queryToken;
        if (!webhookService.isAuthorized(channel, presented)) {
            log.warn("WAHA webhook rejected: invalid token for channel '{}'", channel.getLabel());
            return ResponseEntity.status(403).body(Map.of("error", "Invalid webhook token."));
        }

        try {
            webhookService.handleEvent(event, channel);
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (Exception e) {
            // Always acknowledge, otherwise WAHA retries the same event forever
            log.error("Failed to process WAHA webhook event: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("status", "ignored"));
        }
    }

    // ==================== Admin ====================

    @GetMapping("/stats")
    public ResponseEntity<WhatsAppStatsDTO> stats() {
        return ResponseEntity.ok(outboundService.stats());
    }

    /** State of the default number (older clients); per-number state is in {@code /stats}. */
    @GetMapping("/session")
    public ResponseEntity<Map<String, String>> session() {
        Map<String, String> result = new HashMap<>();
        WhatsAppSessionState state = defaultSessionState();
        result.put("status", state.status().name());
        result.put("session", state.session());
        return ResponseEntity.ok(result);
    }

    private record WhatsAppSessionState(String session, WahaSessionStatus status) {
    }

    private WhatsAppSessionState defaultSessionState() {
        Optional<WhatsAppChannel> channel = channelService.defaultChannel();
        if (channel.isEmpty()) {
            return new WhatsAppSessionState(wahaSettingsService.session(), WahaSessionStatus.NOT_CONFIGURED);
        }
        String session = channel.get().getWahaSession();
        return new WhatsAppSessionState(session, wahaClient.status(session));
    }

    // ==================== Channels (one row per number) ====================

    @GetMapping("/channels")
    public ResponseEntity<List<WhatsAppChannelDTO>> channels() {
        return ResponseEntity.ok(channelService.list());
    }

    /** Sessions WAHA reports right now, for the "add channel" dropdown. */
    @GetMapping("/channels/available-sessions")
    public ResponseEntity<?> availableSessions() {
        try {
            List<WahaSessionInfo> sessions = channelService.availableSessions();
            List<Map<String, String>> payload = sessions.stream()
                    .map(session -> Map.of(
                            "name", session.name(),
                            "status", session.status().name(),
                            "meId", session.meId() == null ? "" : session.meId()))
                    .toList();
            return ResponseEntity.ok(payload);
        } catch (WahaException e) {
            return ResponseEntity.status(502).body(Map.of(
                    "code", "WAHA_UNREACHABLE",
                    "error", e.getMessage()));
        }
    }

    @GetMapping("/channels/{id}")
    public ResponseEntity<?> channel(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(channelService.get(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/channels")
    public ResponseEntity<?> createChannel(@RequestBody WhatsAppChannelRequest request) {
        try {
            return ResponseEntity.ok(channelService.create(request));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    @PutMapping("/channels/{id}")
    public ResponseEntity<?> updateChannel(@PathVariable Long id, @RequestBody WhatsAppChannelRequest request) {
        try {
            return ResponseEntity.ok(channelService.update(id, request));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    @PostMapping("/channels/{id}/default")
    public ResponseEntity<?> setDefaultChannel(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(channelService.setDefault(id));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    /** Issues a new webhook secret for this channel; register the new value on the WAHA host. */
    @PostMapping("/channels/{id}/token")
    public ResponseEntity<?> rotateChannelToken(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(channelService.rotateToken(id));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    @DeleteMapping("/channels/{id}")
    public ResponseEntity<?> deleteChannel(@PathVariable Long id) {
        try {
            channelService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }

    /** Sends one message immediately from this number, to prove the number works. */
    @PostMapping("/channels/{id}/test")
    public ResponseEntity<?> testChannel(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String phone = body == null ? null : body.get("phone");
        String text = body == null ? null : body.get("text");
        try {
            String waMessageId = channelService.testSend(id, phone, text);
            return ResponseEntity.ok(Map.of("status", "sent",
                    "waMessageId", waMessageId == null ? "" : waMessageId));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        } catch (WahaException e) {
            return ResponseEntity.status(e.isRetryable() ? 502 : 400).body(Map.of(
                    "code", e.isRetryable() ? "WAHA_UNAVAILABLE" : "WAHA_REJECTED",
                    "error", e.getMessage()));
        }
    }

    /**
     * The exact payload to PUT on the WAHA host to register this channel's webhook.
     * Read-only: the application never pushes session configuration to WAHA by itself, because
     * that restarts the session.
     */
    @GetMapping("/channels/{id}/webhook-config")
    public ResponseEntity<?> channelWebhookConfig(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(channelService.webhookConfig(id));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    private ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    // ==================== Connection settings (global Settings → WAHA) ====================

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings() {
        if (!authorizationService.hasPermission("settings.manage")) {
            return forbidden();
        }
        WahaSettingsDTO dto = wahaSettingsService.toDTO();
        dto.setSessionStatus(defaultSessionState().status().name());
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/settings")
    public ResponseEntity<?> saveSettings(@RequestBody WahaSettingsDTO dto) {
        if (!authorizationService.hasPermission("settings.manage")) {
            return forbidden();
        }
        try {
            WahaSettingsDTO saved = wahaSettingsService.save(dto);
            saved.setSessionStatus(defaultSessionState().status().name());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /** Tests values from the form without saving them. */
    @PostMapping("/settings/test")
    public ResponseEntity<?> testSettings(@RequestBody(required = false) WahaSettingsDTO dto) {
        if (!authorizationService.hasPermission("settings.manage")) {
            return forbidden();
        }
        String baseUrl = dto != null && dto.getBaseUrl() != null && !dto.getBaseUrl().isBlank()
                ? dto.getBaseUrl()
                : wahaSettingsService.baseUrl();
        String apiKey = dto != null && dto.getApiKey() != null && !dto.getApiKey().isBlank()
                ? dto.getApiKey()
                : wahaSettingsService.apiKey();
        String session = dto != null && dto.getSession() != null && !dto.getSession().isBlank()
                ? dto.getSession()
                : defaultSessionState().session();

        WahaSessionStatus status = wahaClient.testConnection(baseUrl, apiKey, session);
        Map<String, String> result = new HashMap<>();
        result.put("status", status.name());
        result.put("message", switch (status) {
            case WORKING -> "Connected — the WhatsApp session is working.";
            case SCAN_QR_CODE -> "Reachable, but the session needs a QR scan in WAHA.";
            case STARTING -> "Reachable — the session is starting.";
            case STOPPED -> "Reachable, but the session is stopped. Start it in WAHA.";
            case FAILED -> "WAHA reports a failure for this session.";
            case NOT_CONFIGURED -> "Enter a base URL first.";
            case UNREACHABLE -> "Could not reach WAHA at this URL. Check the URL, the container and the port.";
            default -> "WAHA answered with status " + status.name() + ".";
        });
        return ResponseEntity.ok(result);
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        Map<String, String> error = new HashMap<>();
        error.put("error", "You need the settings.manage permission to change the WhatsApp connection.");
        return ResponseEntity.status(403).body(error);
    }

    @GetMapping("/messages")
    public ResponseEntity<Page<WhatsAppMessageDTO>> messages(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String campaignId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        return ResponseEntity.ok(outboundService.list(status, campaignId, PageRequest.of(Math.max(page, 0), safeSize)));
    }

    /** Queues a campaign. Nothing is sent from this request. */
    @PostMapping("/messages")
    public ResponseEntity<?> enqueue(@RequestBody WhatsAppEnqueueRequest request) {
        try {
            User user = authorizationService.getCurrentUser();
            WhatsAppEnqueueResultDTO result = outboundService.enqueue(request, user == null ? null : user.getId());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException | IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/messages/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(outboundService.cancel(id));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(409).body(error);
        }
    }

    @DeleteMapping("/messages/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id) {
        try {
            outboundService.deleteMessage(id);
            return ResponseEntity.noContent().build();
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage(), "code", "MESSAGE_SENDING"));
        }
    }

    @GetMapping("/opt-outs")
    public ResponseEntity<List<WhatsAppOptOutDTO>> optOuts() {
        return ResponseEntity.ok(outboundService.listOptOuts());
    }

    @PostMapping("/opt-outs")
    public ResponseEntity<?> addOptOut(@RequestBody Map<String, String> body) {
        try {
            String phone = body.get("phone");
            String reason = body.get("reason");
            Long channelId = body.get("channelId") == null || body.get("channelId").isBlank()
                    ? null
                    : Long.valueOf(body.get("channelId").trim());
            return ResponseEntity.ok(outboundService.addOptOut(phone, channelId, reason));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    @DeleteMapping("/opt-outs/{id}")
    public ResponseEntity<Void> removeOptOut(@PathVariable Long id) {
        outboundService.removeOptOut(id);
        return ResponseEntity.noContent().build();
    }
}
