package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One queued WhatsApp message.
 *
 * The dispatcher never sends inside the request thread: messages land here with a
 * {@code nextAttemptAt} that already contains the randomized jitter, and the scheduled
 * worker sends at most one per poll.
 */
@Entity
@Table(name = "whatsapp_outbound_messages")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class WhatsAppOutboundMessage implements OrganizationAware {

    public static final class Status {
        public static final String QUEUED = "QUEUED";
        public static final String SENDING = "SENDING";
        public static final String SENT = "SENT";
        public static final String FAILED = "FAILED";
        public static final String CANCELLED = "CANCELLED";
        public static final String SKIPPED = "SKIPPED";

        private Status() {
        }
    }

    public static final class Profile {
        /** Cold outreach: long randomized delay between messages. */
        public static final String COLD = "COLD";
        /** The contact replied recently: shorter delay. */
        public static final String CONVERSATION = "CONVERSATION";

        private Profile() {
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id")
    private Long organizationId;

    /**
     * The number that must send this message. Resolved when the row is queued and never
     * re-resolved afterwards, so a retry can never leave from a different number.
     */
    @Column(name = "channel_id")
    private Long channelId;

    /** Audit snapshot of the WAHA session this row was queued for. */
    @Column(name = "waha_session", length = 100)
    private String wahaSession;

    @Column(name = "campaign_id", length = 64)
    private String campaignId;

    @Column(name = "recipient_phone", nullable = false, length = 32)
    private String recipientPhone;

    @Column(name = "recipient_name", length = 255)
    private String recipientName;

    @Column(name = "rendered_body", nullable = false, columnDefinition = "TEXT")
    private String renderedBody;

    @Column(name = "profile", nullable = false, length = 20)
    private String profile = Profile.COLD;

    @Column(name = "status", nullable = false, length = 20)
    private String status = Status.QUEUED;

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount = 0;

    @Column(name = "next_attempt_at", nullable = false)
    private LocalDateTime nextAttemptAt;

    @Column(name = "last_error", length = 2000)
    private String lastError;

    @Column(name = "wa_message_id", length = 128)
    private String waMessageId;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public WhatsAppOutboundMessage() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public Long getChannelId() { return channelId; }
    public void setChannelId(Long channelId) { this.channelId = channelId; }

    public String getWahaSession() { return wahaSession; }
    public void setWahaSession(String wahaSession) { this.wahaSession = wahaSession; }

    public String getCampaignId() { return campaignId; }
    public void setCampaignId(String campaignId) { this.campaignId = campaignId; }

    public String getRecipientPhone() { return recipientPhone; }
    public void setRecipientPhone(String recipientPhone) { this.recipientPhone = recipientPhone; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getRenderedBody() { return renderedBody; }
    public void setRenderedBody(String renderedBody) { this.renderedBody = renderedBody; }

    public String getProfile() { return profile; }
    public void setProfile(String profile) { this.profile = profile; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getAttemptCount() { return attemptCount; }
    public void setAttemptCount(Integer attemptCount) { this.attemptCount = attemptCount; }

    public LocalDateTime getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(LocalDateTime nextAttemptAt) { this.nextAttemptAt = nextAttemptAt; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public String getWaMessageId() { return waMessageId; }
    public void setWaMessageId(String waMessageId) { this.waMessageId = waMessageId; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
