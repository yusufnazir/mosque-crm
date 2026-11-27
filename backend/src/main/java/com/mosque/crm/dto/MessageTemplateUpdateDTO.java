package com.mosque.crm.dto;

/**
 * Request body for creating/updating one language variant of a message template.
 */
public class MessageTemplateUpdateDTO {

    /** EMAIL or WHATSAPP. */
    private String channel;

    /** Email only. */
    private String subject;

    private String body;

    /** Attach the active membership terms & conditions (email only). */
    private boolean attachTerms;

    /** When false the notification is not sent at all for this event. */
    private boolean active = true;

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
}
