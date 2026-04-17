package com.mosque.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Canonical catalogue of plan feature keys.
 * Provides the display label, sort order, and type for every feature key
 * so that both the admin billing UI and the public pricing page use the
 * database as the single source of truth — no hardcoded label maps needed.
 */
@Entity
@Table(name = "feature_definitions")
public class FeatureDefinition {

    @Id
    @Column(name = "feature_key", length = 100)
    private String featureKey;

    @Column(name = "display_label", nullable = false, length = 200)
    private String displayLabel;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    /**
     * One of: ALWAYS_ON, BOOLEAN, LIMIT, PRO_ONLY
     */
    @Column(name = "feature_type", nullable = false, length = 20)
    private String featureType;

    public FeatureDefinition() {
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
