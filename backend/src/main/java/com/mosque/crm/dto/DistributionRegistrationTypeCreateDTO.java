package com.mosque.crm.dto;

import com.mosque.crm.enums.RegistrationFulfillmentMode;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class DistributionRegistrationTypeCreateDTO {

    @NotBlank
    @Size(max = 100)
    private String name;

    private Integer sortOrder;

    @NotNull
    private RegistrationFulfillmentMode fulfillmentMode;

    @NotNull
    @Min(1)
    private Integer defaultPlannedParcels;

    @Min(0)
    private Integer softLimit;

    private Boolean assignDistributionNumber;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public RegistrationFulfillmentMode getFulfillmentMode() { return fulfillmentMode; }
    public void setFulfillmentMode(RegistrationFulfillmentMode fulfillmentMode) { this.fulfillmentMode = fulfillmentMode; }

    public Integer getDefaultPlannedParcels() { return defaultPlannedParcels; }
    public void setDefaultPlannedParcels(Integer defaultPlannedParcels) { this.defaultPlannedParcels = defaultPlannedParcels; }

    public Integer getSoftLimit() { return softLimit; }
    public void setSoftLimit(Integer softLimit) { this.softLimit = softLimit; }

    public Boolean getAssignDistributionNumber() { return assignDistributionNumber; }
    public void setAssignDistributionNumber(Boolean assignDistributionNumber) {
        this.assignDistributionNumber = assignDistributionNumber;
    }
}
