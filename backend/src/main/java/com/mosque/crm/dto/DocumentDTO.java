package com.mosque.crm.dto;

import com.mosque.crm.enums.DocumentStatus;
import com.mosque.crm.enums.DocumentType;
import com.mosque.crm.enums.DocumentVisibility;

public class DocumentDTO {
    private Long id;
    private Long organizationId;
    private Long folderId;
    private String title;
    private String description;
    private DocumentType documentType;
    private String mimeType;
    private long fileSize;
    private String originalFilename;
    private DocumentStatus status;
    private DocumentVisibility visibility;
    private Long ownerUserId;
    private int versionCount;
    private String expiresAt;
    private boolean expiryNotificationSent;
    private String deletedAt;
    private String createdAt;
    private String updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }
    public Long getFolderId() { return folderId; }
    public void setFolderId(Long folderId) { this.folderId = folderId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public DocumentType getDocumentType() { return documentType; }
    public void setDocumentType(DocumentType documentType) { this.documentType = documentType; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }
    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }
    public DocumentStatus getStatus() { return status; }
    public void setStatus(DocumentStatus status) { this.status = status; }
    public DocumentVisibility getVisibility() { return visibility; }
    public void setVisibility(DocumentVisibility visibility) { this.visibility = visibility; }
    public Long getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(Long ownerUserId) { this.ownerUserId = ownerUserId; }
    public int getVersionCount() { return versionCount; }
    public void setVersionCount(int versionCount) { this.versionCount = versionCount; }
    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
    public boolean isExpiryNotificationSent() { return expiryNotificationSent; }
    public void setExpiryNotificationSent(boolean expiryNotificationSent) { this.expiryNotificationSent = expiryNotificationSent; }
    public String getDeletedAt() { return deletedAt; }
    public void setDeletedAt(String deletedAt) { this.deletedAt = deletedAt; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
