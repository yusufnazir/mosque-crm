package com.mosque.crm.dto;

public class PlanEntitlementDTO {

    private String featureKey;
    private Boolean enabled;
    private Integer limitValue;

    public PlanEntitlementDTO() {
    }

    public PlanEntitlementDTO(String featureKey, Boolean enabled, Integer limitValue) {
        this.featureKey = featureKey;
        this.enabled = enabled;
        this.limitValue = limitValue;
    }

    public String getFeatureKey() {
        return featureKey;
    }

    public void setFeatureKey(String featureKey) {
        this.featureKey = featureKey;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Integer getLimitValue() {
        return limitValue;
    }

    public void setLimitValue(Integer limitValue) {
        this.limitValue = limitValue;
    }
}
