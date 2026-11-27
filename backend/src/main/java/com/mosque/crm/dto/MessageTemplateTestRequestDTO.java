package com.mosque.crm.dto;

/**
 * Request body for sending a test message from the template editor.
 *
 * The draft values are used when supplied (so an admin tests what is on screen, even before
 * saving); otherwise the shipped defaults apply. Recipient depends on the channel.
 */
public class MessageTemplateTestRequestDTO {

    private String language;

    private String channel;

    private String subject;

    private String body;

    private boolean attachTerms;

    /** Recipient address when the channel is EMAIL. */
    private String toEmail;

    /** Recipient number when the channel is WHATSAPP (national or international format). */
    private String toPhone;

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

    public String getToEmail() { return toEmail; }
    public void setToEmail(String toEmail) { this.toEmail = toEmail; }

    public String getToPhone() { return toPhone; }
    public void setToPhone(String toPhone) { this.toPhone = toPhone; }
}
