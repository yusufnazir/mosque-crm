package com.mosque.crm.dto;

public class DocumentVersionDTO {
    private Long id;
    private Long documentId;
    private int versionNumber;
    private long fileSize;
    private String changeNote;
    private Long changedByUserId;
    private String createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    public int getVersionNumber() { return versionNumber; }
    public void setVersionNumber(int versionNumber) { this.versionNumber = versionNumber; }
    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }
    public String getChangeNote() { return changeNote; }
    public void setChangeNote(String changeNote) { this.changeNote = changeNote; }
    public Long getChangedByUserId() { return changedByUserId; }
    public void setChangedByUserId(Long changedByUserId) { this.changedByUserId = changedByUserId; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
