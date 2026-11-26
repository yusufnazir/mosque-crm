package com.mosque.crm.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Request to queue one or more WhatsApp messages.
 *
 * The template supports placeholders ({@code {{name}}}, {@code {{first_name}}}, {@code {{org}}})
 * and spintax alternatives ({@code {Hi|Hello|Hey there}}) so the same text is never sent twice.
 */
public class WhatsAppEnqueueRequest {

    /** CUSTOM (use phones), ALL_MEMBERS or ACTIVE_MEMBERS */
    private String recipientType = "CUSTOM";

    /** Explicit recipients for CUSTOM. Numbers may be national (0612345678) or international. */
    private List<String> phones = new ArrayList<>();

    private String template;

    /**
     * Which WhatsApp number sends this batch. {@code null} means "the configured default",
     * and the resolved channel is stored on every queued row so a retry cannot switch numbers.
     */
    private Long channelId;

    /** COLD (15-45 s spacing) or CONVERSATION (5-15 s spacing). Defaults to COLD. */
    private String profile;

    /** Optional country calling code (digits) used to normalize national numbers. */
    private String defaultCountryCode;

    /** Optional: do not start before this moment (jitter and caps are applied on top). */
    private LocalDateTime scheduledAt;

    public String getRecipientType() { return recipientType; }
    public void setRecipientType(String recipientType) { this.recipientType = recipientType; }

    public List<String> getPhones() { return phones; }
    public void setPhones(List<String> phones) { this.phones = phones == null ? new ArrayList<>() : phones; }

    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }

    public Long getChannelId() { return channelId; }
    public void setChannelId(Long channelId) { this.channelId = channelId; }

    public String getProfile() { return profile; }
    public void setProfile(String profile) { this.profile = profile; }

    public String getDefaultCountryCode() { return defaultCountryCode; }
    public void setDefaultCountryCode(String defaultCountryCode) { this.defaultCountryCode = defaultCountryCode; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }
}
