package com.mosque.crm.dto;

public class MembershipTermsDraftDTO {

    private String title;
    private String titleNl;
    private String content;
    private String contentNl;
    private Long lastSavedAt;
    private Long lastSavedAtNl;
    private String locale;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getTitleNl() {
        return titleNl;
    }

    public void setTitleNl(String titleNl) {
        this.titleNl = titleNl;
    }

    public String getContentNl() {
        return contentNl;
    }

    public void setContentNl(String contentNl) {
        this.contentNl = contentNl;
    }

    public Long getLastSavedAt() {
        return lastSavedAt;
    }

    public void setLastSavedAt(Long lastSavedAt) {
        this.lastSavedAt = lastSavedAt;
    }

    public Long getLastSavedAtNl() {
        return lastSavedAtNl;
    }

    public void setLastSavedAtNl(Long lastSavedAtNl) {
        this.lastSavedAtNl = lastSavedAtNl;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }
}
