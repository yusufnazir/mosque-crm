package com.mosque.crm.dto;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Result of rendering a message template with sample (or supplied) data.
 */
public class MessageTemplatePreviewResultDTO {

    private String channel;

    /** Rendered subject (email only). */
    private String subject;

    /** Rendered plain-text body (what WhatsApp shows / what the email is built from). */
    private String body;

    /** Rendered HTML body when the channel is EMAIL. */
    private String html;

    private Map<String, String> variables = new LinkedHashMap<>();

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getHtml() { return html; }
    public void setHtml(String html) { this.html = html; }

    public Map<String, String> getVariables() { return variables; }
    public void setVariables(Map<String, String> variables) { this.variables = variables; }
}
