package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.enums.OrganizationSubscriptionStatus;
import com.mosque.crm.enums.PlanBillingCycle;
import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

@Entity
@Table(name = "organization_subscriptions")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class OrganizationSubscription implements OrganizationAware {

    @Id
    @TableGenerator(name = "organization_subscriptions_seq", table = "sequences_",
            pkColumnName = "PK_NAME", pkColumnValue = "organization_subscriptions_seq", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "organization_subscriptions_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "organization_id")
    private Long organizationId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private PlanBillingCycle billingCycle;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OrganizationSubscriptionStatus status;

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    @Column(name = "ends_at")
    private LocalDateTime endsAt;

    @Column(name = "trial_ends_at")
    private LocalDateTime trialEndsAt;

    @Column(name = "canceled_at")
    private LocalDateTime canceledAt;

    @Column(name = "auto_renew", nullable = false)
    private Boolean autoRenew = true;

    @Column(name = "provider_ref", length = 120)
    private String providerRef;

    @Column(name = "next_due_date")
    private LocalDateTime nextDueDate;

    @Column(name = "grace_end_date")
    private LocalDateTime graceEndDate;

    @Column(name = "read_only_date")
    private LocalDateTime readOnlyDate;

    @Column(name = "lock_date")
    private LocalDateTime lockDate;

    @Column(name = "last_payment_date")
    private LocalDateTime lastPaymentDate;

    @Column(name = "billing_enabled", nullable = false)
    private Boolean billingEnabled = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public OrganizationSubscription() {
    }

    public OrganizationSubscription(SubscriptionPlan plan, PlanBillingCycle billingCycle,
            OrganizationSubscriptionStatus status, LocalDateTime startsAt) {
        this.plan = plan;
        this.billingCycle = billingCycle;
        this.status = status;
        this.startsAt = startsAt;
        this.autoRenew = true;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public Long getOrganizationId() {
        return organizationId;
    }

    @Override
    public void setOrganizationId(Long organizationId) {
        this.organizationId = organizationId;
    }

    public SubscriptionPlan getPlan() {
        return plan;
    }

    public void setPlan(SubscriptionPlan plan) {
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

    public boolean isCurrentlyActive() {
        if (status != OrganizationSubscriptionStatus.ACTIVE
                && status != OrganizationSubscriptionStatus.TRIALING
                && status != OrganizationSubscriptionStatus.GRACE) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        boolean started = startsAt == null || !startsAt.isAfter(now);
        boolean notEnded = endsAt == null || !endsAt.isBefore(now);
        return started && notEnded;
    }
}
