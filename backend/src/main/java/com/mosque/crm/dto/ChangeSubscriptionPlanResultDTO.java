package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ChangeSubscriptionPlanResultDTO {

    private String action;
    private String message;
    private BigDecimal amountDueNow;
    private Integer remainingDays;
    private LocalDateTime effectiveAt;
    private OrganizationSubscriptionDTO subscription;

    public ChangeSubscriptionPlanResultDTO() {
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public BigDecimal getAmountDueNow() {
        return amountDueNow;
    }

    public void setAmountDueNow(BigDecimal amountDueNow) {
        this.amountDueNow = amountDueNow;
    }

    public Integer getRemainingDays() {
        return remainingDays;
    }

    public void setRemainingDays(Integer remainingDays) {
        this.remainingDays = remainingDays;
    }

    public LocalDateTime getEffectiveAt() {
        return effectiveAt;
    }

    public void setEffectiveAt(LocalDateTime effectiveAt) {
        this.effectiveAt = effectiveAt;
    }

    public OrganizationSubscriptionDTO getSubscription() {
        return subscription;
    }

    public void setSubscription(OrganizationSubscriptionDTO subscription) {
        this.subscription = subscription;
    }
}
