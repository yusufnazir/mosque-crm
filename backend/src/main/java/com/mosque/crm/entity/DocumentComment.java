package com.mosque.crm.entity;

import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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
@Table(name = "org_document_comments")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class DocumentComment implements OrganizationAware {

    @Id
    @TableGenerator(name = "doc_comment_seq", table = "sequences_", pkColumnName = "PK_NAME",
        pkColumnValue = "doc_comment_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "doc_comment_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    @Column(name = "parent_comment_id")
    private Long parentCommentId;

    @Column(name = "resolved", nullable = false)
    private boolean resolved = false;

    @Column(name = "resolved_by_user_id")
    private Long resolvedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Long getAuthorUserId() { return authorUserId; }
    public void setAuthorUserId(Long authorUserId) { this.authorUserId = authorUserId; }

    public Long getParentCommentId() { return parentCommentId; }
    public void setParentCommentId(Long parentCommentId) { this.parentCommentId = parentCommentId; }

    public boolean isResolved() { return resolved; }
    public void setResolved(boolean resolved) { this.resolved = resolved; }

    public Long getResolvedByUserId() { return resolvedByUserId; }
    public void setResolvedByUserId(Long resolvedByUserId) { this.resolvedByUserId = resolvedByUserId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
