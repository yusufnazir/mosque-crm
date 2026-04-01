package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateSubscriptionPlanRequest {

    @NotBlank(message = "code is required")
    private String code;

    @NotBlank(message = "name is required")
    private String name;

    private String description;

    @NotNull(message = "monthlyPrice is required")
    @DecimalMin(value = "0.00", message = "monthlyPrice must be >= 0")
    private BigDecimal monthlyPrice;

    @NotNull(message = "yearlyPrice is required")
    @DecimalMin(value = "0.00", message = "yearlyPrice must be >= 0")
    private BigDecimal yearlyPrice;

    private Boolean isActive = true;

    @Valid
    private List<PlanEntitlementInput> entitlements = new ArrayList<>();

    public CreateSubscriptionPlanRequest() {
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
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

    public BigDecimal getMonthlyPrice() {
        return monthlyPrice;
    }

    public void setMonthlyPrice(BigDecimal monthlyPrice) {
        this.monthlyPrice = monthlyPrice;
    }

    public BigDecimal getYearlyPrice() {
        return yearlyPrice;
    }

    public void setYearlyPrice(BigDecimal yearlyPrice) {
        this.yearlyPrice = yearlyPrice;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public List<PlanEntitlementInput> getEntitlements() {
        return entitlements;
    }

    public void setEntitlements(List<PlanEntitlementInput> entitlements) {
        this.entitlements = entitlements;
    }

    public static class PlanEntitlementInput {

        @NotBlank(message = "featureKey is required")
        private String featureKey;

        @NotNull(message = "enabled is required")
        private Boolean enabled;

        private Integer limitValue;

        public PlanEntitlementInput() {
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
}
