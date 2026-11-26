package com.mosque.crm.dto;

/**
 * Create/update payload for a WhatsApp channel.
 *
 * {@code webhookToken}: {@code null} keeps the stored token (update only), an empty string
 * clears it (the channel then falls back to the global webhook secret), any other value replaces
 * it.
 */
public class WhatsAppChannelRequest {

    private String label;
    private String purpose;
    private String wahaSession;
    private Boolean enabled;
    private Boolean isDefault;
    private String webhookToken;
    private String webhookUrl;
    private String webhookEvents;

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getWahaSession() { return wahaSession; }
    public void setWahaSession(String wahaSession) { this.wahaSession = wahaSession; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }

    public String getWebhookToken() { return webhookToken; }
    public void setWebhookToken(String webhookToken) { this.webhookToken = webhookToken; }

    public String getWebhookUrl() { return webhookUrl; }
    public void setWebhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; }

    public String getWebhookEvents() { return webhookEvents; }
    public void setWebhookEvents(String webhookEvents) { this.webhookEvents = webhookEvents; }
}
