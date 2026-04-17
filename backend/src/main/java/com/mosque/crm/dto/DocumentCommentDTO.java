package com.mosque.crm.dto;

public class DocumentCommentDTO {
    private Long id;
    private Long documentId;
    private String content;
    private Long authorUserId;
    private Long parentCommentId;
    private boolean resolved;
    private Long resolvedByUserId;
    private String createdAt;
    private String updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
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
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
