package com.mosque.crm.dto;

import com.mosque.crm.enums.DocumentAccessLevel;
import com.mosque.crm.enums.DocumentShareType;

public class DocumentShareDTO {
    private Long id;
    private Long documentId;
    private DocumentShareType shareType;
    private Long targetUserId;
    private Long targetRoleId;
    private DocumentAccessLevel accessLevel;
    private Long sharedByUserId;
    private String expiresAt;
    private String sharedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    public DocumentShareType getShareType() { return shareType; }
    public void setShareType(DocumentShareType shareType) { this.shareType = shareType; }
    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }
    public Long getTargetRoleId() { return targetRoleId; }
    public void setTargetRoleId(Long targetRoleId) { this.targetRoleId = targetRoleId; }
    public DocumentAccessLevel getAccessLevel() { return accessLevel; }
    public void setAccessLevel(DocumentAccessLevel accessLevel) { this.accessLevel = accessLevel; }
    public Long getSharedByUserId() { return sharedByUserId; }
    public void setSharedByUserId(Long sharedByUserId) { this.sharedByUserId = sharedByUserId; }
    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
    public String getSharedAt() { return sharedAt; }
    public void setSharedAt(String sharedAt) { this.sharedAt = sharedAt; }
}
