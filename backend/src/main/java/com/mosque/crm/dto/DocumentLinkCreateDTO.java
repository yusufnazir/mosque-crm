package com.mosque.crm.dto;

import com.mosque.crm.enums.DocumentAccessLevel;
import com.mosque.crm.enums.DocumentLinkedEntityType;

public class DocumentLinkCreateDTO {
    private Long documentId;
    private DocumentLinkedEntityType entityType;
    private Long entityId;
    private DocumentAccessLevel accessLevelOverride;
    private String note;

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    public DocumentLinkedEntityType getEntityType() { return entityType; }
    public void setEntityType(DocumentLinkedEntityType entityType) { this.entityType = entityType; }
    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }
    public DocumentAccessLevel getAccessLevelOverride() { return accessLevelOverride; }
    public void setAccessLevelOverride(DocumentAccessLevel accessLevelOverride) { this.accessLevelOverride = accessLevelOverride; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
