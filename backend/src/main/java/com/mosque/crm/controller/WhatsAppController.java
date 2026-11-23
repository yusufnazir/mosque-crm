package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
import com.mosque.crm.dto.WhatsAppEnqueueRequest;
import com.mosque.crm.dto.WhatsAppEnqueueResultDTO;
import com.mosque.crm.dto.WhatsAppMessageDTO;
import com.mosque.crm.dto.WhatsAppOptOutDTO;
import com.mosque.crm.dto.WhatsAppStatsDTO;
import com.mosque.crm.dto.WahaSettingsDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.WahaClient;
import com.mosque.crm.service.WahaSettingsService;
import com.mosque.crm.service.WhatsAppOutboundService;
import com.mosque.crm.service.WhatsAppWebhookService;

/**
 * WhatsApp (WAHA) endpoints.
 *
 * Admins only ever touch the queue here — sending happens in the background worker, so
 * there is no endpoint that fires a WhatsApp API call synchronously.
 */
@RestController
@RequestMapping("/whatsapp")
public class WhatsAppController {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppController.class);

    private final WhatsAppOutboundService outboundService;
    private final WhatsAppWebhookService webhookService;
    private final WahaClient wahaClient;
    private final WahaSettingsService wahaSettingsService;
    private final AuthorizationService authorizationService;

    public WhatsAppController(WhatsAppOutboundService outboundService,
                              WhatsAppWebhookService webhookService,
                              WahaClient wahaClient,
                              WahaSettingsService wahaSettingsService,
                              AuthorizationService authorizationService) {
        this.outboundService = outboundService;
        this.webhookService = webhookService;
        this.wahaClient = wahaClient;
        this.wahaSettingsService = wahaSettingsService;
        this.authorizationService = authorizationService;
    }

    // ==================== Public webhook ====================

    /**
     * Receives WAHA events (inbound replies). Protected by a shared secret rather than JWT,
     * because WAHA cannot authenticate as a user.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(
            @RequestHeader(value = "X-Webhook-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String queryToken,
            @RequestBody(required = false) JsonNode event) {

        if (!webhookService.isWebhookConfigured()) {
            log.error("WAHA webhook called but waha.webhook-secret is not configured — refusing events");
            return ResponseEntity.status(503).body(Map.of("error", "WhatsApp webhook is not configured."));
        }
        String presented = headerToken != null && !headerToken.isBlank() ? headerToken : queryToken;
        if (!webhookService.isAuthorized(presented)) {
            log.warn("WAHA webhook rejected: invalid token");
            return ResponseEntity.status(403).body(Map.of("error", "Invalid webhook token."));
        }

        try {
            webhookService.handleEvent(event);
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
        return ResponseEntity.ok(outboundService.stats(wahaClient.getSessionStatus()));
    }

    @GetMapping("/session")
    public ResponseEntity<Map<String, String>> session() {
        Map<String, String> result = new HashMap<>();
        result.put("status", wahaClient.getSessionStatus());
        return ResponseEntity.ok(result);
    }

    // ==================== Connection settings (global Settings → WAHA) ====================

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings() {
        if (!authorizationService.hasPermission("settings.manage")) {
            return forbidden();
        }
        WahaSettingsDTO dto = wahaSettingsService.toDTO();
        dto.setSessionStatus(wahaClient.getSessionStatus());
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/settings")
    public ResponseEntity<?> saveSettings(@RequestBody WahaSettingsDTO dto) {
        if (!authorizationService.hasPermission("settings.manage")) {
            return forbidden();
        }
        try {
            WahaSettingsDTO saved = wahaSettingsService.save(dto);
            saved.setSessionStatus(wahaClient.getSessionStatus());
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
                : wahaSettingsService.session();

        String status = wahaClient.testConnection(baseUrl, apiKey, session);
        Map<String, String> result = new HashMap<>();
        result.put("status", status);
        result.put("message", switch (status) {
            case "WORKING" -> "Connected — the WhatsApp session is working.";
            case "SCAN_QR_CODE" -> "Reachable, but the session needs a QR scan in WAHA.";
            case "STARTING" -> "Reachable — the session is starting.";
            case "STOPPED" -> "Reachable, but the session is stopped. Start it in WAHA.";
            case "NOT_CONFIGURED" -> "Enter a base URL first.";
            case "UNREACHABLE" -> "Could not reach WAHA at this URL. Check the URL, the container and the port.";
            default -> "WAHA answered with status " + status + ".";
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
            return ResponseEntity.ok(outboundService.addOptOut(phone, reason));
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/opt-outs/{id}")
    public ResponseEntity<Void> removeOptOut(@PathVariable Long id) {
        outboundService.removeOptOut(id);
        return ResponseEntity.noContent().build();
    }
}
