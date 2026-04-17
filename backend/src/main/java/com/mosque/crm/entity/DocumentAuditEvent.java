package com.mosque.crm.entity;

import com.mosque.crm.enums.DocumentAuditEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "org_document_audit_events")
public class DocumentAuditEvent {

    @Id
    @TableGenerator(name = "doc_audit_seq", table = "sequences_", pkColumnName = "PK_NAME",
        pkColumnValue = "doc_audit_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "doc_audit_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private DocumentAuditEventType eventType;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "detail", length = 1000)
    private String detail;

    @CreationTimestamp
    @Column(name = "occurred_at", updatable = false)
    private LocalDateTime occurredAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public DocumentAuditEventType getEventType() { return eventType; }
    public void setEventType(DocumentAuditEventType eventType) { this.eventType = eventType; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
}
