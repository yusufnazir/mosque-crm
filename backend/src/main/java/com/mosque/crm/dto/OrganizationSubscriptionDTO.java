package com.mosque.crm.dto;

import java.time.LocalDateTime;

import com.mosque.crm.enums.OrganizationSubscriptionStatus;
import com.mosque.crm.enums.PlanBillingCycle;

public class OrganizationSubscriptionDTO {

    private Long id;
    private Long organizationId;
    private SubscriptionPlanDTO plan;
    private PlanBillingCycle billingCycle;
    private OrganizationSubscriptionStatus status;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private LocalDateTime trialEndsAt;
    private LocalDateTime canceledAt;
    private Boolean autoRenew;
    private String providerRef;
    private LocalDateTime nextDueDate;
    private LocalDateTime graceEndDate;
    private LocalDateTime readOnlyDate;
    private LocalDateTime lockDate;
    private LocalDateTime lastPaymentDate;
    private Boolean billingEnabled;
    private boolean currentlyActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public OrganizationSubscriptionDTO() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(Long organizationId) {
        this.organizationId = organizationId;
    }

    public SubscriptionPlanDTO getPlan() {
        return plan;
    }

    public void setPlan(SubscriptionPlanDTO plan) {
        this.plan = plan;
    }

    public PlanBillingCycle getBillingCycle() {
        return billingCycle;
    }

    public void setBillingCycle(PlanBillingCycle billingCycle) {
        this.billingCycle = billingCycle;
    }

    public OrganizationSubscriptionStatus getStatus() {
        return status;
    }

    public void setStatus(OrganizationSubscriptionStatus status) {
        this.status = status;
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

    public LocalDateTime getTrialEndsAt() {
        return trialEndsAt;
    }

    public void setTrialEndsAt(LocalDateTime trialEndsAt) {
        this.trialEndsAt = trialEndsAt;
    }

    public LocalDateTime getCanceledAt() {
        return canceledAt;
    }

    public void setCanceledAt(LocalDateTime canceledAt) {
        this.canceledAt = canceledAt;
    }

    public Boolean getAutoRenew() {
        return autoRenew;
    }

    public void setAutoRenew(Boolean autoRenew) {
        this.autoRenew = autoRenew;
    }

    public String getProviderRef() {
        return providerRef;
    }

    public void setProviderRef(String providerRef) {
        this.providerRef = providerRef;
    }

    public LocalDateTime getNextDueDate() {
        return nextDueDate;
    }

    public void setNextDueDate(LocalDateTime nextDueDate) {
        this.nextDueDate = nextDueDate;
    }

    public LocalDateTime getGraceEndDate() {
        return graceEndDate;
    }

    public void setGraceEndDate(LocalDateTime graceEndDate) {
        this.graceEndDate = graceEndDate;
    }

    public LocalDateTime getReadOnlyDate() {
        return readOnlyDate;
    }

    public void setReadOnlyDate(LocalDateTime readOnlyDate) {
        this.readOnlyDate = readOnlyDate;
    }

    public LocalDateTime getLockDate() {
        return lockDate;
    }

    public void setLockDate(LocalDateTime lockDate) {
        this.lockDate = lockDate;
    }

    public LocalDateTime getLastPaymentDate() {
        return lastPaymentDate;
    }

    public void setLastPaymentDate(LocalDateTime lastPaymentDate) {
        this.lastPaymentDate = lastPaymentDate;
    }

    public Boolean getBillingEnabled() {
        return billingEnabled;
    }

    public void setBillingEnabled(Boolean billingEnabled) {
        this.billingEnabled = billingEnabled;
    }

    public boolean isCurrentlyActive() {
        return currentlyActive;
    }

    public void setCurrentlyActive(boolean currentlyActive) {
        this.currentlyActive = currentlyActive;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
