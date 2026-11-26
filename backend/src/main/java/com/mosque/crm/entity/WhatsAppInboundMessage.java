package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A message received on one of the WhatsApp numbers (WAHA webhook).
 *
 * Deliberately NOT tenant-filtered: {@code organizationId} is a best-effort match against the
 * member records and may be null. A thread is identified by (channel, remote number), so the
 * same contact writing to two of our numbers produces two threads.
 */
@Entity
@Table(name = "whatsapp_inbound_messages")
public class WhatsAppInboundMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The number that received this message. */
    @Column(name = "channel_id")
    private Long channelId;

    @Column(name = "organization_id")
    private Long organizationId;

    @Column(name = "wa_message_id", nullable = false, length = 128, unique = true)
    private String waMessageId;

    @Column(name = "from_phone", nullable = false, length = 32)
    private String fromPhone;

    @Column(name = "contact_name", length = 255)
    private String contactName;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @Column(name = "is_opt_out", nullable = false)
    private boolean optOut = false;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public WhatsAppInboundMessage() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getChannelId() { return channelId; }
    public void setChannelId(Long channelId) { this.channelId = channelId; }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public String getWaMessageId() { return waMessageId; }
    public void setWaMessageId(String waMessageId) { this.waMessageId = waMessageId; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
