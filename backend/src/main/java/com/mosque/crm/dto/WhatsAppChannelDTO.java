package com.mosque.crm.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * A WhatsApp number as shown in Settings → WhatsApp and as offered in the compose screen.
 *
 * {@code status} and {@code meId} are live values read from WAHA (never stored assumptions);
 * {@code displayNumber} is the last number WAHA reported for this session.
 */
public class WhatsAppChannelDTO {

    private Long id;
    private String label;
    private String purpose;
    private String wahaSession;
    private String displayNumber;
    private String meId;
    private boolean enabled;
    private boolean isDefault;
    private boolean webhookTokenSet;
    /** Returned only to settings managers, because the WAHA session needs it when registering the webhook. */
    private String webhookToken;
    private String webhookUrl;
    private String webhookEvents;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getWahaSession() { return wahaSession; }
    public void setWahaSession(String wahaSession) { this.wahaSession = wahaSession; }

    public String getDisplayNumber() { return displayNumber; }
    public void setDisplayNumber(String displayNumber) { this.displayNumber = displayNumber; }

    public String getMeId() { return meId; }
    public void setMeId(String meId) { this.meId = meId; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    /** Plain {@code isDefault()} would be serialised as {@code default} — the UI reads {@code isDefault}. */
    @JsonProperty("isDefault")
    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean isDefault) { this.isDefault = isDefault; }

    public boolean isWebhookTokenSet() { return webhookTokenSet; }
    public void setWebhookTokenSet(boolean webhookTokenSet) { this.webhookTokenSet = webhookTokenSet; }

    public String getWebhookToken() { return webhookToken; }
    public void setWebhookToken(String webhookToken) { this.webhookToken = webhookToken; }

    public String getWebhookUrl() { return webhookUrl; }
    public void setWebhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; }

    public String getWebhookEvents() { return webhookEvents; }
    public void setWebhookEvents(String webhookEvents) { this.webhookEvents = webhookEvents; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
