package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Per-module opt-in sharing settings for an active partnership.
 * Default: enabled=false (nothing shared).
 */
@Entity
@Table(name = "organization_share_settings")
public class OrganizationShareSetting {

    public enum ShareLevel {
        PARENT_ONLY, SIBLINGS, PUBLIC
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partnership_id", nullable = false)
    private Long partnershipId;

    @Column(name = "module_key", nullable = false, length = 50)
    private String moduleKey;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = false;

    @Column(name = "share_level", nullable = false, length = 20)
    private String shareLevel = ShareLevel.PARENT_ONLY.name();

    @Column(name = "updated_by_user_id")
    private Long updatedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public OrganizationShareSetting() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPartnershipId() { return partnershipId; }
    public void setPartnershipId(Long partnershipId) { this.partnershipId = partnershipId; }

    public String getModuleKey() { return moduleKey; }
    public void setModuleKey(String moduleKey) { this.moduleKey = moduleKey; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getShareLevel() { return shareLevel; }
    public void setShareLevel(String shareLevel) { this.shareLevel = shareLevel; }

    public Long getUpdatedByUserId() { return updatedByUserId; }
    public void setUpdatedByUserId(Long updatedByUserId) { this.updatedByUserId = updatedByUserId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
