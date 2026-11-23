package com.mosque.crm.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.mosque.crm.config.WahaProperties;
import com.mosque.crm.entity.WhatsAppOutboundMessage;
import com.mosque.crm.repository.WhatsAppOutboundRepository;

/**
 * Hard rate caps for the single shared WhatsApp number.
 *
 * Combines three guards, in this order:
 * <ol>
 *   <li><b>Quiet hours</b> — nothing leaves the number outside business hours.</li>
 *   <li><b>Hourly cap</b> — a rolling one-hour window.</li>
 *   <li><b>Daily cap with warm-up</b> — day 1 of a fresh number only sends a few messages;
 *       the allowance grows per day until it reaches the configured maximum.</li>
 * </ol>
 */
@Service
public class WhatsAppRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppRateLimiter.class);

    public static final String REASON_QUIET_HOURS = "QUIET_HOURS";
    public static final String REASON_HOURLY_CAP = "HOURLY_CAP";
    public static final String REASON_DAILY_CAP = "DAILY_CAP";

    private final WhatsAppOutboundRepository outboundRepository;
    private final WahaSettingsService wahaSettings;

    public WhatsAppRateLimiter(WhatsAppOutboundRepository outboundRepository, WahaSettingsService wahaSettings) {
        this.outboundRepository = outboundRepository;
        this.wahaSettings = wahaSettings;
    }

    /** Caps, quiet hours and time zone can be edited in Settings → WhatsApp. */
    private WahaProperties settings() {
        return wahaSettings.effective();
    }

    /** Result of a rate check; {@code retryAt} is when the next send may be attempted. */
    public record Decision(boolean allowed, LocalDateTime retryAt, String reason) {

        public static Decision allow() {
            return new Decision(true, null, null);
        }

        public static Decision blocked(LocalDateTime retryAt, String reason) {
            return new Decision(false, retryAt, reason);
        }
    }

    public Decision check(LocalDateTime now) {
        if (isQuietHours(now)) {
            return Decision.blocked(nextQuietHoursEnd(now), REASON_QUIET_HOURS);
        }

        long sentLastHour = outboundRepository.countByStatusAndSentAtAfter(
                WhatsAppOutboundMessage.Status.SENT, now.minusHours(1));
        if (sentLastHour >= settings().getMaxPerHour()) {
            return Decision.blocked(now.plusMinutes(15), REASON_HOURLY_CAP);
        }

        int dailyCap = effectiveDailyCap(now);
        long sentToday = outboundRepository.countByStatusAndSentAtAfter(
                WhatsAppOutboundMessage.Status.SENT, startOfDay(now));
        if (sentToday >= dailyCap) {
            return Decision.blocked(startOfNextDay(now), REASON_DAILY_CAP);
        }

        return Decision.allow();
    }

    /**
     * Daily allowance for today: the configured maximum, capped by the warm-up ramp while the
     * number is still young (day 1 = {@code warmupStartPerDay}, +{@code warmupStepPerDay} a day).
     */
    public int effectiveDailyCap(LocalDateTime now) {
        WahaProperties settings = settings();
        int max = settings.getMaxPerDay();
        Optional<LocalDateTime> firstSentAt = outboundRepository.findFirstSentAt();
        if (firstSentAt.isEmpty()) {
            return Math.min(max, settings.getWarmupStartPerDay());
        }
        long dayNumber = warmupDayNumber(firstSentAt.get(), now);
        long ramped = settings.getWarmupStartPerDay()
                + (dayNumber - 1) * (long) settings.getWarmupStepPerDay();
        return (int) Math.min(max, Math.max(settings.getWarmupStartPerDay(), ramped));
    }

    public long warmupDayNumber(LocalDateTime firstSentAt, LocalDateTime now) {
        ZoneId zone = zone();
        LocalDate firstDay = firstSentAt.atZone(ZoneId.systemDefault()).withZoneSameInstant(zone).toLocalDate();
        LocalDate today = now.atZone(ZoneId.systemDefault()).withZoneSameInstant(zone).toLocalDate();
        long days = ChronoUnit.DAYS.between(firstDay, today);
        return Math.max(1, days + 1);
    }

    public long sentLastHour(LocalDateTime now) {
        return outboundRepository.countByStatusAndSentAtAfter(
                WhatsAppOutboundMessage.Status.SENT, now.minusHours(1));
    }

    public long sentToday(LocalDateTime now) {
        return outboundRepository.countByStatusAndSentAtAfter(
                WhatsAppOutboundMessage.Status.SENT, startOfDay(now));
    }

    public boolean isQuietHours(LocalDateTime now) {
        int hour = now.atZone(ZoneId.systemDefault()).withZoneSameInstant(zone()).getHour();
        int start = settings().getQuietHoursStart();
        int end = settings().getQuietHoursEnd();
        if (start == end) {
            return false;
        }
        return start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
    }

    /** First instant after the quiet window (respecting the configured time zone). */
    public LocalDateTime nextQuietHoursEnd(LocalDateTime now) {
        ZoneId zone = zone();
        ZonedDateTime local = now.atZone(ZoneId.systemDefault()).withZoneSameInstant(zone);
        ZonedDateTime endToday = local.toLocalDate()
                .atTime(settings().getQuietHoursEnd(), 0)
                .atZone(zone);
        ZonedDateTime next = endToday.isAfter(local) ? endToday : endToday.plusDays(1);
        return next.withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }

    private LocalDateTime startOfDay(LocalDateTime now) {
        ZoneId zone = zone();
        return now.atZone(ZoneId.systemDefault())
                .withZoneSameInstant(zone)
                .toLocalDate()
                .atStartOfDay(zone)
                .withZoneSameInstant(ZoneId.systemDefault())
                .toLocalDateTime();
    }

    private LocalDateTime startOfNextDay(LocalDateTime now) {
        ZoneId zone = zone();
        return now.atZone(ZoneId.systemDefault())
                .withZoneSameInstant(zone)
                .toLocalDate()
                .plusDays(1)
                .atStartOfDay(zone)
                .withZoneSameInstant(ZoneId.systemDefault())
                .toLocalDateTime();
    }

    private ZoneId zone() {
        try {
            return ZoneId.of(settings().getTimezone());
        } catch (Exception e) {
            log.warn("Invalid WhatsApp time zone '{}', falling back to the system zone", settings().getTimezone());
            return ZoneId.systemDefault();
        }
    }
}
