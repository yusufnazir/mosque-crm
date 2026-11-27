package com.mosque.crm.dto;

/**
 * One file attached to an outgoing email. Content is Base64 encoded so it can travel inside
 * the JSON payload sent to the mail service.
 */
public class EmailAttachment {

    private String filename;
    private String contentType;
    private String base64Content;

    public EmailAttachment() {
    }

    public EmailAttachment(String filename, String contentType, String base64Content) {
        this.filename = filename;
        this.contentType = contentType;
        this.base64Content = base64Content;
    }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getBase64Content() { return base64Content; }
    public void setBase64Content(String base64Content) { this.base64Content = base64Content; }
}
