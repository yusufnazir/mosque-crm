package com.mosque.crm.dto;

/**
 * Represents a single feature catalogue entry returned by
 * {@code GET /subscription/features}.
 *
 * featureType is one of: ALWAYS_ON, BOOLEAN, LIMIT, PRO_ONLY
 */
public class FeatureDefinitionDTO {

    private String featureKey;
    private String displayLabel;
    private Integer sortOrder;
    private String featureType;

    public FeatureDefinitionDTO() {
    }

    public FeatureDefinitionDTO(String featureKey, String displayLabel, Integer sortOrder, String featureType) {
        this.featureKey = featureKey;
        this.displayLabel = displayLabel;
        this.sortOrder = sortOrder;
        this.featureType = featureType;
    }

    public String getFeatureKey() {
        return featureKey;
    }

    public void setFeatureKey(String featureKey) {
        this.featureKey = featureKey;
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

    public String getFeatureType() {
        return featureType;
    }

    public void setFeatureType(String featureType) {
        this.featureType = featureType;
    }
}
