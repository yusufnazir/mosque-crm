package com.mosque.crm.dto;

import java.time.LocalDateTime;

/**
 * Business listing enriched with organization attribution for federation views.
 */
public class FederatedBusinessListingDTO extends BusinessDTO {

    private Long listingId;
    private String listedByOrganizationName;
    private String listedByOrganizationHandle;
    private LocalDateTime publishedAt;

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }

    public String getListedByOrganizationName() { return listedByOrganizationName; }
    public void setListedByOrganizationName(String listedByOrganizationName) {
        this.listedByOrganizationName = listedByOrganizationName;
    }

    public String getListedByOrganizationHandle() { return listedByOrganizationHandle; }
    public void setListedByOrganizationHandle(String listedByOrganizationHandle) {
        this.listedByOrganizationHandle = listedByOrganizationHandle;
    }

    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }
}
