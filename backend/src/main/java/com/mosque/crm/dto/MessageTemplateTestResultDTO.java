package com.mosque.crm.dto;

/**
 * Outcome of a test send, so the editor can tell the admin exactly what happened
 * (mail service not configured, mail rejected, WhatsApp skipped, queued, ...).
 */
public class MessageTemplateTestResultDTO {

    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_QUEUED = "QUEUED";
    public static final String STATUS_SKIPPED = "SKIPPED";
    public static final String STATUS_NOT_CONFIGURED = "NOT_CONFIGURED";
    public static final String STATUS_NO_RECIPIENT = "NO_RECIPIENT";
    public static final String STATUS_FAILED = "FAILED";

    private String channel;
    private String status;
    private boolean delivered;
    private String recipient;
    private String message;

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isDelivered() { return delivered; }
    public void setDelivered(boolean delivered) { this.delivered = delivered; }

    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
