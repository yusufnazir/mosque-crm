package com.mosque.crm.entity;

import com.mosque.crm.enums.FolderVisibility;
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
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "org_document_folders")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class DocumentFolder implements OrganizationAware {

    @Id
    @TableGenerator(name = "doc_folder_seq", table = "sequences_", pkColumnName = "PK_NAME",
        pkColumnValue = "doc_folder_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "doc_folder_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "parent_folder_id")
    private Long parentFolderId;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 30)
    private FolderVisibility visibility = FolderVisibility.PRIVATE;

    @Column(name = "max_file_size_mb")
    private Integer maxFileSizeMb;

    @Column(name = "allowed_mime_types", length = 2000)
    private String allowedMimeTypes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getParentFolderId() { return parentFolderId; }
    public void setParentFolderId(Long parentFolderId) { this.parentFolderId = parentFolderId; }

    public Long getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(Long ownerUserId) { this.ownerUserId = ownerUserId; }

    public FolderVisibility getVisibility() { return visibility; }
    public void setVisibility(FolderVisibility visibility) { this.visibility = visibility; }

    public Integer getMaxFileSizeMb() { return maxFileSizeMb; }
    public void setMaxFileSizeMb(Integer maxFileSizeMb) { this.maxFileSizeMb = maxFileSizeMb; }

    public String getAllowedMimeTypes() { return allowedMimeTypes; }
    public void setAllowedMimeTypes(String allowedMimeTypes) { this.allowedMimeTypes = allowedMimeTypes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
