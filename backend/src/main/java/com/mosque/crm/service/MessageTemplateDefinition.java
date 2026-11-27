package com.mosque.crm.service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Describes one message template the tenant can edit: its identity, which placeholders it
 * supports and the default texts shipped with the application (per channel and language).
 */
public class MessageTemplateDefinition {

    private final String key;
    private final String name;
    private final String description;
    private final String category;
    private final List<String> placeholderCodes;
    private final String defaultChannel;
    private final boolean supportsTermsAttachment;
    private final Map<String, String> defaultSubjects;
    private final Map<String, String> emailBodies;
    private final Map<String, String> whatsappBodies;

    public MessageTemplateDefinition(String key,
                                     String name,
                                     String description,
                                     String category,
                                     List<String> placeholderCodes,
                                     String defaultChannel,
                                     boolean supportsTermsAttachment,
                                     Map<String, String> defaultSubjects,
                                     Map<String, String> emailBodies,
                                     Map<String, String> whatsappBodies) {
        this.key = key;
        this.name = name;
        this.description = description;
        this.category = category;
        this.placeholderCodes = Collections.unmodifiableList(placeholderCodes);
        this.defaultChannel = defaultChannel;
        this.supportsTermsAttachment = supportsTermsAttachment;
        this.defaultSubjects = Collections.unmodifiableMap(new LinkedHashMap<>(defaultSubjects));
        this.emailBodies = Collections.unmodifiableMap(new LinkedHashMap<>(emailBodies));
        this.whatsappBodies = Collections.unmodifiableMap(new LinkedHashMap<>(whatsappBodies));
    }

    public String getKey() { return key; }

    public String getName() { return name; }

    public String getDescription() { return description; }

    public String getCategory() { return category; }

    public List<String> getPlaceholderCodes() { return placeholderCodes; }

    public String getDefaultChannel() { return defaultChannel; }

    public boolean isSupportsTermsAttachment() { return supportsTermsAttachment; }

    public String defaultSubject(String language) {
        return defaultSubjects.getOrDefault(normalizeLanguage(language), "");
    }

    public String defaultBody(String channel, String language) {
        String lang = normalizeLanguage(language);
        Map<String, String> source = "WHATSAPP".equalsIgnoreCase(channel) ? whatsappBodies : emailBodies;
        return source.getOrDefault(lang, source.getOrDefault("en", ""));
    }

    private String normalizeLanguage(String language) {
        return language != null && "nl".equalsIgnoreCase(language) ? "nl" : "en";
    }
}
