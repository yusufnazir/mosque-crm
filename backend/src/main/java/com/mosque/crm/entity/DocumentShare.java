package com.mosque.crm.entity;

import com.mosque.crm.enums.DocumentAccessLevel;
import com.mosque.crm.enums.DocumentShareType;
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
@Table(name = "org_document_shares")
public class DocumentShare {

    @Id
    @TableGenerator(name = "doc_share_seq", table = "sequences_", pkColumnName = "PK_NAME",
        pkColumnValue = "doc_share_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "doc_share_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "share_type", nullable = false, length = 30)
    private DocumentShareType shareType;

    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(name = "target_role_id")
    private Long targetRoleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_level", nullable = false, length = 30)
    private DocumentAccessLevel accessLevel;

    @Column(name = "shared_by_user_id", nullable = false)
    private Long sharedByUserId;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "shared_at", updatable = false)
    private LocalDateTime sharedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public DocumentShareType getShareType() { return shareType; }
    public void setShareType(DocumentShareType shareType) { this.shareType = shareType; }

    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }

    public Long getTargetRoleId() { return targetRoleId; }
    public void setTargetRoleId(Long targetRoleId) { this.targetRoleId = targetRoleId; }

    public DocumentAccessLevel getAccessLevel() { return accessLevel; }
    public void setAccessLevel(DocumentAccessLevel accessLevel) { this.accessLevel = accessLevel; }

    public Long getSharedByUserId() { return sharedByUserId; }
    public void setSharedByUserId(Long sharedByUserId) { this.sharedByUserId = sharedByUserId; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getSharedAt() { return sharedAt; }
    public void setSharedAt(LocalDateTime sharedAt) { this.sharedAt = sharedAt; }
}
