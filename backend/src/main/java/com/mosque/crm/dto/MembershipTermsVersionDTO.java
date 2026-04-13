package com.mosque.crm.dto;

import java.time.LocalDateTime;
import java.util.List;

public class MembershipTermsVersionDTO {

    private Long id;
    private Integer versionNumber;
    private String title;
    private String content;
    private String titleNl;
    private String contentNl;
    private String renderedContent;
    private String renderedContentNl;
    private boolean active;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> availablePlaceholders;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(Integer versionNumber) {
        this.versionNumber = versionNumber;
    }

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

    public String getRenderedContent() {
        return renderedContent;
    }

    public void setRenderedContent(String renderedContent) {
        this.renderedContent = renderedContent;
    }

    public String getRenderedContentNl() {
        return renderedContentNl;
    }

    public void setRenderedContentNl(String renderedContentNl) {
        this.renderedContentNl = renderedContentNl;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<String> getAvailablePlaceholders() {
        return availablePlaceholders;
    }

    public void setAvailablePlaceholders(List<String> availablePlaceholders) {
        this.availablePlaceholders = availablePlaceholders;
    }
}