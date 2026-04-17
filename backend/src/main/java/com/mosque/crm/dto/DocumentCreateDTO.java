package com.mosque.crm.dto;

import com.mosque.crm.enums.DocumentVisibility;

public class DocumentCreateDTO {
    private Long folderId;
    private String title;
    private String description;
    private DocumentVisibility visibility;
    private String expiresAt;

    public Long getFolderId() { return folderId; }
    public void setFolderId(Long folderId) { this.folderId = folderId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public DocumentVisibility getVisibility() { return visibility; }
    public void setVisibility(DocumentVisibility visibility) { this.visibility = visibility; }
    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
}
