package com.mosque.crm.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Live counters for one WhatsApp number, so the admin screen can show that each number has
 * its own queue and its own state.
 */
public class WhatsAppChannelStatsDTO {

    private Long id;
    private String label;
    private String wahaSession;
    private String displayNumber;
    private boolean enabled;
    private boolean isDefault;
    private String status;
    private long queued;
    private long sentToday;
    private long sentTotal;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getWahaSession() { return wahaSession; }
    public void setWahaSession(String wahaSession) { this.wahaSession = wahaSession; }

    public String getDisplayNumber() { return displayNumber; }
    public void setDisplayNumber(String displayNumber) { this.displayNumber = displayNumber; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    @JsonProperty("isDefault")
    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean isDefault) { this.isDefault = isDefault; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public long getQueued() { return queued; }
    public void setQueued(long queued) { this.queued = queued; }

    public long getSentToday() { return sentToday; }
    public void setSentToday(long sentToday) { this.sentToday = sentToday; }

    public long getSentTotal() { return sentTotal; }
    public void setSentTotal(long sentTotal) { this.sentTotal = sentTotal; }
}
