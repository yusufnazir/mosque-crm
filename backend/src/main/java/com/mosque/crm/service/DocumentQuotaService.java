package com.mosque.crm.service;

import com.mosque.crm.dto.DocumentQuotaDTO;
import com.mosque.crm.entity.OrgDocumentQuota;
import com.mosque.crm.repository.OrgDocumentQuotaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentQuotaService {

    private static final Logger log = LoggerFactory.getLogger(DocumentQuotaService.class);

    // Default limits (256 MB storage, 2 GB bandwidth per month)
    private static final long DEFAULT_STORAGE_LIMIT = 256L * 1024 * 1024;
    private static final long DEFAULT_BANDWIDTH_LIMIT = 2L * 1024 * 1024 * 1024;

    private final OrgDocumentQuotaRepository quotaRepository;

    public DocumentQuotaService(OrgDocumentQuotaRepository quotaRepository) {
        this.quotaRepository = quotaRepository;
    }

    @Transactional
    public OrgDocumentQuota getOrCreateQuota(Long organizationId) {
        return quotaRepository.findByOrganizationId(organizationId).orElseGet(() -> {
            OrgDocumentQuota quota = new OrgDocumentQuota();
            quota.setOrganizationId(organizationId);
            quota.setStorageLimitBytes(DEFAULT_STORAGE_LIMIT);
            quota.setBandwidthLimitBytes(DEFAULT_BANDWIDTH_LIMIT);
            return quotaRepository.save(quota);
        });
    }

    @Transactional
    public void checkAndIncrementStorage(Long organizationId, long fileSizeBytes) {
        OrgDocumentQuota quota = getOrCreateQuota(organizationId);
        long effectiveLimit = (quota.getStorageLimitBytes() != null ? quota.getStorageLimitBytes() : DEFAULT_STORAGE_LIMIT)
            + quota.getAddonStorageBytes();
        if (quota.getStorageUsedBytes() + fileSizeBytes > effectiveLimit) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Storage quota exceeded");
        }
        quotaRepository.incrementStorage(organizationId, fileSizeBytes);
    }

    @Transactional
    public void decrementStorage(Long organizationId, long fileSizeBytes) {
        getOrCreateQuota(organizationId);
        quotaRepository.decrementStorage(organizationId, fileSizeBytes);
    }

    @Transactional
    public void incrementBandwidth(Long organizationId, long bytes) {
        getOrCreateQuota(organizationId);
        quotaRepository.incrementBandwidth(organizationId, bytes);
    }

    @Transactional(readOnly = true)
    public DocumentQuotaDTO getQuotaDTO(Long organizationId) {
        OrgDocumentQuota quota = getOrCreateQuota(organizationId);
        DocumentQuotaDTO dto = new DocumentQuotaDTO();
        dto.setOrganizationId(quota.getOrganizationId());
        dto.setStorageUsedBytes(quota.getStorageUsedBytes());
        dto.setStorageLimitBytes(quota.getStorageLimitBytes());
        dto.setBandwidthUsedBytes(quota.getBandwidthUsedBytes());
        dto.setBandwidthLimitBytes(quota.getBandwidthLimitBytes());
        dto.setBandwidthResetDate(quota.getBandwidthResetDate() != null ? quota.getBandwidthResetDate().toString() : null);
        dto.setAddonStorageBytes(quota.getAddonStorageBytes());
        dto.setAddonBandwidthBytes(quota.getAddonBandwidthBytes());
        long totalStorage = (quota.getStorageLimitBytes() != null ? quota.getStorageLimitBytes() : DEFAULT_STORAGE_LIMIT) + quota.getAddonStorageBytes();
        long totalBandwidth = (quota.getBandwidthLimitBytes() != null ? quota.getBandwidthLimitBytes() : DEFAULT_BANDWIDTH_LIMIT) + quota.getAddonBandwidthBytes();
        dto.setTotalStorageLimitBytes(totalStorage);
        dto.setTotalBandwidthLimitBytes(totalBandwidth);
        return dto;
    }
}
