package com.mosque.crm.entity;

import com.mosque.crm.enums.DocumentAccessLevel;
import com.mosque.crm.enums.DocumentLinkedEntityType;
import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

@Entity
@Table(name = "org_document_links")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class DocumentLink implements OrganizationAware {

    @Id
    @TableGenerator(name = "doc_link_seq", table = "sequences_", pkColumnName = "PK_NAME",
        pkColumnValue = "doc_link_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "doc_link_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 50)
    private DocumentLinkedEntityType entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_level_override", length = 30)
    private DocumentAccessLevel accessLevelOverride;

    @Column(name = "linked_by_user_id", nullable = false)
    private Long linkedByUserId;

    @Column(name = "note", length = 500)
    private String note;

    @CreationTimestamp
    @Column(name = "linked_at", updatable = false)
    private LocalDateTime linkedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

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

    public LocalDateTime getLinkedAt() { return linkedAt; }
    public void setLinkedAt(LocalDateTime linkedAt) { this.linkedAt = linkedAt; }
}
