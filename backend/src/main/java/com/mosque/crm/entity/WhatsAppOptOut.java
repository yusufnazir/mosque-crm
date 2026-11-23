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
 * A phone number that must never be messaged again.
 *
 * Global on purpose: the installation sends from one WhatsApp number, so one contact's
 * "STOP" protects the reputation of the whole number, not just one organisation.
 */
@Entity
@Table(name = "whatsapp_opt_outs")
public class WhatsAppOptOut {

    public static final class Source {
        public static final String REPLY = "REPLY";
        public static final String MANUAL = "MANUAL";

        private Source() {
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "phone_e164", nullable = false, length = 32, unique = true)
    private String phoneE164;

    @Column(name = "organization_id")
    private Long organizationId;

    @Column(name = "keyword", length = 50)
    private String keyword;

    @Column(name = "reason", length = 255)
    private String reason;

    @Column(name = "source", nullable = false, length = 20)
    private String source = Source.REPLY;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public WhatsAppOptOut() {
    }

    public WhatsAppOptOut(String phoneE164, Long organizationId, String keyword, String reason, String source) {
        this.phoneE164 = phoneE164;
        this.organizationId = organizationId;
        this.keyword = keyword;
        this.reason = reason;
        this.source = source;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPhoneE164() { return phoneE164; }
    public void setPhoneE164(String phoneE164) { this.phoneE164 = phoneE164; }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
