package com.mosque.crm.dto;

import java.time.LocalDateTime;

public class WhatsAppReplyDTO {

    private Long id;
    private String fromPhone;
    private String contactName;
    private String body;
    private boolean optOut;
    private LocalDateTime receivedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFromPhone() { return fromPhone; }
    public void setFromPhone(String fromPhone) { this.fromPhone = fromPhone; }

    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public boolean isOptOut() { return optOut; }
    public void setOptOut(boolean optOut) { this.optOut = optOut; }

    public LocalDateTime getReceivedAt() { return receivedAt; }
    public void setReceivedAt(LocalDateTime receivedAt) { this.receivedAt = receivedAt; }
}
