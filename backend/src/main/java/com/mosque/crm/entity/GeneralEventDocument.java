package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;
import jakarta.validation.constraints.NotNull;

/**
 * GeneralEventDocument - Stores metadata for documents uploaded to a general event.
 * The actual file lives in S3/MinIO; this entity holds the storage key and metadata.
 * Documents can optionally be scoped to a specific session (sessionId nullable).
 */
@Entity
@Table(name = "org_general_event_documents")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class GeneralEventDocument implements OrganizationAware {

    @Id
    @TableGenerator(name = "gen_event_documents_seq", table = "sequences_",
            pkColumnName = "PK_NAME", pkColumnValue = "gen_event_documents_seq",
            valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "gen_event_documents_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "general_event_id", nullable = false)
    private GeneralEvent generalEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private GeneralEventSession session;

    @NotNull
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @NotNull
    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "uploaded_by")
    private Long uploadedBy;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    public GeneralEventDocument() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public GeneralEvent getGeneralEvent() { return generalEvent; }
    public void setGeneralEvent(GeneralEvent generalEvent) { this.generalEvent = generalEvent; }

    public GeneralEventSession getSession() { return session; }
    public void setSession(GeneralEventSession session) { this.session = session; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(Long uploadedBy) { this.uploadedBy = uploadedBy; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
