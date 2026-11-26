package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One WhatsApp number the application may send from — i.e. one linked WAHA session.
 *
 * Platform level (no {@code organization_id}): the WAHA base URL and API key are global, so a
 * session belongs to the installation and two tenants may never own the same row.
 *
 * Nothing about a number is hardcoded: the session name, the label, whether the number may be
 * used at all, which number is the default and how inbound events for it are authenticated are
 * all columns on this row. {@code display_number} is filled from WAHA ({@code me.id}) and is
 * only ever shown — the identity of a channel is its id.
 */
@Entity
@Table(name = "whatsapp_channels")
public class WhatsAppChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "label", nullable = false, length = 120)
    private String label;

    /** Free-form purpose ("members", "events", "donations"), shown to admins. */
    @Column(name = "purpose", length = 255)
    private String purpose;

    /** WAHA session that holds this number's WhatsApp login. Unique. */
    @Column(name = "waha_session", nullable = false, length = 100)
    private String wahaSession;

    /** The account jid WAHA reports for this session ({@code me.id}); display only. */
    @Column(name = "display_number", length = 40)
    private String displayNumber;

    /** When false the number is never used: nothing is enqueued for it and inbound events for it are refused. */
    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    /** The number used when a caller does not name one. At most one row is the default. */
    @Column(name = "is_default", nullable = false)
    private boolean defaultChannel;

    /** This channel's own webhook secret. Empty means "use the global webhook secret". */
    @Column(name = "webhook_token", length = 128)
    private String webhookToken;

    /** Webhook URL override. Empty means "derive it from the application base URL". */
    @Column(name = "webhook_url", length = 500)
    private String webhookUrl;

    /** Comma separated WAHA events for this channel. Empty means "use the global default list". */
    @Column(name = "webhook_events", length = 500)
    private String webhookEvents;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public WhatsAppChannel() {
    }

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

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public boolean isDefault() { return defaultChannel; }
    public void setDefault(boolean defaultChannel) { this.defaultChannel = defaultChannel; }

    public String getWebhookToken() { return webhookToken; }
    public void setWebhookToken(String webhookToken) { this.webhookToken = webhookToken; }

    public String getWebhookUrl() { return webhookUrl; }
    public void setWebhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; }

    public String getWebhookEvents() { return webhookEvents; }
    public void setWebhookEvents(String webhookEvents) { this.webhookEvents = webhookEvents; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
