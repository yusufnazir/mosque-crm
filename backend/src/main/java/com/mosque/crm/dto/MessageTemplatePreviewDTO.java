package com.mosque.crm.dto;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Request body for previewing an unsaved template, so the editor can show exactly what a
 * recipient would receive. When a value is omitted the built-in default is used.
 */
public class MessageTemplatePreviewDTO {

    private String language;

    private String channel;

    private String subject;

    private String body;

    /** Include the membership terms section in the rendered email preview. */
    private boolean attachTerms;

    /** Optional extra placeholder values (e.g. a real rejection reason). */
    private Map<String, String> variables = new LinkedHashMap<>();

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

    public Map<String, String> getVariables() { return variables; }
    public void setVariables(Map<String, String> variables) {
        this.variables = variables == null ? new LinkedHashMap<>() : variables;
    }
}
