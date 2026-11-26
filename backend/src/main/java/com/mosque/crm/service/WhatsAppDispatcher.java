package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.mosque.crm.config.WahaProperties;
import com.mosque.crm.entity.ScheduledJobConfig;
import com.mosque.crm.entity.WhatsAppChannel;
import com.mosque.crm.entity.WhatsAppOutboundMessage;
import com.mosque.crm.repository.WhatsAppOptOutRepository;
import com.mosque.crm.scheduler.ScheduledJob;
import com.mosque.crm.util.PhoneUtils;
import com.mosque.crm.waha.WahaChatId;
import com.mosque.crm.waha.WahaClient;
import com.mosque.crm.waha.WahaException;
import com.mosque.crm.waha.WahaSessionStatus;

/**
 * Sends queued WhatsApp messages — one at a time, never in a loop, never from a request.
 *
 * Every row already carries the channel it was queued for, so this worker never chooses a
 * number: it reads {@code channel_id} plus the session snapshot, confirms that channel is still
 * enabled, and sends through exactly that session. A retry reuses the same session, so a
 * message can never drift to another number.
 *
 * Every tick:
 * <ol>
 *   <li>asks the rate limiter whether sending is allowed right now (quiet hours, hourly and
 *       warm-up daily caps). If not, the whole queue is pushed to the next permitted moment;</li>
 *   <li>claims exactly one due message from an enabled channel (pessimistic lock, so instances
 *       cannot double-send);</li>
 *   <li>checks that this message's session is connected (cached briefly per session) — a number
 *       that is offline holds its messages instead of burning delivery attempts;</li>
 *   <li>shows a typing indicator for 2–4 s scaled to the message length, sends it, then pushes
 *       the next queued message out by a randomized delay.</li>
 * </ol>
 *
 * Registered as a {@link ScheduledJob} so the platform admin can pause sending, change the
 * poll interval or trigger a tick from the Schedulers view without a restart.
 */
@Component
public class WhatsAppDispatcher implements ScheduledJob {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppDispatcher.class);

    public static final String JOB_KEY = "whatsapp.dispatcher";
    public static final int DEFAULT_POLL_SECONDS = 5;
    private static final long DEFAULT_INITIAL_DELAY_SECONDS = 15L;

    /** A session whose state is known is not polled more often than this. */
    private static final long SESSION_CACHE_MILLIS = 60_000L;

    private final WhatsAppOutboundService outboundService;
    private final WhatsAppRateLimiter rateLimiter;
    private final WhatsAppOptOutRepository optOutRepository;
    private final WhatsAppChannelService channelService;
    private final WahaClient wahaClient;
    private final WahaSettingsService wahaSettings;

    /** Last known state per WAHA session, so an offline number is not polled every tick. */
    private final Map<String, CachedStatus> sessionStates = new ConcurrentHashMap<>();

    private record CachedStatus(WahaSessionStatus status, long checkedAt) {
    }

    public WhatsAppDispatcher(WhatsAppOutboundService outboundService,
                              WhatsAppRateLimiter rateLimiter,
                              WhatsAppOptOutRepository optOutRepository,
                              WhatsAppChannelService channelService,
                              WahaClient wahaClient,
                              WahaSettingsService wahaSettings) {
        this.outboundService = outboundService;
        this.rateLimiter = rateLimiter;
        this.optOutRepository = optOutRepository;
        this.channelService = channelService;
        this.wahaClient = wahaClient;
        this.wahaSettings = wahaSettings;
    }

    // ─── ScheduledJob ─────────────────────────────────────────────────────────

    @Override
    public String key() {
        return JOB_KEY;
    }

    @Override
    public String label() {
        return "WhatsApp queue dispatcher";
    }

    @Override
    public String description() {
        return "Sends one queued WhatsApp message per tick from the channel it was queued for, respecting the pacing, caps and quiet hours configured in Settings → WhatsApp.";
    }

    @Override
    public String defaultTriggerType() {
        return ScheduledJobConfig.TriggerType.FIXED_DELAY;
    }

    @Override
    public Integer defaultFixedDelaySeconds() {
        return DEFAULT_POLL_SECONDS;
    }

    @Override
    public long initialDelaySeconds() {
        return DEFAULT_INITIAL_DELAY_SECONDS;
    }

    @Override
    public void run() {
        tick();
    }

    /** One dispatch pass. Kept public so it can be invoked directly in tests. */
    public void tick() {
        if (!wahaClient.isConfigured()) {
            return;
        }
        try {
            WhatsAppRateLimiter.Decision decision = rateLimiter.check(LocalDateTime.now());
            if (!decision.allowed()) {
                int deferred = outboundService.deferDue(decision.retryAt());
                if (deferred > 0) {
                    log.info("WhatsApp sending paused ({}), {} message(s) moved to {}",
                            decision.reason(), deferred, decision.retryAt());
                }
                return;
            }

            Optional<WhatsAppOutboundMessage> claimed = outboundService.claimNext();
            if (claimed.isEmpty()) {
                return;
            }
            send(claimed.get());
        } catch (Exception e) {
            // The poller must survive anything, otherwise the queue silently stops
            log.error("WhatsApp dispatcher tick failed: {}", e.getMessage(), e);
        }
    }

    private void send(WhatsAppOutboundMessage message) {
        String phone = message.getRecipientPhone();

        // Which number must this leave from? Read from the row, never re-resolved.
        WhatsAppChannel channel = channelService.findById(message.getChannelId()).orElse(null);
        if (channel == null) {
            outboundService.markSkipped(message.getId(),
                    "The WhatsApp channel for this message no longer exists");
            log.warn("Skipped WhatsApp message {}: channel {} is gone", message.getId(), message.getChannelId());
            return;
        }
        if (!channel.isEnabled()) {
            outboundService.markSkipped(message.getId(),
                    "The WhatsApp channel '" + channel.getLabel() + "' is disabled");
            log.info("Skipped WhatsApp message {}: channel '{}' is disabled", message.getId(), channel.getLabel());
            return;
        }
        String session = message.getWahaSession() != null && !message.getWahaSession().isBlank()
                ? message.getWahaSession()
                : channel.getWahaSession();

        // Nothing can be sent while this number is logged out or scanning
        WahaSessionStatus status = status(session);
        if (!status.isWorking()) {
            int holdMinutes = Math.max(1, wahaSettings.effective().getOfflineRetryMinutes());
            LocalDateTime retryAt = LocalDateTime.now().plusMinutes(holdMinutes);
            outboundService.release(message.getId(), retryAt,
                    "WAHA session '" + session + "' is " + status.name());
            log.info("WhatsApp message {} held: session '{}' is {} (retry at {})",
                    message.getId(), session, status, retryAt);
            return;
        }

        // Last-moment opt-out check: a STOP reply may have arrived while this was queued
        if (optOutRepository.existsByChannelIdAndPhoneE164(channel.getId(), phone)
                || optOutRepository.existsByPhoneE164AndChannelIdIsNull(phone)) {
            outboundService.markSkipped(message.getId(), "Recipient opted out before sending");
            log.info("Skipped WhatsApp message {}: {} opted out", message.getId(), PhoneUtils.mask(phone));
            return;
        }

        String chatId = WahaChatId.toChatId(phone);
        try {
            simulateTyping(session, chatId, message.getRenderedBody());
            String waMessageId = wahaClient.sendText(session, chatId, message.getRenderedBody());

            outboundService.markSent(message.getId(), waMessageId);
            outboundService.paceNextQueued(LocalDateTime.now());

            log.info("WhatsApp message {} sent to {} via session '{}' (campaign {})",
                    message.getId(), PhoneUtils.mask(phone), session, message.getCampaignId());
        } catch (WahaException e) {
            invalidate(session);
            outboundService.markAttemptFailed(message.getId(), e.getMessage(), e.isRetryable());
            log.warn("WhatsApp message {} to {} via session '{}' failed (retryable={}): {}",
                    message.getId(), PhoneUtils.mask(phone), session, e.isRetryable(), e.getMessage());
        }
    }

    /** Session state, cached briefly per session so an offline number is not polled every tick. */
    private WahaSessionStatus status(String session) {
        long now = System.currentTimeMillis();
        CachedStatus cached = sessionStates.get(session);
        if (cached != null && now - cached.checkedAt() <= SESSION_CACHE_MILLIS) {
            return cached.status();
        }
        WahaSessionStatus status = wahaClient.status(session);
        sessionStates.put(session, new CachedStatus(status, now));
        return status;
    }

    private void invalidate(String session) {
        sessionStates.remove(session);
    }

    /**
     * WhatsApp's anti-spam heuristics expect a human typing before a message appears:
     * startTyping → wait (scaled by length) → stopTyping → send.
     */
    private void simulateTyping(String session, String chatId, String text) {
        int min = wahaSettings.effective().getTypingMinSeconds();
        int max = wahaSettings.effective().getTypingMaxSeconds();
        if (min <= 0 || max <= 0) {
            return;
        }

        wahaClient.startTyping(session, chatId);

        int length = text == null ? 0 : text.length();
        // Longer text → longer "typing", but never outside the configured window
        int scaled = min + Math.min(max - min, length / 120);
        int seconds = ThreadLocalRandom.current().nextInt(scaled, max + 1);

        try {
            Thread.sleep(seconds * 1000L);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }

        wahaClient.stopTyping(session, chatId);
    }
}
