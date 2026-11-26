package com.mosque.crm.service;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.WhatsAppChannelDTO;
import com.mosque.crm.dto.WhatsAppChannelRequest;
import com.mosque.crm.entity.WhatsAppChannel;
import com.mosque.crm.repository.WhatsAppChannelRepository;
import com.mosque.crm.repository.WhatsAppInboundRepository;
import com.mosque.crm.repository.WhatsAppOptOutRepository;
import com.mosque.crm.repository.WhatsAppOutboundRepository;
import com.mosque.crm.util.PhoneUtils;
import com.mosque.crm.waha.WahaChatId;
import com.mosque.crm.waha.WahaClient;
import com.mosque.crm.waha.WahaEvent;
import com.mosque.crm.waha.WahaException;
import com.mosque.crm.waha.WahaSessionInfo;
import com.mosque.crm.waha.WahaSessionStatus;

/**
 * Reads and writes the WhatsApp channel list, and answers "which number sends this?".
 *
 * Rules this class enforces so a message can never leave from the wrong number:
 * <ul>
 *   <li>a channel exists and is enabled, or nothing is sent;</li>
 *   <li>a session name must be one WAHA actually reports — the list is read live, never assumed;</li>
 *   <li>exactly one default, and resolution always goes through this class (callers pass an
 *       explicit channel when they care, and get the configured default otherwise);</li>
 *   <li>per-flow mapping is a configuration row ({@code WAHA_CHANNEL_FLOW_<FLOW>}), not a switch
 *       over known numbers.</li>
 * </ul>
 */
@Service
public class WhatsAppChannelService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppChannelService.class);

    /** The application endpoint WAHA has to call for this channel. */
    public static final String WEBHOOK_PATH = "/api/whatsapp/webhook";

    /** Prefix of the "which channel does this flow use" configuration keys. */
    private static final String FLOW_KEY_PREFIX = "WAHA_CHANNEL_FLOW_";

    /** Flow name used for transactional notifications (account activation, invitation links). */
    public static final String FLOW_NOTIFICATIONS = "NOTIFICATIONS";

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private final WhatsAppChannelRepository channelRepository;
    private final WhatsAppOutboundRepository outboundRepository;
    private final WhatsAppInboundRepository inboundRepository;
    private final WhatsAppOptOutRepository optOutRepository;
    private final ConfigurationService configurationService;
    private final WahaClient wahaClient;
    private final WahaSettingsService wahaSettings;

    public WhatsAppChannelService(WhatsAppChannelRepository channelRepository,
                                  WhatsAppOutboundRepository outboundRepository,
                                  WhatsAppInboundRepository inboundRepository,
                                  WhatsAppOptOutRepository optOutRepository,
                                  ConfigurationService configurationService,
                                  WahaClient wahaClient,
                                  WahaSettingsService wahaSettings) {
        this.channelRepository = channelRepository;
        this.outboundRepository = outboundRepository;
        this.inboundRepository = inboundRepository;
        this.optOutRepository = optOutRepository;
        this.configurationService = configurationService;
        this.wahaClient = wahaClient;
        this.wahaSettings = wahaSettings;
    }

    // ==================== Resolution (used by every send path) ====================

    /**
     * Resolves the channel for a send: an explicit one when given, otherwise the mapping of the
     * flow, otherwise the configured default. A disabled channel is never returned.
     *
     * @throws IllegalArgumentException when nothing usable is configured (callers turn this
     *                                  into a 4xx — failing is safer than picking a random number)
     */
    @Transactional(readOnly = true)
    public WhatsAppChannel requireChannel(Long explicitChannelId, String flow) {
        if (explicitChannelId != null) {
            WhatsAppChannel channel = channelRepository.findById(explicitChannelId)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown WhatsApp channel."));
            if (!channel.isEnabled()) {
                throw new IllegalArgumentException(
                        "The WhatsApp channel '" + channel.getLabel() + "' is disabled.");
            }
            return channel;
        }
        Optional<WhatsAppChannel> forFlow = flow == null ? Optional.empty() : mappedChannel(flow);
        if (forFlow.isPresent()) {
            return forFlow.get();
        }
        return defaultChannel().orElseThrow(() -> new IllegalArgumentException(
                "No enabled WhatsApp channel is configured. Add one in Settings → WhatsApp"
                        + " (the session currently configured is '" + wahaSettings.session() + "')."));
    }

    /** Configured channel for a flow, only when it still exists and is enabled. */
    @Transactional(readOnly = true)
    public Optional<WhatsAppChannel> mappedChannel(String flow) {
        String key = flowKey(flow);
        return configurationService.getValue(key)
                .flatMap(value -> parseId(value))
                .flatMap(channelRepository::findById)
                .filter(WhatsAppChannel::isEnabled);
    }

    /** The number used when a caller does not name one. */
    @Transactional(readOnly = true)
    public Optional<WhatsAppChannel> defaultChannel() {
        return channelRepository.findFirstByEnabledTrueOrderByDefaultChannelDescIdAsc();
    }

    @Transactional(readOnly = true)
    public Optional<WhatsAppChannel> findById(Long id) {
        return id == null ? Optional.empty() : channelRepository.findById(id);
    }

    /**
     * Channel id → label, read from the database only (no WAHA call). Used by the queue and
     * opt-out lists, which must not pay for a live status lookup per row.
     */
    @Transactional(readOnly = true)
    public java.util.Map<Long, String> labelMap() {
        java.util.Map<Long, String> labels = new java.util.HashMap<>();
        for (WhatsAppChannel channel : channelRepository.findAllByOrderByDefaultChannelDescLabelAsc()) {
            labels.put(channel.getId(), channel.getLabel());
        }
        return labels;
    }

    /** Looks a channel up by its WAHA session name (webhook routing). */
    @Transactional(readOnly = true)
    public Optional<WhatsAppChannel> findByWahaSession(String wahaSession) {
        if (wahaSession == null || wahaSession.isBlank()) {
            return Optional.empty();
        }
        return channelRepository.findByWahaSession(wahaSession.trim());
    }

    /** Looks a channel up by the account jid WAHA reports ({@code me.id}) — digits are compared. */
    @Transactional(readOnly = true)
    public Optional<WhatsAppChannel> findByAccount(String jidOrPhone) {
        String digits = WahaChatId.digitsOf(jidOrPhone);
        if (digits.isEmpty()) {
            return Optional.empty();
        }
        for (WhatsAppChannel channel : channelRepository.findAllByOrderByDefaultChannelDescLabelAsc()) {
            if (digits.equals(WahaChatId.digitsOf(channel.getDisplayNumber()))) {
                return Optional.of(channel);
            }
        }
        return Optional.empty();
    }

    // ==================== Admin reads ====================

    /**
     * All channels with the live WAHA state of each (one WAHA call for the whole list).
     *
     * Deliberately not transactional: the WAHA call must not keep a database connection open.
     */
    public List<WhatsAppChannelDTO> list() {
        List<WhatsAppChannel> channels = channelRepository.findAllByOrderByDefaultChannelDescLabelAsc();
        List<WahaSessionInfo> sessions = new ArrayList<>();
        boolean reachable = true;
        try {
            sessions = wahaClient.listSessions();
        } catch (WahaException e) {
            reachable = false;
            log.info("Listing WhatsApp channels without live WAHA state: {}", e.getMessage());
        }
        List<WhatsAppChannelDTO> dtos = new ArrayList<>(channels.size());
        for (WhatsAppChannel channel : channels) {
            WahaSessionInfo info = sessions.stream()
                    .filter(session -> session.name().equals(channel.getWahaSession()))
                    .findFirst()
                    .orElse(null);
            WahaSessionStatus status = info != null
                    ? info.status()
                    : (reachable ? WahaSessionStatus.UNKNOWN : WahaSessionStatus.UNREACHABLE);
            dtos.add(toDTO(channel, info == null ? null : info.meId(), status, true));
        }
        return dtos;
    }

    /** One channel with its live WAHA state (not transactional: it calls WAHA). */
    public WhatsAppChannelDTO get(Long id) {
        WhatsAppChannel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Unknown WhatsApp channel."));
        return toDTO(channel, wahaClient.meId(channel.getWahaSession()),
                wahaClient.status(channel.getWahaSession()), true);
    }

    /** Sessions WAHA reports, for the "add channel" dropdown. */
    public List<WahaSessionInfo> availableSessions() {
        return wahaClient.listSessions();
    }

    // ==================== Admin writes ====================

    @Transactional
    public WhatsAppChannelDTO create(WhatsAppChannelRequest request) {
        String session = requireSessionName(request.getWahaSession());
        if (channelRepository.existsByWahaSession(session)) {
            throw new IllegalArgumentException("A channel for the WAHA session '" + session + "' already exists.");
        }
        WahaSessionInfo info = verifySession(session);

        WhatsAppChannel channel = new WhatsAppChannel();
        channel.setWahaSession(session);
        channel.setLabel(trimToNull(request.getLabel()) == null ? session : request.getLabel().trim());
        channel.setPurpose(trimToNull(request.getPurpose()));
        channel.setDisplayNumber(info == null ? null : info.meId());
        channel.setEnabled(request.getEnabled() == null || request.getEnabled());
        channel.setWebhookToken(trimToNull(request.getWebhookToken()) == null
                ? generateToken()
                : request.getWebhookToken().trim());
        channel.setWebhookUrl(trimToNull(request.getWebhookUrl()));
        channel.setWebhookEvents(normalizeEvents(request.getWebhookEvents()));

        // The first channel is the default by definition; otherwise honour the flag.
        boolean makeDefault = channelRepository.count() == 0
                || Boolean.TRUE.equals(request.getIsDefault());
        if (makeDefault) {
            demoteCurrentDefault();
        }
        channel.setDefault(makeDefault);

        WhatsAppChannel saved = channelRepository.save(channel);
        log.info("WhatsApp channel '{}' created for session '{}'", saved.getLabel(), saved.getWahaSession());
        return toDTO(saved, info == null ? null : info.meId(),
                info == null ? WahaSessionStatus.UNKNOWN : info.status(), true);
    }

    @Transactional
    public WhatsAppChannelDTO update(Long id, WhatsAppChannelRequest request) {
        WhatsAppChannel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Unknown WhatsApp channel."));

        String session = requireSessionName(request.getWahaSession());
        WahaSessionInfo info = null;
        if (!session.equals(channel.getWahaSession())) {
            if (channelRepository.existsByWahaSessionAndIdNot(session, id)) {
                throw new IllegalArgumentException(
                        "Another channel already uses the WAHA session '" + session + "'.");
            }
            info = verifySession(session);
            channel.setWahaSession(session);
            channel.setDisplayNumber(info == null ? null : info.meId());
        }
        if (trimToNull(request.getLabel()) != null) {
            channel.setLabel(request.getLabel().trim());
        }
        if (request.getPurpose() != null) {
            channel.setPurpose(trimToNull(request.getPurpose()));
        }
        if (request.getEnabled() != null) {
            channel.setEnabled(request.getEnabled());
        }
        if (request.getIsDefault() != null) {
            if (request.getIsDefault()) {
                demoteCurrentDefault();
                channel.setDefault(true);
            } else if (channel.isDefault()) {
                long otherDefaults = channelRepository.findAllByOrderByDefaultChannelDescLabelAsc()
                        .stream().filter(other -> !other.getId().equals(id) && other.isDefault()).count();
                if (otherDefaults == 0) {
                    throw new IllegalArgumentException("Another channel has to be the default.");
                }
                channel.setDefault(false);
            }
        }
        // null keeps the token, "" clears it (channel then uses the global secret)
        if (request.getWebhookToken() != null) {
            channel.setWebhookToken(trimToNull(request.getWebhookToken()));
        }
        if (request.getWebhookUrl() != null) {
            channel.setWebhookUrl(trimToNull(request.getWebhookUrl()));
        }
        if (request.getWebhookEvents() != null) {
            channel.setWebhookEvents(normalizeEvents(request.getWebhookEvents()));
        }

        WhatsAppChannel saved = channelRepository.save(channel);
        log.info("WhatsApp channel '{}' updated (session '{}', enabled={}, default={})",
                saved.getLabel(), saved.getWahaSession(), saved.isEnabled(), saved.isDefault());
        return toDTO(saved, info == null ? null : info.meId(),
                info == null ? wahaClient.status(saved.getWahaSession()) : info.status(), true);
    }

    @Transactional
    public WhatsAppChannelDTO setDefault(Long id) {
        WhatsAppChannel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Unknown WhatsApp channel."));
        demoteCurrentDefault();
        channel.setDefault(true);
        channelRepository.save(channel);
        log.info("WhatsApp channel '{}' is now the default sender", channel.getLabel());
        return get(id);
    }

    /** Issues a new webhook secret for one channel (the old one stops working immediately). */
    @Transactional
    public WhatsAppChannelDTO rotateToken(Long id) {
        WhatsAppChannel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Unknown WhatsApp channel."));
        channel.setWebhookToken(generateToken());
        WhatsAppChannel saved = channelRepository.save(channel);
        log.info("Webhook token rotated for WhatsApp channel '{}'", saved.getLabel());
        return get(saved.getId());
    }

    /**
     * Removes a channel that was never used. A channel that already sent or received anything
     * may only be disabled, so history keeps pointing at the number that produced it.
     */    @Transactional
    public void delete(Long id) {
        WhatsAppChannel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Unknown WhatsApp channel."));
        long used = outboundRepository.countByChannelId(id)
                + inboundRepository.countByChannelId(id)
                + optOutRepository.countByChannelId(id);
        if (used > 0) {
            throw new IllegalStateException("This channel already has message history. Disable it instead.");
        }
        if (channel.isDefault() && channelRepository.count() > 1) {
            throw new IllegalArgumentException("Make another channel the default first.");
        }
        channelRepository.delete(channel);
        log.info("WhatsApp channel '{}' deleted", channel.getLabel());
    }

    /**
     * Sends one message right now from this channel (the "test send" button). Deliberately
     * bypasses the queue: it exists to prove that this number can send, so it must not be
     * paced or retried. It still refuses a disabled channel.
     *
     * @return WAHA's message id (may be null when WAHA does not echo it)
     */
    public String testSend(Long id, String rawPhone, String text) {
        WhatsAppChannel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Unknown WhatsApp channel."));
        if (!channel.isEnabled()) {
            throw new IllegalArgumentException("The WhatsApp channel '" + channel.getLabel() + "' is disabled.");
        }
        String phone = PhoneUtils.toE164(rawPhone, wahaSettings.effective().getDefaultCountryCode());
        if (phone == null) {
            throw new IllegalArgumentException("A valid phone number is required for a test message.");
        }
        String body = text == null || text.isBlank()
                ? "Test message from " + channel.getLabel()
                : text.trim();
        log.info("Sending a WhatsApp test message from channel '{}' ({})",
                channel.getLabel(), channel.getWahaSession());
        return wahaClient.sendText(channel.getWahaSession(), WahaChatId.toChatId(phone), body);
    }

    // ==================== Webhook plumbing ====================
    /** The secret WAHA must present: the channel's own token, else the global webhook secret. */
    public String expectedWebhookToken(WhatsAppChannel channel) {
        String own = channel.getWebhookToken();
        if (own != null && !own.isBlank()) {
            return own;
        }
        return wahaSettings.webhookSecret();
    }

    /** Events WAHA should deliver for this channel: the channel's list, else the global default. */
    public List<String> expectedWebhookEvents(WhatsAppChannel channel) {
        List<String> own = WahaEvent.parseList(channel.getWebhookEvents());
        return own.isEmpty() ? WahaEvent.parseList(wahaSettings.webhookEvents()) : own;
    }

    /** URL WAHA has to call: the channel override, else the application base URL. */
    public String webhookUrl(WhatsAppChannel channel) {
        String own = channel.getWebhookUrl();
        if (own != null && !own.isBlank()) {
            return own;
        }
        String base = configurationService.getAppBaseUrl();
        String trimmed = base == null ? "" : base.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed + WEBHOOK_PATH;
    }

    /** True when the presented token matches the expected one (constant-time comparison). */
    public boolean tokenMatches(WhatsAppChannel channel, String presented) {
        String expected = expectedWebhookToken(channel);
        if (expected == null || expected.isBlank() || presented == null || presented.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                presented.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * The body an operator has to PUT to {@code /api/sessions/{session}} on the WAHA host to make
     * this channel deliver its events to the application. Rendered from configuration only — the
     * application never pushes it by itself, because that restarts the session.
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> webhookConfig(Long id) {
        WhatsAppChannel channel = channelRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Unknown WhatsApp channel."));
        java.util.Map<String, Object> hmac = new java.util.LinkedHashMap<>();
        hmac.put("key", expectedWebhookToken(channel));

        java.util.Map<String, Object> webhook = new java.util.LinkedHashMap<>();
        webhook.put("url", webhookUrl(channel));
        webhook.put("events", expectedWebhookEvents(channel));
        webhook.put("hmac", hmac);

        java.util.Map<String, Object> config = new java.util.LinkedHashMap<>();
        config.put("webhooks", List.of(webhook));

        java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("name", channel.getWahaSession());
        payload.put("config", config);
        return payload;
    }

    // ==================== Helpers ====================

    private WahaSessionInfo verifySession(String session) {
        List<WahaSessionInfo> sessions;
        try {
            sessions = wahaClient.listSessions();
        } catch (WahaException e) {
            throw new IllegalArgumentException(
                    "WAHA cannot be reached, so the session '" + session + "' cannot be verified: "
                            + e.getMessage());
        }
        return sessions.stream()
                .filter(info -> info.name().equals(session))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "WAHA does not report a session named '" + session + "'. Available sessions: "
                                + (sessions.isEmpty() ? "none" : String.join(", ",
                                        sessions.stream().map(WahaSessionInfo::name).toList()))));
    }

    private void demoteCurrentDefault() {
        for (WhatsAppChannel other : channelRepository.findAllByOrderByDefaultChannelDescLabelAsc()) {
            if (other.isDefault()) {
                other.setDefault(false);
                channelRepository.save(other);
            }
        }
    }

    private String requireSessionName(String session) {
        String trimmed = trimToNull(session);
        if (trimmed == null) {
            throw new IllegalArgumentException("A WAHA session name is required.");
        }
        return trimmed;
    }

    /** Comma separated, trimmed, de-duplicated; blank means "use the global default list". */
    private String normalizeEvents(String events) {
        List<String> parsed = WahaEvent.parseList(events);
        List<String> unique = new ArrayList<>();
        for (String event : parsed) {
            if (!unique.contains(event)) {
                unique.add(event);
            }
        }
        return unique.isEmpty() ? null : String.join(",", unique);
    }

    private String flowKey(String flow) {
        String normalized = flow.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_");
        return FLOW_KEY_PREFIX + normalized;
    }

    private Optional<Long> parseId(String value) {
        try {
            return Optional.of(Long.parseLong(value.trim()));
        } catch (NumberFormatException e) {
            log.warn("Ignoring a non-numeric WhatsApp channel mapping '{}'", value);
            return Optional.empty();
        }
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private WhatsAppChannelDTO toDTO(WhatsAppChannel channel, String liveMeId,
                                     WahaSessionStatus status, boolean includeToken) {
        WhatsAppChannelDTO dto = new WhatsAppChannelDTO();
        dto.setId(channel.getId());
        dto.setLabel(channel.getLabel());
        dto.setPurpose(channel.getPurpose());
        dto.setWahaSession(channel.getWahaSession());
        dto.setDisplayNumber(channel.getDisplayNumber());
        dto.setMeId(liveMeId);
        dto.setEnabled(channel.isEnabled());
        dto.setDefault(channel.isDefault());
        dto.setWebhookTokenSet(channel.getWebhookToken() != null && !channel.getWebhookToken().isBlank());
        dto.setWebhookToken(includeToken ? channel.getWebhookToken() : null);
        dto.setWebhookUrl(channel.getWebhookUrl());
        dto.setWebhookEvents(channel.getWebhookEvents());
        dto.setStatus(status == null ? WahaSessionStatus.UNKNOWN.name() : status.name());
        dto.setCreatedAt(channel.getCreatedAt());
        dto.setUpdatedAt(channel.getUpdatedAt());
        return dto;
    }
}
