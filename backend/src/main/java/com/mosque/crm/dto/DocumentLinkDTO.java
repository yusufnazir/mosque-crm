package com.mosque.crm.dto;

import com.mosque.crm.enums.DocumentAccessLevel;
import com.mosque.crm.enums.DocumentLinkedEntityType;

public class DocumentLinkDTO {
    private Long id;
    private Long documentId;
    private DocumentLinkedEntityType entityType;
    private Long entityId;
    private DocumentAccessLevel accessLevelOverride;
    private Long linkedByUserId;
    private String note;
    private String linkedAt;
    private DocumentDTO document;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    public DocumentLinkedEntityType getEntityType() { return entityType; }
    public void setEntityType(DocumentLinkedEntityType entityType) { this.entityType = entityType; }
    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }
    public DocumentAccessLevel getAccessLevelOverride() { return accessLevelOverride; }
    public void setAccessLevelOverride(DocumentAccessLevel accessLevelOverride) { this.accessLevelOverride = accessLevelOverride; }
    public Long getLinkedByUserId() { return linkedByUserId; }
    public void setLinkedByUserId(Long linkedByUserId) { this.linkedByUserId = linkedByUserId; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getLinkedAt() { return linkedAt; }
    public void setLinkedAt(String linkedAt) { this.linkedAt = linkedAt; }
    public DocumentDTO getDocument() { return document; }
    public void setDocument(DocumentDTO document) { this.document = document; }
}
