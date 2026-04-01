package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UpdateSubscriptionPlanRequest {

    @NotBlank(message = "name is required")
    private String name;

    private String description;

    @NotNull(message = "monthlyPrice is required")
    @DecimalMin(value = "0.00", message = "monthlyPrice must be >= 0")
    private BigDecimal monthlyPrice;

    @NotNull(message = "yearlyPrice is required")
    @DecimalMin(value = "0.00", message = "yearlyPrice must be >= 0")
    private BigDecimal yearlyPrice;

    @NotNull(message = "isActive is required")
    private Boolean isActive;

    @Valid
    private List<CreateSubscriptionPlanRequest.PlanEntitlementInput> entitlements = new ArrayList<>();

    public UpdateSubscriptionPlanRequest() {
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

    public List<CreateSubscriptionPlanRequest.PlanEntitlementInput> getEntitlements() {
        return entitlements;
    }

    public void setEntitlements(List<CreateSubscriptionPlanRequest.PlanEntitlementInput> entitlements) {
        this.entitlements = entitlements;
    }
}
