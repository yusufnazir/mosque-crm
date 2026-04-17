package com.mosque.crm.dto;

public class PlanEntitlementDTO {

    private String featureKey;
    private Boolean enabled;
    private Integer limitValue;
    /** Human-readable label from feature_definitions.display_label. */
    private String displayLabel;
    /** Display order from feature_definitions.sort_order. */
    private Integer sortOrder;

    public PlanEntitlementDTO() {
    }

    public PlanEntitlementDTO(String featureKey, Boolean enabled, Integer limitValue) {
        this.featureKey = featureKey;
        this.enabled = enabled;
        this.limitValue = limitValue;
    }

    public PlanEntitlementDTO(String featureKey, Boolean enabled, Integer limitValue,
                              String displayLabel, Integer sortOrder) {
        this.featureKey = featureKey;
        this.enabled = enabled;
        this.limitValue = limitValue;
        this.displayLabel = displayLabel;
        this.sortOrder = sortOrder;
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

    public String getDisplayLabel() {
        return displayLabel;
    }

    public void setDisplayLabel(String displayLabel) {
        this.displayLabel = displayLabel;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
