package com.mosque.crm.service;

import java.time.ZoneId;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.config.WahaProperties;
import com.mosque.crm.dto.WahaSettingsDTO;

/**
 * Effective WAHA settings (connection + anti-ban pacing).
 *
 * Every value resolves the same way: a value stored in the {@code configurations} table
 * (editable in Settings → WhatsApp) wins over the environment default in
 * {@link WahaProperties}. The merged result is cached briefly, because the dispatcher and
 * the client read it many times per minute, and the cache is dropped when the settings are
 * saved.
 */
@Service
public class WahaSettingsService {

    private static final Logger log = LoggerFactory.getLogger(WahaSettingsService.class);

    public static final String KEY_BASE_URL = "WAHA_BASE_URL";
    public static final String KEY_API_KEY = "WAHA_API_KEY";
    public static final String KEY_SESSION = "WAHA_SESSION";
    public static final String KEY_WEBHOOK_SECRET = "WAHA_WEBHOOK_SECRET";

    public static final String KEY_COLD_DELAY_MIN = "WAHA_COLD_DELAY_MIN_SECONDS";
    public static final String KEY_COLD_DELAY_MAX = "WAHA_COLD_DELAY_MAX_SECONDS";
    public static final String KEY_CONVERSATION_DELAY_MIN = "WAHA_CONVERSATION_DELAY_MIN_SECONDS";
    public static final String KEY_CONVERSATION_DELAY_MAX = "WAHA_CONVERSATION_DELAY_MAX_SECONDS";
    public static final String KEY_TYPING_MIN = "WAHA_TYPING_MIN_SECONDS";
    public static final String KEY_TYPING_MAX = "WAHA_TYPING_MAX_SECONDS";
    public static final String KEY_MAX_PER_HOUR = "WAHA_MAX_PER_HOUR";
    public static final String KEY_MAX_PER_DAY = "WAHA_MAX_PER_DAY";
    public static final String KEY_WARMUP_START = "WAHA_WARMUP_START_PER_DAY";
    public static final String KEY_WARMUP_STEP = "WAHA_WARMUP_STEP_PER_DAY";
    public static final String KEY_MAX_ATTEMPTS = "WAHA_MAX_ATTEMPTS";
    public static final String KEY_QUIET_START = "WAHA_QUIET_HOURS_START";
    public static final String KEY_QUIET_END = "WAHA_QUIET_HOURS_END";
    public static final String KEY_TIMEZONE = "WAHA_TIMEZONE";
    public static final String KEY_CONVERSATION_WINDOW_HOURS = "WAHA_CONVERSATION_WINDOW_HOURS";
    public static final String KEY_DEFAULT_COUNTRY_CODE = "WAHA_DEFAULT_COUNTRY_CODE";

    private static final long CACHE_MILLIS = 30_000L;

    private final ConfigurationService configurationService;
    private final WahaProperties defaults;

    private volatile WahaProperties cache;
    private volatile long cachedAt;

    public WahaSettingsService(ConfigurationService configurationService, WahaProperties defaults) {
        this.configurationService = configurationService;
        this.defaults = defaults;
    }

    // ─── connection ───────────────────────────────────────────────────────────

    public String baseUrl() { return effective().getBaseUrl(); }
    public String apiKey() { return effective().getApiKey(); }
    public String session() { return effective().getSession(); }
    public String webhookSecret() { return effective().getWebhookSecret(); }

    public boolean isConfigured() {
        String url = baseUrl();
        return url != null && !url.isBlank();
    }

    /**
     * Merged settings: the environment defaults from {@link WahaProperties} with every
     * database override applied. Cached for {@link #CACHE_MILLIS}.
     */
    public WahaProperties effective() {
        long now = System.currentTimeMillis();
        WahaProperties current = cache;
        if (current != null && now - cachedAt <= CACHE_MILLIS) {
            return current;
        }
        WahaProperties merged = copyDefaults();
        cache = merged;
        cachedAt = now;
        return merged;
    }

    // ─── settings screen ──────────────────────────────────────────────────────

    /** Filled DTO for the settings screen (raw values: this endpoint is restricted to settings managers). */
    public WahaSettingsDTO toDTO() {
        WahaProperties settings = effective();
        WahaSettingsDTO dto = new WahaSettingsDTO();

        dto.setBaseUrl(settings.getBaseUrl());
        dto.setApiKey(settings.getApiKey());
        dto.setSession(settings.getSession());
        dto.setWebhookSecret(settings.getWebhookSecret());
        dto.setConfigured(isConfigured());
        dto.setApiKeyConfigured(settings.getApiKey() != null && !settings.getApiKey().isBlank());
        dto.setWebhookSecretConfigured(settings.getWebhookSecret() != null && !settings.getWebhookSecret().isBlank());

        dto.setColdDelayMinSeconds(settings.getColdDelayMinSeconds());
        dto.setColdDelayMaxSeconds(settings.getColdDelayMaxSeconds());
        dto.setConversationDelayMinSeconds(settings.getConversationDelayMinSeconds());
        dto.setConversationDelayMaxSeconds(settings.getConversationDelayMaxSeconds());
        dto.setTypingMinSeconds(settings.getTypingMinSeconds());
        dto.setTypingMaxSeconds(settings.getTypingMaxSeconds());

        dto.setMaxPerHour(settings.getMaxPerHour());
        dto.setMaxPerDay(settings.getMaxPerDay());
        dto.setWarmupStartPerDay(settings.getWarmupStartPerDay());
        dto.setWarmupStepPerDay(settings.getWarmupStepPerDay());
        dto.setMaxAttempts(settings.getMaxAttempts());

        dto.setQuietHoursStart(settings.getQuietHoursStart());
        dto.setQuietHoursEnd(settings.getQuietHoursEnd());
        dto.setTimezone(settings.getTimezone());
        dto.setConversationWindowHours(settings.getConversationWindowHours());
        dto.setDefaultCountryCode(settings.getDefaultCountryCode());

        // Deployment-level values: environment only, shown for transparency
        dto.setWorkerPollMillis(defaults.getWorkerPollMillis());
        dto.setConnectTimeoutMillis(defaults.getConnectTimeoutMillis());
        dto.setReadTimeoutMillis(defaults.getReadTimeoutMillis());

        return dto;
    }

    @Transactional
    public WahaSettingsDTO save(WahaSettingsDTO dto) {
        // ─── connection ───
        String baseUrl = trimToEmpty(dto.getBaseUrl());
        if (baseUrl.isEmpty()) {
            throw new IllegalArgumentException("A WAHA base URL is required.");
        }
        if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
            throw new IllegalArgumentException("The WAHA base URL must start with http:// or https://");
        }
        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        String session = trimToEmpty(dto.getSession());
        if (session.isEmpty()) {
            session = "default";
        }

        // ─── pacing / caps (validated before anything is written) ───
        int coldMin = intValue(dto.getColdDelayMinSeconds(), defaults.getColdDelayMinSeconds(), 1, 600, "Cold delay (minimum)");
        int coldMax = intValue(dto.getColdDelayMaxSeconds(), defaults.getColdDelayMaxSeconds(), 1, 600, "Cold delay (maximum)");
        requireMinMax(coldMin, coldMax, "Cold delay");

        int convMin = intValue(dto.getConversationDelayMinSeconds(), defaults.getConversationDelayMinSeconds(), 1, 600, "Conversation delay (minimum)");
        int convMax = intValue(dto.getConversationDelayMaxSeconds(), defaults.getConversationDelayMaxSeconds(), 1, 600, "Conversation delay (maximum)");
        requireMinMax(convMin, convMax, "Conversation delay");

        int typingMin = intValue(dto.getTypingMinSeconds(), defaults.getTypingMinSeconds(), 0, 60, "Typing time (minimum)");
        int typingMax = intValue(dto.getTypingMaxSeconds(), defaults.getTypingMaxSeconds(), 0, 60, "Typing time (maximum)");
        requireMinMax(typingMin, typingMax, "Typing time");

        int maxPerHour = intValue(dto.getMaxPerHour(), defaults.getMaxPerHour(), 1, 1000, "Maximum per hour");
        int maxPerDay = intValue(dto.getMaxPerDay(), defaults.getMaxPerDay(), 1, 10000, "Maximum per day");
        if (maxPerHour > maxPerDay) {
            throw new IllegalArgumentException("The hourly limit cannot be higher than the daily limit.");
        }
        int warmupStart = intValue(dto.getWarmupStartPerDay(), defaults.getWarmupStartPerDay(), 1, 10000, "Warm-up start");
        int warmupStep = intValue(dto.getWarmupStepPerDay(), defaults.getWarmupStepPerDay(), 0, 10000, "Warm-up step");
        int maxAttempts = intValue(dto.getMaxAttempts(), defaults.getMaxAttempts(), 1, 10, "Maximum attempts");

        int quietStart = intValue(dto.getQuietHoursStart(), defaults.getQuietHoursStart(), 0, 23, "Quiet hours start");
        int quietEnd = intValue(dto.getQuietHoursEnd(), defaults.getQuietHoursEnd(), 0, 23, "Quiet hours end");

        String timezone = trimToEmpty(dto.getTimezone());
        if (timezone.isEmpty()) {
            timezone = defaults.getTimezone();
        }
        try {
            ZoneId.of(timezone);
        } catch (Exception e) {
            throw new IllegalArgumentException("Unknown time zone: " + timezone);
        }

        int conversationWindow = intValue(dto.getConversationWindowHours(), defaults.getConversationWindowHours(), 0, 720, "Conversation window");

        String countryCode = trimToEmpty(dto.getDefaultCountryCode());
        if (countryCode.isEmpty()) {
            countryCode = defaults.getDefaultCountryCode();
        }
        countryCode = countryCode.replaceAll("[^0-9]", "");
        if (countryCode.isEmpty() || countryCode.length() > 4) {
            throw new IllegalArgumentException("The default country code must be 1-4 digits (e.g. 31).");
        }

        // ─── persist ───
        configurationService.setValue(KEY_BASE_URL, baseUrl);
        configurationService.setValue(KEY_API_KEY, trimToEmpty(dto.getApiKey()));
        configurationService.setValue(KEY_SESSION, session);
        configurationService.setValue(KEY_WEBHOOK_SECRET, trimToEmpty(dto.getWebhookSecret()));

        configurationService.setValue(KEY_COLD_DELAY_MIN, String.valueOf(coldMin));
        configurationService.setValue(KEY_COLD_DELAY_MAX, String.valueOf(coldMax));
        configurationService.setValue(KEY_CONVERSATION_DELAY_MIN, String.valueOf(convMin));
        configurationService.setValue(KEY_CONVERSATION_DELAY_MAX, String.valueOf(convMax));
        configurationService.setValue(KEY_TYPING_MIN, String.valueOf(typingMin));
        configurationService.setValue(KEY_TYPING_MAX, String.valueOf(typingMax));
        configurationService.setValue(KEY_MAX_PER_HOUR, String.valueOf(maxPerHour));
        configurationService.setValue(KEY_MAX_PER_DAY, String.valueOf(maxPerDay));
        configurationService.setValue(KEY_WARMUP_START, String.valueOf(warmupStart));
        configurationService.setValue(KEY_WARMUP_STEP, String.valueOf(warmupStep));
        configurationService.setValue(KEY_MAX_ATTEMPTS, String.valueOf(maxAttempts));
        configurationService.setValue(KEY_QUIET_START, String.valueOf(quietStart));
        configurationService.setValue(KEY_QUIET_END, String.valueOf(quietEnd));
        configurationService.setValue(KEY_TIMEZONE, timezone);
        configurationService.setValue(KEY_CONVERSATION_WINDOW_HOURS, String.valueOf(conversationWindow));
        configurationService.setValue(KEY_DEFAULT_COUNTRY_CODE, countryCode);

        invalidate();
        log.info("WAHA settings updated (baseUrl={}, session={}, caps={}/hour {}/day, quiet {}–{} {})",
                baseUrl, session, maxPerHour, maxPerDay, quietStart, quietEnd, timezone);

        return toDTO();
    }

    /** Drops the cached values so the next call re-reads the database. */
    public void invalidate() {
        cache = null;
        cachedAt = 0L;
    }

    // ─── resolution ───────────────────────────────────────────────────────────

    private WahaProperties copyDefaults() {
        WahaProperties p = new WahaProperties();

        p.setBaseUrl(resolveString(KEY_BASE_URL, defaults.getBaseUrl(), ""));
        p.setApiKey(resolveString(KEY_API_KEY, defaults.getApiKey(), ""));
        p.setWebhookSecret(resolveString(KEY_WEBHOOK_SECRET, defaults.getWebhookSecret(), ""));
        String session = resolveString(KEY_SESSION, defaults.getSession(), "default");
        p.setSession(session.isBlank() ? "default" : session);

        // Infrastructure-only values stay on the environment defaults (not shown in the UI)
        p.setWorkerPollMillis(defaults.getWorkerPollMillis());
        p.setConnectTimeoutMillis(defaults.getConnectTimeoutMillis());
        p.setReadTimeoutMillis(defaults.getReadTimeoutMillis());

        p.setColdDelayMinSeconds(resolveInt(KEY_COLD_DELAY_MIN, defaults.getColdDelayMinSeconds()));
        p.setColdDelayMaxSeconds(resolveInt(KEY_COLD_DELAY_MAX, defaults.getColdDelayMaxSeconds()));
        p.setConversationDelayMinSeconds(resolveInt(KEY_CONVERSATION_DELAY_MIN, defaults.getConversationDelayMinSeconds()));
        p.setConversationDelayMaxSeconds(resolveInt(KEY_CONVERSATION_DELAY_MAX, defaults.getConversationDelayMaxSeconds()));
        p.setTypingMinSeconds(resolveInt(KEY_TYPING_MIN, defaults.getTypingMinSeconds()));
        p.setTypingMaxSeconds(resolveInt(KEY_TYPING_MAX, defaults.getTypingMaxSeconds()));

        p.setMaxPerHour(resolveInt(KEY_MAX_PER_HOUR, defaults.getMaxPerHour()));
        p.setMaxPerDay(resolveInt(KEY_MAX_PER_DAY, defaults.getMaxPerDay()));
        p.setWarmupStartPerDay(resolveInt(KEY_WARMUP_START, defaults.getWarmupStartPerDay()));
        p.setWarmupStepPerDay(resolveInt(KEY_WARMUP_STEP, defaults.getWarmupStepPerDay()));
        p.setMaxAttempts(resolveInt(KEY_MAX_ATTEMPTS, defaults.getMaxAttempts()));

        p.setQuietHoursStart(resolveInt(KEY_QUIET_START, defaults.getQuietHoursStart()));
        p.setQuietHoursEnd(resolveInt(KEY_QUIET_END, defaults.getQuietHoursEnd()));
        p.setTimezone(resolveString(KEY_TIMEZONE, defaults.getTimezone(), "Europe/Amsterdam"));
        p.setConversationWindowHours(resolveInt(KEY_CONVERSATION_WINDOW_HOURS, defaults.getConversationWindowHours()));
        String countryCode = resolveString(KEY_DEFAULT_COUNTRY_CODE, defaults.getDefaultCountryCode(), "31");
        p.setDefaultCountryCode(countryCode.replaceAll("[^0-9]", ""));

        return p;
    }

    /** Database value wins; a stored empty string intentionally means "no value". */
    private String resolveString(String key, String fallback, String emptyDefault) {
        return configurationService.getValue(key)
                .map(value -> value == null ? "" : value.trim())
                .orElseGet(() -> {
                    String fallbackValue = fallback == null ? "" : fallback.trim();
                    return fallbackValue.isEmpty() ? emptyDefault : fallbackValue;
                });
    }

    private int resolveInt(String key, int fallback) {
        return configurationService.getValue(key)
                .map(value -> {
                    try {
                        return Integer.parseInt(value.trim());
                    } catch (NumberFormatException e) {
                        log.warn("Configuration {} has a non-numeric value '{}', using default {}", key, value, fallback);
                        return fallback;
                    }
                })
                .orElse(fallback);
    }

    // ─── validation helpers ───────────────────────────────────────────────────

    private int intValue(Integer submitted, int fallback, int min, int max, String label) {
        int value = submitted == null ? fallback : submitted;
        if (value < min || value > max) {
            throw new IllegalArgumentException(label + " must be between " + min + " and " + max + ".");
        }
        return value;
    }

    private void requireMinMax(int min, int max, String label) {
        if (min > max) {
            throw new IllegalArgumentException(label + ": the minimum cannot be higher than the maximum.");
        }
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
