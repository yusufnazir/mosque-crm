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
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.WhatsAppChannel;
import com.mosque.crm.entity.WhatsAppInboundMessage;
import com.mosque.crm.entity.WhatsAppOptOut;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.WhatsAppInboundRepository;
import com.mosque.crm.repository.WhatsAppOptOutRepository;
import com.mosque.crm.util.PhoneUtils;
import com.mosque.crm.waha.WahaChatId;

/**
 * Handles inbound WAHA webhook events.
 *
 * An event is only accepted when the channel that received it can be identified from the
 * payload ({@code session}, else the account jid {@code me.id}) and that channel is enabled —
 * anything else is refused before a single row is written, because a reply that cannot be
 * attributed is worse than a dropped one.
 *
 * Two jobs after routing:
 * <ul>
 *   <li><b>Replies</b> — stored per (channel, number), so a contact writing to two of our
 *       numbers gets two threads and each number gets the shorter "conversation" delay only
 *       for its own threads.</li>
 *   <li><b>Opt-out</b> — a reply containing STOP / unsubscribe / spam adds the number to the
 *       do-not-message list for that channel and cancels what is still queued for it there.
 *       "Report &amp; Block" is the fastest route to a permanent ban, so this is automatic.</li>
 * </ul>
 */
@Service
public class WhatsAppWebhookService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookService.class);

    private final WhatsAppInboundRepository inboundRepository;
    private final WhatsAppOptOutRepository optOutRepository;
    private final WhatsAppOutboundService outboundService;
    private final WhatsAppChannelService channelService;
    private final PersonRepository personRepository;
    private final WahaSettingsService settings;

    public WhatsAppWebhookService(WhatsAppInboundRepository inboundRepository,
                                  WhatsAppOptOutRepository optOutRepository,
                                  WhatsAppOutboundService outboundService,
                                  WhatsAppChannelService channelService,
                                  PersonRepository personRepository,
                                  WahaSettingsService settings) {
        this.inboundRepository = inboundRepository;
        this.optOutRepository = optOutRepository;
        this.outboundService = outboundService;
        this.channelService = channelService;
        this.personRepository = personRepository;
        this.settings = settings;
    }

    // ==================== Routing + authentication ====================

    /**
     * Finds the channel that received this event: the {@code session} name is authoritative,
     * the account jid ({@code me.id}) is the fallback. Both lookups are table driven.
     */
    @Transactional(readOnly = true)
    public Optional<WhatsAppChannel> resolveChannel(JsonNode event) {
        if (event == null) {
            return Optional.empty();
        }
        String sessionName = firstNonBlank(
                text(event.path("session")),
                text(event.path("payload").path("session")));
        Optional<WhatsAppChannel> bySession = channelService.findByWahaSession(sessionName);
        if (bySession.isPresent()) {
            return bySession;
        }
        String account = firstNonBlank(
                text(event.path("me").path("id")),
                text(event.path("payload").path("me").path("id")),
                text(event.path("payload").path("to")));
        return channelService.findByAccount(account);
    }

    /** True when the presented token matches this channel's own token (or the global fallback). */
    public boolean isAuthorized(WhatsAppChannel channel, String presentedSecret) {
        return channel != null && channelService.tokenMatches(channel, presentedSecret);
    }

    /** False when no secret at all is configured, so the controller can answer 503 instead of 403. */
    public boolean isWebhookConfigured(WhatsAppChannel channel) {
        if (channel == null) {
            return false;
        }
        String expected = channelService.expectedWebhookToken(channel);
        return expected != null && !expected.isBlank();
    }

    // ==================== Event handling ====================

    /**
     * Processes one WAHA event for an already resolved channel. Unknown events are ignored;
     * duplicate deliveries are deduplicated on the WAHA message id.
     */
    @Transactional
    public void handleEvent(JsonNode event, WhatsAppChannel channel) {
        if (event == null || channel == null) {
            return;
        }
        String eventType = event.path("event").asText("");
        if (!eventType.isEmpty() && !eventType.startsWith("message")) {
            log.debug("Ignoring WAHA event '{}' for channel '{}'", eventType, channel.getLabel());
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

        String fromPhone = WahaChatId.toPhoneE164(payload.path("from").asText(null));
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
        inbound.setChannelId(channel.getId());
        inbound.setWaMessageId(waMessageId != null ? waMessageId : "unknown-" + Instant.now().toEpochMilli());
        inbound.setFromPhone(fromPhone);
        inbound.setContactName(payload.path("notifyName").asText(null));
        inbound.setBody(body);
        inbound.setOptOut(optOut);
        inbound.setReceivedAt(toLocalDateTime(payload.path("timestamp")));
        inbound.setOrganizationId(matchOrganization(fromPhone));
        inboundRepository.save(inbound);

        if (optOut) {
            registerOptOut(channel, fromPhone, keyword, inbound.getOrganizationId());
        }
    }

    private void registerOptOut(WhatsAppChannel channel, String phone, String keyword, Long organizationId) {
        if (!optOutRepository.existsByChannelIdAndPhoneE164(channel.getId(), phone)) {
            WhatsAppOptOut optOut = new WhatsAppOptOut(phone, organizationId, keyword,
                    "Automatic opt-out from an inbound WhatsApp reply",
                    WhatsAppOptOut.Source.REPLY);
            optOut.setChannelId(channel.getId());
            optOutRepository.save(optOut);
            log.info("WhatsApp opt-out registered for {} on channel '{}' (keyword '{}')",
                    PhoneUtils.mask(phone), channel.getLabel(), keyword);
        }
        int cancelled = outboundService.cancelPendingForPhone(channel.getId(), phone, "Recipient opted out");
        if (cancelled > 0) {
            log.info("Cancelled {} queued WhatsApp message(s) for {} on channel '{}'",
                    cancelled, PhoneUtils.mask(phone), channel.getLabel());
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
        for (String keyword : settings.optOutKeywords()) {
            if (normalized.equals(keyword) || normalized.startsWith(keyword + " ")) {
                return keyword;
            }
        }
        return null;
    }

    private static String text(JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() ? null : node.asText(null);
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    /** Best-effort org attribution (a reply can match members of several organisations). */
    private Long matchOrganization(String phone) {
        try {
            String digits = phone.replaceAll("[^0-9]", "");
            String cc = settings.effective().getDefaultCountryCode();
            cc = cc == null ? "" : cc;
            List<String> candidates = new java.util.ArrayList<>();
            candidates.add(phone);                    // E.164, e.g. +<country><number>
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
