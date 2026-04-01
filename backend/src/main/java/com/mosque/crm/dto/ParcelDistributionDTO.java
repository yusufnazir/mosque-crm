package com.mosque.crm.dto;

import java.time.LocalDateTime;

public class ParcelDistributionDTO {

    private Long id;
    private Long distributionEventId;
    private String recipientType;
    private Long recipientId;
    private String recipientName;
    private Long parcelCategoryId;
    private String parcelCategoryName;
    private int parcelCount;
    private String distributedBy;
    private LocalDateTime distributedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ParcelDistributionDTO() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public Long getParcelCategoryId() {
        return parcelCategoryId;
    }

    public void setParcelCategoryId(Long parcelCategoryId) {
        this.parcelCategoryId = parcelCategoryId;
    }

    public String getParcelCategoryName() {
        return parcelCategoryName;
    }

    public void setParcelCategoryName(String parcelCategoryName) {
        this.parcelCategoryName = parcelCategoryName;
    }

    public int getParcelCount() {
        return parcelCount;
    }

    public void setParcelCount(int parcelCount) {
        this.parcelCount = parcelCount;
    }

    public String getDistributedBy() {
        return distributedBy;
    }

    public void setDistributedBy(String distributedBy) {
        this.distributedBy = distributedBy;
    }

    public LocalDateTime getDistributedAt() {
        return distributedAt;
    }

    public void setDistributedAt(LocalDateTime distributedAt) {
        this.distributedAt = distributedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
