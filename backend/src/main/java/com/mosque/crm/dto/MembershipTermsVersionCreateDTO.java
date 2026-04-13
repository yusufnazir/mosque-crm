package com.mosque.crm.dto;

public class MembershipTermsVersionCreateDTO {

    private String title;
    private String content;
    private String titleNl;
    private String contentNl;

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
}