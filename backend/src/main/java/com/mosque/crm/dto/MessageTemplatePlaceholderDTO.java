package com.mosque.crm.dto;

/**
 * A placeholder that may be used in a message template.
 * {@code code} is the token without braces (e.g. {@code person.firstName}); the editor inserts
 * {@code {{code}}}. {@code sample} shows what the value looks like in a preview.
 */
public class MessageTemplatePlaceholderDTO {

    private String code;
    private String sample;

    public MessageTemplatePlaceholderDTO() {
    }

    public MessageTemplatePlaceholderDTO(String code, String sample) {
        this.code = code;
        this.sample = sample;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getSample() { return sample; }
    public void setSample(String sample) { this.sample = sample; }
}
