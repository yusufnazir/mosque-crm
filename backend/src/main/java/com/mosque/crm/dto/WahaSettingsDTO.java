package com.mosque.crm.dto;

/**
 * WAHA connection settings shown on the global Settings page.
 *
 * Effective values: a value stored in the {@code configurations} table wins over the
 * environment default, so the API key can be changed without redeploying.
 */
public class WahaSettingsDTO {

    private String baseUrl;
    private String apiKey;
    private String session;
    private String webhookSecret;

    // ─── anti-ban pacing / caps (all editable) ───
    private Integer coldDelayMinSeconds;
    private Integer coldDelayMaxSeconds;
    private Integer conversationDelayMinSeconds;
    private Integer conversationDelayMaxSeconds;
    private Integer typingMinSeconds;
    private Integer typingMaxSeconds;
    private Integer maxPerHour;
    private Integer maxPerDay;
    private Integer warmupStartPerDay;
    private Integer warmupStepPerDay;
    private Integer maxAttempts;
    private Integer quietHoursStart;
    private Integer quietHoursEnd;
    private String timezone;
    private Integer conversationWindowHours;
    private String defaultCountryCode;

    // ─── read-only: deployment/transport values (environment only) ───
    private Long workerPollMillis;
    private Integer connectTimeoutMillis;
    private Integer readTimeoutMillis;

    // ─── read-only info for the UI ───
    private boolean configured;
    private boolean apiKeyConfigured;
    private boolean webhookSecretConfigured;
    private String webhookPath = "/api/whatsapp/webhook";
    private String sessionStatus;

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getSession() { return session; }
    public void setSession(String session) { this.session = session; }

    public String getWebhookSecret() { return webhookSecret; }
    public void setWebhookSecret(String webhookSecret) { this.webhookSecret = webhookSecret; }

    public Integer getColdDelayMinSeconds() { return coldDelayMinSeconds; }
    public void setColdDelayMinSeconds(Integer coldDelayMinSeconds) { this.coldDelayMinSeconds = coldDelayMinSeconds; }

    public Integer getColdDelayMaxSeconds() { return coldDelayMaxSeconds; }
    public void setColdDelayMaxSeconds(Integer coldDelayMaxSeconds) { this.coldDelayMaxSeconds = coldDelayMaxSeconds; }

    public Integer getConversationDelayMinSeconds() { return conversationDelayMinSeconds; }
    public void setConversationDelayMinSeconds(Integer conversationDelayMinSeconds) { this.conversationDelayMinSeconds = conversationDelayMinSeconds; }

    public Integer getConversationDelayMaxSeconds() { return conversationDelayMaxSeconds; }
    public void setConversationDelayMaxSeconds(Integer conversationDelayMaxSeconds) { this.conversationDelayMaxSeconds = conversationDelayMaxSeconds; }

    public Integer getTypingMinSeconds() { return typingMinSeconds; }
    public void setTypingMinSeconds(Integer typingMinSeconds) { this.typingMinSeconds = typingMinSeconds; }

    public Integer getTypingMaxSeconds() { return typingMaxSeconds; }
    public void setTypingMaxSeconds(Integer typingMaxSeconds) { this.typingMaxSeconds = typingMaxSeconds; }

    public Integer getMaxPerHour() { return maxPerHour; }
    public void setMaxPerHour(Integer maxPerHour) { this.maxPerHour = maxPerHour; }

    public Integer getMaxPerDay() { return maxPerDay; }
    public void setMaxPerDay(Integer maxPerDay) { this.maxPerDay = maxPerDay; }

    public Integer getWarmupStartPerDay() { return warmupStartPerDay; }
    public void setWarmupStartPerDay(Integer warmupStartPerDay) { this.warmupStartPerDay = warmupStartPerDay; }

    public Integer getWarmupStepPerDay() { return warmupStepPerDay; }
    public void setWarmupStepPerDay(Integer warmupStepPerDay) { this.warmupStepPerDay = warmupStepPerDay; }

    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }

    public Integer getQuietHoursStart() { return quietHoursStart; }
    public void setQuietHoursStart(Integer quietHoursStart) { this.quietHoursStart = quietHoursStart; }

    public Integer getQuietHoursEnd() { return quietHoursEnd; }
    public void setQuietHoursEnd(Integer quietHoursEnd) { this.quietHoursEnd = quietHoursEnd; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public Integer getConversationWindowHours() { return conversationWindowHours; }
    public void setConversationWindowHours(Integer conversationWindowHours) { this.conversationWindowHours = conversationWindowHours; }

    public String getDefaultCountryCode() { return defaultCountryCode; }
    public void setDefaultCountryCode(String defaultCountryCode) { this.defaultCountryCode = defaultCountryCode; }

    public Long getWorkerPollMillis() { return workerPollMillis; }
    public void setWorkerPollMillis(Long workerPollMillis) { this.workerPollMillis = workerPollMillis; }

    public Integer getConnectTimeoutMillis() { return connectTimeoutMillis; }
    public void setConnectTimeoutMillis(Integer connectTimeoutMillis) { this.connectTimeoutMillis = connectTimeoutMillis; }

    public Integer getReadTimeoutMillis() { return readTimeoutMillis; }
    public void setReadTimeoutMillis(Integer readTimeoutMillis) { this.readTimeoutMillis = readTimeoutMillis; }

    public boolean isConfigured() { return configured; }
    public void setConfigured(boolean configured) { this.configured = configured; }

    public boolean isApiKeyConfigured() { return apiKeyConfigured; }
    public void setApiKeyConfigured(boolean apiKeyConfigured) { this.apiKeyConfigured = apiKeyConfigured; }

    public boolean isWebhookSecretConfigured() { return webhookSecretConfigured; }
    public void setWebhookSecretConfigured(boolean webhookSecretConfigured) { this.webhookSecretConfigured = webhookSecretConfigured; }

    public String getWebhookPath() { return webhookPath; }
    public void setWebhookPath(String webhookPath) { this.webhookPath = webhookPath; }

    public String getSessionStatus() { return sessionStatus; }
    public void setSessionStatus(String sessionStatus) { this.sessionStatus = sessionStatus; }
}
