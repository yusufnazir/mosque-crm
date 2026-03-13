package com.mosque.crm.dto;

import java.time.LocalDateTime;

import com.mosque.crm.enums.PlanBillingCycle;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateSubscriptionRequest {

    @NotNull(message = "mosqueId is required")
    private Long mosqueId;

    @NotBlank(message = "planCode is required")
    private String planCode;

    @NotNull(message = "billingCycle is required")
    private PlanBillingCycle billingCycle;

    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private Boolean autoRenew = true;

    public CreateSubscriptionRequest() {
    }

    public Long getMosqueId() {
        return mosqueId;
    }

    public void setMosqueId(Long mosqueId) {
        this.mosqueId = mosqueId;
    }

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public PlanBillingCycle getBillingCycle() {
        return billingCycle;
    }

    public void setBillingCycle(PlanBillingCycle billingCycle) {
        this.billingCycle = billingCycle;
    }

    public LocalDateTime getStartsAt() {
        return startsAt;
    }

    public void setStartsAt(LocalDateTime startsAt) {
        this.startsAt = startsAt;
    }

    public LocalDateTime getEndsAt() {
        return endsAt;
    }

    public void setEndsAt(LocalDateTime endsAt) {
        this.endsAt = endsAt;
    }

    public Boolean getAutoRenew() {
        return autoRenew;
    }

    public void setAutoRenew(Boolean autoRenew) {
        this.autoRenew = autoRenew;
    }
}
