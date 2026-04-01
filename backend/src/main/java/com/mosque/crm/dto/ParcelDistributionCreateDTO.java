package com.mosque.crm.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class ParcelDistributionCreateDTO {

    @NotNull(message = "Distribution event ID is required")
    private Long distributionEventId;

    @NotNull(message = "Recipient type is required")
    private String recipientType;

    @NotNull(message = "Recipient ID is required")
    private Long recipientId;

    @NotNull(message = "Parcel category ID is required")
    private Long parcelCategoryId;

    @NotNull(message = "Parcel count is required")
    @Min(value = 1, message = "Parcel count must be at least 1")
    private Integer parcelCount;

    private String distributedBy;

    public ParcelDistributionCreateDTO() {
    }

    public Long getDistributionEventId() {
        return distributionEventId;
    }

    public void setDistributionEventId(Long distributionEventId) {
        this.distributionEventId = distributionEventId;
    }

    public String getRecipientType() {
        return recipientType;
    }

    public void setRecipientType(String recipientType) {
        this.recipientType = recipientType;
    }

    public Long getRecipientId() {
        return recipientId;
    }

    public void setRecipientId(Long recipientId) {
        this.recipientId = recipientId;
    }

    public Long getParcelCategoryId() {
        return parcelCategoryId;
    }

    public void setParcelCategoryId(Long parcelCategoryId) {
        this.parcelCategoryId = parcelCategoryId;
    }

    public Integer getParcelCount() {
        return parcelCount;
    }

    public void setParcelCount(Integer parcelCount) {
        this.parcelCount = parcelCount;
    }

    public String getDistributedBy() {
        return distributedBy;
    }

    public void setDistributedBy(String distributedBy) {
        this.distributedBy = distributedBy;
    }
}
