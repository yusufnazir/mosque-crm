package com.mosque.crm.dto;

import com.mosque.crm.enums.DocumentAuditEventType;

public class DocumentAuditEventDTO {
    private Long id;
    private Long documentId;
    private DocumentAuditEventType eventType;
    private Long userId;
    private String detail;
    private String occurredAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    public DocumentAuditEventType getEventType() { return eventType; }
    public void setEventType(DocumentAuditEventType eventType) { this.eventType = eventType; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public String getOccurredAt() { return occurredAt; }
    public void setOccurredAt(String occurredAt) { this.occurredAt = occurredAt; }
}
