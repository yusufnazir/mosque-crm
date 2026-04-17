package com.mosque.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "org_document_quotas")
public class OrgDocumentQuota {

    @Id
    @TableGenerator(name = "doc_quota_seq", table = "sequences_", pkColumnName = "PK_NAME",
        pkColumnValue = "doc_quota_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "doc_quota_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "organization_id", nullable = false, unique = true)
    private Long organizationId;

    @Column(name = "storage_used_bytes", nullable = false)
    private long storageUsedBytes = 0L;

    @Column(name = "storage_limit_bytes")
    private Long storageLimitBytes;

    @Column(name = "bandwidth_used_bytes", nullable = false)
    private long bandwidthUsedBytes = 0L;

    @Column(name = "bandwidth_limit_bytes")
    private Long bandwidthLimitBytes;

    @Column(name = "bandwidth_reset_date")
    private LocalDate bandwidthResetDate;

    @Column(name = "addon_storage_bytes", nullable = false)
    private long addonStorageBytes = 0L;

    @Column(name = "addon_bandwidth_bytes", nullable = false)
    private long addonBandwidthBytes = 0L;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public long getStorageUsedBytes() { return storageUsedBytes; }
    public void setStorageUsedBytes(long storageUsedBytes) { this.storageUsedBytes = storageUsedBytes; }

    public Long getStorageLimitBytes() { return storageLimitBytes; }
    public void setStorageLimitBytes(Long storageLimitBytes) { this.storageLimitBytes = storageLimitBytes; }

    public long getBandwidthUsedBytes() { return bandwidthUsedBytes; }
    public void setBandwidthUsedBytes(long bandwidthUsedBytes) { this.bandwidthUsedBytes = bandwidthUsedBytes; }

    public Long getBandwidthLimitBytes() { return bandwidthLimitBytes; }
    public void setBandwidthLimitBytes(Long bandwidthLimitBytes) { this.bandwidthLimitBytes = bandwidthLimitBytes; }

    public LocalDate getBandwidthResetDate() { return bandwidthResetDate; }
    public void setBandwidthResetDate(LocalDate bandwidthResetDate) { this.bandwidthResetDate = bandwidthResetDate; }

    public long getAddonStorageBytes() { return addonStorageBytes; }
    public void setAddonStorageBytes(long addonStorageBytes) { this.addonStorageBytes = addonStorageBytes; }

    public long getAddonBandwidthBytes() { return addonBandwidthBytes; }
    public void setAddonBandwidthBytes(long addonBandwidthBytes) { this.addonBandwidthBytes = addonBandwidthBytes; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
