package com.mosque.crm.dto;

import com.mosque.crm.enums.DocumentAccessLevel;
import com.mosque.crm.enums.DocumentShareType;

public class DocumentShareCreateDTO {
    private DocumentShareType shareType;
    private Long targetUserId;
    private Long targetRoleId;
    private DocumentAccessLevel accessLevel;
    private String expiresAt;

    public DocumentShareType getShareType() { return shareType; }
    public void setShareType(DocumentShareType shareType) { this.shareType = shareType; }
    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }
    public Long getTargetRoleId() { return targetRoleId; }
    public void setTargetRoleId(Long targetRoleId) { this.targetRoleId = targetRoleId; }
    public DocumentAccessLevel getAccessLevel() { return accessLevel; }
    public void setAccessLevel(DocumentAccessLevel accessLevel) { this.accessLevel = accessLevel; }
    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
}
