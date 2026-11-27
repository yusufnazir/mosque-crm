package com.mosque.crm.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * One message template, resolved for a single language. Values are the tenant override when
 * one exists, otherwise the shipped default (see {@code customized}).
 */
public class MessageTemplateDTO {

    private String key;
    private String name;
    private String description;
    private String category;
    private String language;

    private String channel;
    private String subject;
    private String body;
    private boolean attachTerms;
    private boolean active;

    /** true when this row differs from the built-in default text. */
    private boolean customized;

    private String defaultChannel;
    private String defaultSubject;
    private String defaultBody;
    private boolean supportsTermsAttachment;

    private List<MessageTemplatePlaceholderDTO> placeholders = new ArrayList<>();

    private LocalDateTime updatedAt;

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public boolean isAttachTerms() { return attachTerms; }
    public void setAttachTerms(boolean attachTerms) { this.attachTerms = attachTerms; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public boolean isCustomized() { return customized; }
    public void setCustomized(boolean customized) { this.customized = customized; }

    public String getDefaultChannel() { return defaultChannel; }
    public void setDefaultChannel(String defaultChannel) { this.defaultChannel = defaultChannel; }

    public String getDefaultSubject() { return defaultSubject; }
    public void setDefaultSubject(String defaultSubject) { this.defaultSubject = defaultSubject; }

    public String getDefaultBody() { return defaultBody; }
    public void setDefaultBody(String defaultBody) { this.defaultBody = defaultBody; }

    public boolean isSupportsTermsAttachment() { return supportsTermsAttachment; }
    public void setSupportsTermsAttachment(boolean supportsTermsAttachment) { this.supportsTermsAttachment = supportsTermsAttachment; }

    public List<MessageTemplatePlaceholderDTO> getPlaceholders() { return placeholders; }
    public void setPlaceholders(List<MessageTemplatePlaceholderDTO> placeholders) { this.placeholders = placeholders; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
