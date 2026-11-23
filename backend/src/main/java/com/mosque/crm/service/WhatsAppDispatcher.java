package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.mosque.crm.config.WahaProperties;
import com.mosque.crm.entity.ScheduledJobConfig;
import com.mosque.crm.entity.WhatsAppOutboundMessage;
import com.mosque.crm.repository.WhatsAppOptOutRepository;
import com.mosque.crm.scheduler.ScheduledJob;
import com.mosque.crm.util.PhoneUtils;

/**
 * Sends queued WhatsApp messages — one at a time, never in a loop, never from a request.
 *
 * Every tick:
 * <ol>
 *   <li>asks the rate limiter whether sending is allowed right now (quiet hours, hourly and
 *       warm-up daily caps). If not, the whole queue is pushed to the next permitted moment;</li>
 *   <li>claims exactly one due message (pessimistic lock, so instances cannot double-send);</li>
 *   <li>shows a typing indicator for 2–4 s scaled to the message length;</li>
 *   <li>sends it, then pushes the next queued message out by a randomized delay.</li>
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

    private final WhatsAppOutboundService outboundService;
    private final WhatsAppRateLimiter rateLimiter;
    private final WhatsAppOptOutRepository optOutRepository;
    private final WahaClient wahaClient;
    private final WahaSettingsService wahaSettings;

    /** Session status is cached briefly so an offline WAHA is not polled every 5 seconds. */
    private volatile String cachedSessionStatus = "UNKNOWN";
    private volatile long cachedSessionStatusAt = 0L;
    private static final long SESSION_CACHE_MILLIS = 60_000L;

    public WhatsAppDispatcher(WhatsAppOutboundService outboundService,
                              WhatsAppRateLimiter rateLimiter,
                              WhatsAppOptOutRepository optOutRepository,
                              WahaClient wahaClient,
                              WahaSettingsService wahaSettings) {
        this.outboundService = outboundService;
        this.rateLimiter = rateLimiter;
        this.optOutRepository = optOutRepository;
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
        return "Sends one queued WhatsApp message per tick, respecting the pacing, caps and quiet hours configured in Settings → WhatsApp.";
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
            // Nothing can be sent while the WhatsApp session is logged out or scanning
            if (!"WORKING".equals(sessionStatus())) {
                return;
            }

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

    private void send(WhatsAppOutboundMessage message) {        String phone = message.getRecipientPhone();

        // Last-moment opt-out check: a STOP reply may have arrived while this was queued
        if (optOutRepository.existsByPhoneE164(phone)) {
            outboundService.markSkipped(message.getId(), "Recipient opted out before sending");
            log.info("Skipped WhatsApp message {}: {} opted out", message.getId(), PhoneUtils.mask(phone));
            return;
        }

        String chatId = PhoneUtils.toChatId(phone);
        try {
            simulateTyping(chatId, message.getRenderedBody());
            String waMessageId = wahaClient.sendText(chatId, message.getRenderedBody());

            outboundService.markSent(message.getId(), waMessageId);
            outboundService.paceNextQueued(LocalDateTime.now());

            log.info("WhatsApp message {} sent to {} (campaign {})",
                    message.getId(), PhoneUtils.mask(phone), message.getCampaignId());
        } catch (WahaClient.WahaException e) {
            outboundService.markAttemptFailed(message.getId(), e.getMessage(), e.isRetryable());
            log.warn("WhatsApp message {} to {} failed (retryable={}): {}",
                    message.getId(), PhoneUtils.mask(phone), e.isRetryable(), e.getMessage());
        }
    }

    /**
     * WhatsApp's anti-spam heuristics expect a human typing before a message appears:
     * startTyping → wait (scaled by length) → stopTyping → send.
     */
    private String sessionStatus() {
        long now = System.currentTimeMillis();
        if (now - cachedSessionStatusAt > SESSION_CACHE_MILLIS) {
            cachedSessionStatus = wahaClient.getSessionStatus();
            cachedSessionStatusAt = now;
        }
        return cachedSessionStatus;
    }

    private void simulateTyping(String chatId, String text) {
        int min = wahaSettings.effective().getTypingMinSeconds();
        int max = wahaSettings.effective().getTypingMaxSeconds();
        if (min <= 0 || max <= 0) {
            return;
        }

        wahaClient.startTyping(chatId);

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

        wahaClient.stopTyping(chatId);
    }
}
