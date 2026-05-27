package com.mosque.crm.dto;

import com.mosque.crm.enums.RegistrationFulfillmentMode;

public class DistributionRegistrationTypeDTO {

    private Long id;
    private Long distributionEventId;
    private String name;
    private int sortOrder;
    private RegistrationFulfillmentMode fulfillmentMode;
    private int defaultPlannedParcels;
    private Integer softLimit;
    private boolean assignDistributionNumber;
    private int registrationCount;
    private boolean overSoftLimit;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDistributionEventId() { return distributionEventId; }
    public void setDistributionEventId(Long distributionEventId) { this.distributionEventId = distributionEventId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public RegistrationFulfillmentMode getFulfillmentMode() { return fulfillmentMode; }
    public void setFulfillmentMode(RegistrationFulfillmentMode fulfillmentMode) { this.fulfillmentMode = fulfillmentMode; }

    public int getDefaultPlannedParcels() { return defaultPlannedParcels; }
    public void setDefaultPlannedParcels(int defaultPlannedParcels) { this.defaultPlannedParcels = defaultPlannedParcels; }

    public Integer getSoftLimit() { return softLimit; }
    public void setSoftLimit(Integer softLimit) { this.softLimit = softLimit; }

    public boolean isAssignDistributionNumber() { return assignDistributionNumber; }
    public void setAssignDistributionNumber(boolean assignDistributionNumber) {
        this.assignDistributionNumber = assignDistributionNumber;
    }

    public int getRegistrationCount() { return registrationCount; }
    public void setRegistrationCount(int registrationCount) { this.registrationCount = registrationCount; }

    public boolean isOverSoftLimit() { return overSoftLimit; }
    public void setOverSoftLimit(boolean overSoftLimit) { this.overSoftLimit = overSoftLimit; }
}
