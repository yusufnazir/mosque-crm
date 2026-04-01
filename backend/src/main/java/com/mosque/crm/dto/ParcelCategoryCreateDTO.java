package com.mosque.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ParcelCategoryCreateDTO {

    @NotNull(message = "Distribution event ID is required")
    private Long distributionEventId;

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotNull(message = "Total parcels is required")
    private Integer totalParcels;

    private Integer nonMemberAllocation;

    public ParcelCategoryCreateDTO() {
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

    public Integer getTotalParcels() {
        return totalParcels;
    }

    public void setTotalParcels(Integer totalParcels) {
        this.totalParcels = totalParcels;
    }

    public Integer getNonMemberAllocation() {
        return nonMemberAllocation;
    }

    public void setNonMemberAllocation(Integer nonMemberAllocation) {
        this.nonMemberAllocation = nonMemberAllocation;
    }
}
