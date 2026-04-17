package com.mosque.crm.dto;

public class DocumentQuotaDTO {
    private Long organizationId;
    private long storageUsedBytes;
    private Long storageLimitBytes;
    private long bandwidthUsedBytes;
    private Long bandwidthLimitBytes;
    private String bandwidthResetDate;
    private long addonStorageBytes;
    private long addonBandwidthBytes;
    private long totalStorageLimitBytes;
    private long totalBandwidthLimitBytes;

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
    public String getBandwidthResetDate() { return bandwidthResetDate; }
    public void setBandwidthResetDate(String bandwidthResetDate) { this.bandwidthResetDate = bandwidthResetDate; }
    public long getAddonStorageBytes() { return addonStorageBytes; }
    public void setAddonStorageBytes(long addonStorageBytes) { this.addonStorageBytes = addonStorageBytes; }
    public long getAddonBandwidthBytes() { return addonBandwidthBytes; }
    public void setAddonBandwidthBytes(long addonBandwidthBytes) { this.addonBandwidthBytes = addonBandwidthBytes; }
    public long getTotalStorageLimitBytes() { return totalStorageLimitBytes; }
    public void setTotalStorageLimitBytes(long totalStorageLimitBytes) { this.totalStorageLimitBytes = totalStorageLimitBytes; }
    public long getTotalBandwidthLimitBytes() { return totalBandwidthLimitBytes; }
    public void setTotalBandwidthLimitBytes(long totalBandwidthLimitBytes) { this.totalBandwidthLimitBytes = totalBandwidthLimitBytes; }
}
