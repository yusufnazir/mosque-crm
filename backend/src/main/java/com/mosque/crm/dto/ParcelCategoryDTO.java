package com.mosque.crm.dto;

import java.time.LocalDateTime;

public class ParcelCategoryDTO {

    private Long id;
    private Long distributionEventId;
    private String name;
    private String description;
    private int totalParcels;
    private int distributedParcels;
    private int nonMemberAllocation;
    private int remainingParcels;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ParcelCategoryDTO() {
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getTotalParcels() {
        return totalParcels;
    }

    public void setTotalParcels(int totalParcels) {
        this.totalParcels = totalParcels;
    }

    public int getDistributedParcels() {
        return distributedParcels;
    }

    public void setDistributedParcels(int distributedParcels) {
        this.distributedParcels = distributedParcels;
    }

    public int getNonMemberAllocation() {
        return nonMemberAllocation;
    }

    public void setNonMemberAllocation(int nonMemberAllocation) {
        this.nonMemberAllocation = nonMemberAllocation;
    }

    public int getRemainingParcels() {
        return remainingParcels;
    }

    public void setRemainingParcels(int remainingParcels) {
        this.remainingParcels = remainingParcels;
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
