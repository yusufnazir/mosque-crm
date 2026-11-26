package com.mosque.crm.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import com.mosque.crm.waha.WahaEvent;

/**
 * WAHA (WhatsApp HTTP API) connection + anti-ban tuning.
 *
 * This class is the single source of truth for every documented default: the values below are
 * the fallbacks used when neither the {@code configurations} table nor an environment variable
 * provides one. Which WhatsApp number sends is NOT configured here — that is a channel row.
 */
@Component
@ConfigurationProperties(prefix = "waha")
public class WahaProperties {

    /** Base URL of the WAHA container, e.g. http://localhost:3000 */
    private String baseUrl = "http://localhost:3000";

    /** Optional WAHA API key (sent as X-Api-Key). Empty when the container runs without auth. */
    private String apiKey = "";

    /**
     * Fallback session name, used only while no channel row exists yet (fresh installation).
     * Sending always resolves a channel; this value never overrides one.
     */
    private String session = "default";

    /** Global webhook secret. A channel with its own token ignores this value. */
    private String webhookSecret = "";

    /** Default WAHA event list for channels that do not configure their own (comma separated). */
    private String webhookEvents = WahaEvent.MESSAGE;

    /**
     * Reply keywords that mean "never message this number again from this number" (comma
     * separated, matched against the first words of a reply). Editable so a deployment can add
     * its own language without a code change.
     */
    private String optOutKeywords = "stop,stop all,stop alle,stop maar,unsubscribe,uitschrijven,"
            + "afmelden,afgemeld,spam,block,blokkeren,niet meer,remove,verwijder,opt out,opt-out";

    /** How often the dispatcher looks for work. */
    private long workerPollMillis = 5000;

    /** Delay between messages for cold outreach (seconds). */
    private int coldDelayMinSeconds = 15;
    private int coldDelayMaxSeconds = 45;

    /** Delay between messages when the contact replied recently (seconds). */
    private int conversationDelayMinSeconds = 5;
    private int conversationDelayMaxSeconds = 15;

    /** Typing simulation window (seconds), scaled by message length. */
    private int typingMinSeconds = 2;
    private int typingMaxSeconds = 4;

    /** Hard caps for the number (single shared session). */
    private int maxPerHour = 20;
    private int maxPerDay = 100;

    /** Warm-up: day 1 is limited to this many messages, +warmupStepPerDay each day. */
    private int warmupStartPerDay = 20;
    private int warmupStepPerDay = 20;

    /** Quiet hours (local time of {@link #timezone}); start is inclusive, end exclusive. */
    private int quietHoursStart = 20;
    private int quietHoursEnd = 9;
    private String timezone = "Europe/Amsterdam";

    /** A reply within this many hours switches a contact to the shorter "conversation" delay. */
    private int conversationWindowHours = 24;

    /** Country calling code (digits only) used to normalize numbers stored in national format. */
    private String defaultCountryCode = "31";

    /** Give up on a message after this many attempts. */
    private int maxAttempts = 3;

    /** How long a message waits when its own number is not connected (session offline). */
    private int offlineRetryMinutes = 5;

    /** How long the queue waits when the hourly cap is reached. */
    private int capRetryMinutes = 15;

    /** HTTP timeouts (milliseconds). */
    private int connectTimeoutMillis = 5000;
    private int readTimeoutMillis = 20000;

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank();
    }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getSession() { return session; }
    public void setSession(String session) { this.session = session; }

    public String getWebhookSecret() { return webhookSecret; }
    public void setWebhookSecret(String webhookSecret) { this.webhookSecret = webhookSecret; }

    public String getWebhookEvents() { return webhookEvents; }
    public void setWebhookEvents(String webhookEvents) { this.webhookEvents = webhookEvents; }

    public String getOptOutKeywords() { return optOutKeywords; }
    public void setOptOutKeywords(String optOutKeywords) { this.optOutKeywords = optOutKeywords; }

    public long getWorkerPollMillis() { return workerPollMillis; }
    public void setWorkerPollMillis(long workerPollMillis) { this.workerPollMillis = workerPollMillis; }

    public int getColdDelayMinSeconds() { return coldDelayMinSeconds; }
    public void setColdDelayMinSeconds(int coldDelayMinSeconds) { this.coldDelayMinSeconds = coldDelayMinSeconds; }

    public int getColdDelayMaxSeconds() { return coldDelayMaxSeconds; }
    public void setColdDelayMaxSeconds(int coldDelayMaxSeconds) { this.coldDelayMaxSeconds = coldDelayMaxSeconds; }

    public int getConversationDelayMinSeconds() { return conversationDelayMinSeconds; }
    public void setConversationDelayMinSeconds(int conversationDelayMinSeconds) { this.conversationDelayMinSeconds = conversationDelayMinSeconds; }

    public int getConversationDelayMaxSeconds() { return conversationDelayMaxSeconds; }
    public void setConversationDelayMaxSeconds(int conversationDelayMaxSeconds) { this.conversationDelayMaxSeconds = conversationDelayMaxSeconds; }

    public int getTypingMinSeconds() { return typingMinSeconds; }
    public void setTypingMinSeconds(int typingMinSeconds) { this.typingMinSeconds = typingMinSeconds; }

    public int getTypingMaxSeconds() { return typingMaxSeconds; }
    public void setTypingMaxSeconds(int typingMaxSeconds) { this.typingMaxSeconds = typingMaxSeconds; }

    public int getMaxPerHour() { return maxPerHour; }
    public void setMaxPerHour(int maxPerHour) { this.maxPerHour = maxPerHour; }

    public int getMaxPerDay() { return maxPerDay; }
    public void setMaxPerDay(int maxPerDay) { this.maxPerDay = maxPerDay; }

    public int getWarmupStartPerDay() { return warmupStartPerDay; }
    public void setWarmupStartPerDay(int warmupStartPerDay) { this.warmupStartPerDay = warmupStartPerDay; }

    public int getWarmupStepPerDay() { return warmupStepPerDay; }
    public void setWarmupStepPerDay(int warmupStepPerDay) { this.warmupStepPerDay = warmupStepPerDay; }

    public int getQuietHoursStart() { return quietHoursStart; }
    public void setQuietHoursStart(int quietHoursStart) { this.quietHoursStart = quietHoursStart; }

    public int getQuietHoursEnd() { return quietHoursEnd; }
    public void setQuietHoursEnd(int quietHoursEnd) { this.quietHoursEnd = quietHoursEnd; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public int getConversationWindowHours() { return conversationWindowHours; }
    public void setConversationWindowHours(int conversationWindowHours) { this.conversationWindowHours = conversationWindowHours; }

    public String getDefaultCountryCode() { return defaultCountryCode; }
    public void setDefaultCountryCode(String defaultCountryCode) { this.defaultCountryCode = defaultCountryCode; }

    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }

    public int getOfflineRetryMinutes() { return offlineRetryMinutes; }
    public void setOfflineRetryMinutes(int offlineRetryMinutes) { this.offlineRetryMinutes = offlineRetryMinutes; }

    public int getCapRetryMinutes() { return capRetryMinutes; }
    public void setCapRetryMinutes(int capRetryMinutes) { this.capRetryMinutes = capRetryMinutes; }

    public int getConnectTimeoutMillis() { return connectTimeoutMillis; }
    public void setConnectTimeoutMillis(int connectTimeoutMillis) { this.connectTimeoutMillis = connectTimeoutMillis; }

    public int getReadTimeoutMillis() { return readTimeoutMillis; }
    public void setReadTimeoutMillis(int readTimeoutMillis) { this.readTimeoutMillis = readTimeoutMillis; }
}
