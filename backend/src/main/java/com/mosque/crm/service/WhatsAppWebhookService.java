package com.mosque.crm.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.mosque.crm.config.WahaProperties;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.WhatsAppInboundMessage;
import com.mosque.crm.entity.WhatsAppOptOut;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.WhatsAppInboundRepository;
import com.mosque.crm.repository.WhatsAppOptOutRepository;
import com.mosque.crm.util.PhoneUtils;

/**
 * Handles inbound WAHA webhook events.
 *
 * Two jobs:
 * <ul>
 *   <li><b>Replies</b> — stored so a contact who answered gets the shorter "conversation"
 *       delay instead of cold-outreach spacing.</li>
 *   <li><b>Opt-out</b> — a reply containing STOP / unsubscribe / spam immediately adds the
 *       number to the do-not-message list and cancels anything still queued for it.
 *       "Report &amp; Block" is the fastest route to a permanent ban, so this is automatic.</li>
 * </ul>
 */
@Service
public class WhatsAppWebhookService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookService.class);

    /** Keyword → normalized opt-out token. Compared against the first words of the reply. */
    private static final List<String> OPT_OUT_KEYWORDS = List.of(
            "stop", "stop all", "stop alle", "stop maar",
            "unsubscribe", "uitschrijven", "afmelden", "afgemeld",
            "spam", "block", "blokkeren", "niet meer",
            "remove", "verwijder", "opt out", "opt-out");

    private final WhatsAppInboundRepository inboundRepository;
    private final WhatsAppOptOutRepository optOutRepository;
    private final WhatsAppOutboundService outboundService;
    private final PersonRepository personRepository;
    private final WahaProperties properties;
    private final WahaSettingsService settings;

    public WhatsAppWebhookService(WhatsAppInboundRepository inboundRepository,
                                  WhatsAppOptOutRepository optOutRepository,
                                  WhatsAppOutboundService outboundService,
                                  PersonRepository personRepository,
                                  WahaProperties properties,
                                  WahaSettingsService settings) {
        this.inboundRepository = inboundRepository;
        this.optOutRepository = optOutRepository;
        this.outboundService = outboundService;
        this.personRepository = personRepository;
        this.properties = properties;
        this.settings = settings;
    }

    /** True only when the shared secret is configured and matches. */
    public boolean isAuthorized(String presentedSecret) {
        String expected = settings.webhookSecret();
        if (expected == null || expected.isBlank()) {
            return false;
        }
        return presentedSecret != null && java.security.MessageDigest.isEqual(
                expected.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                presentedSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    public boolean isWebhookConfigured() {
        String secret = settings.webhookSecret();
        return secret != null && !secret.isBlank();
    }

    /**
     * Processes one WAHA event. Unknown events are ignored; duplicate deliveries are
     * deduplicated on the WAHA message id.
     */
    @Transactional
    public void handleEvent(JsonNode event) {
        if (event == null) {
            return;
        }
        String eventType = event.path("event").asText("");
        if (!eventType.isEmpty() && !eventType.startsWith("message")) {
            log.debug("Ignoring WAHA event '{}'", eventType);
            return;
        }

        JsonNode payload = event.path("payload");
        if (payload.isMissingNode() || payload.isEmpty()) {
            return;
        }
        // Our own outbound messages come back as events — ignore them
        if (payload.path("fromMe").asBoolean(false)) {
            return;
        }

        String fromPhone = PhoneUtils.fromChatId(payload.path("from").asText(null));
        if (fromPhone == null) {
            log.debug("WAHA event without a usable 'from' field, ignored");
            return;
        }

        String waMessageId = payload.path("id").asText(null);
        if (waMessageId != null && inboundRepository.existsByWaMessageId(waMessageId)) {
            log.debug("Duplicate WAHA event {} ignored", waMessageId);
            return;
        }

        String body = payload.path("body").asText("");
        String keyword = detectOptOutKeyword(body);
        boolean optOut = keyword != null;

        WhatsAppInboundMessage inbound = new WhatsAppInboundMessage();
        inbound.setWaMessageId(waMessageId != null ? waMessageId : "unknown-" + Instant.now().toEpochMilli());
        inbound.setFromPhone(fromPhone);
        inbound.setContactName(payload.path("notifyName").asText(null));
        inbound.setBody(body);
        inbound.setOptOut(optOut);
        inbound.setReceivedAt(toLocalDateTime(payload.path("timestamp")));
        inbound.setOrganizationId(matchOrganization(fromPhone));
        inboundRepository.save(inbound);

        if (optOut) {
            registerOptOut(fromPhone, keyword, inbound.getOrganizationId());
        }
    }

    private void registerOptOut(String phone, String keyword, Long organizationId) {
        if (!optOutRepository.existsByPhoneE164(phone)) {
            WhatsAppOptOut optOut = new WhatsAppOptOut(phone, organizationId, keyword,
                    "Automatic opt-out from an inbound WhatsApp reply",
                    WhatsAppOptOut.Source.REPLY);
            optOutRepository.save(optOut);
            log.info("WhatsApp opt-out registered for {} (keyword '{}')", PhoneUtils.mask(phone), keyword);
        }
        int cancelled = outboundService.cancelPendingForPhone(phone, "Recipient opted out");
        if (cancelled > 0) {
            log.info("Cancelled {} queued WhatsApp message(s) for {}", cancelled, PhoneUtils.mask(phone));
        }
    }

    /** Returns the matched keyword, or null when the reply is a normal message. */
    String detectOptOutKeyword(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        String normalized = body.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        for (String keyword : OPT_OUT_KEYWORDS) {
            if (normalized.equals(keyword) || normalized.startsWith(keyword + " ")) {
                return keyword;
            }
        }
        return null;
    }

    /** Best-effort org attribution (the installation shares one WhatsApp number). */
    private Long matchOrganization(String phone) {
        try {
            String digits = phone.replaceAll("[^0-9]", "");
            String cc = properties.getDefaultCountryCode() == null ? "" : properties.getDefaultCountryCode();
            List<String> candidates = new java.util.ArrayList<>();
            candidates.add(phone);                    // +31612345678
            candidates.add(digits);                   // 31612345678
            candidates.add("00" + digits);            // 0031612345678
            if (!cc.isEmpty() && digits.startsWith(cc)) {
                candidates.add("0" + digits.substring(cc.length())); // 0612345678
            }
            List<Person> matches = personRepository.findByPhoneCandidates(candidates);
            if (matches.isEmpty()) {
                return null;
            }
            Long organizationId = matches.get(0).getOrganizationId();
            long distinctOrganizations = matches.stream()
                    .map(Person::getOrganizationId)
                    .distinct()
                    .count();
            if (distinctOrganizations > 1) {
                log.debug("Inbound WhatsApp number matches members in {} organisations; attributing to {}",
                        distinctOrganizations, organizationId);
            }
            return organizationId;
        } catch (Exception e) {
            log.debug("Could not match inbound WhatsApp number to a member record: {}", e.getMessage());
            return null;
        }
    }

    private LocalDateTime toLocalDateTime(JsonNode timestamp) {
        if (timestamp == null || timestamp.isMissingNode() || timestamp.isNull()) {
            return LocalDateTime.now();
        }
        long epochSeconds = timestamp.asLong(0);
        if (epochSeconds <= 0) {
            return LocalDateTime.now();
        }
        return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneId.systemDefault());
    }

    /** Convenience for tests/admin UI: the latest reply from a number. */
    @Transactional(readOnly = true)
    public Optional<WhatsAppInboundMessage> latestFrom(String phone) {
        return inboundRepository.findFirstByFromPhoneOrderByReceivedAtDesc(phone);
    }
}
