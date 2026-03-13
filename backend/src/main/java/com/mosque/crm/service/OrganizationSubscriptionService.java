package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.OrganizationSubscription;
import com.mosque.crm.entity.PlanEntitlement;
import com.mosque.crm.entity.SubscriptionPlan;
import com.mosque.crm.enums.OrganizationSubscriptionStatus;
import com.mosque.crm.enums.PlanBillingCycle;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.OrganizationSubscriptionRepository;
import com.mosque.crm.repository.PlanEntitlementRepository;
import com.mosque.crm.repository.SubscriptionPlanRepository;
import com.mosque.crm.subscription.PlanEntitlementException;
import com.mosque.crm.dto.OrganizationSubscriptionDTO;
import com.mosque.crm.dto.PlanEntitlementDTO;
import com.mosque.crm.dto.SubscriptionPlanDTO;

@Service
public class OrganizationSubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationSubscriptionService.class);

    private final OrganizationSubscriptionRepository organizationSubscriptionRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final PlanEntitlementRepository planEntitlementRepository;

    public OrganizationSubscriptionService(OrganizationSubscriptionRepository organizationSubscriptionRepository,
            SubscriptionPlanRepository subscriptionPlanRepository,
            PlanEntitlementRepository planEntitlementRepository) {
        this.organizationSubscriptionRepository = organizationSubscriptionRepository;
        this.subscriptionPlanRepository = subscriptionPlanRepository;
        this.planEntitlementRepository = planEntitlementRepository;
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPlan> getActivePlans() {
        return subscriptionPlanRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public SubscriptionPlan getPlanByCode(String code) {
        return subscriptionPlanRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Subscription plan not found for code: " + code));
    }

    @Transactional(readOnly = true)
    public OrganizationSubscription getCurrentSubscription(Long mosqueId) {
        List<OrganizationSubscriptionStatus> activeStates = List.of(
                OrganizationSubscriptionStatus.TRIALING,
                OrganizationSubscriptionStatus.ACTIVE,
                OrganizationSubscriptionStatus.PAST_DUE);

        return organizationSubscriptionRepository
                .findFirstByMosqueIdAndStatusInOrderByStartsAtDesc(mosqueId, activeStates)
                .orElseThrow(() -> new RuntimeException("No active subscription found for mosqueId: " + mosqueId));
    }

    @Transactional(readOnly = true)
    public OrganizationSubscription getCurrentSubscriptionForCurrentMosque() {
        Long mosqueId = TenantContext.getCurrentMosqueId();
        if (mosqueId == null) {
            throw new RuntimeException("No tenant context is set for current request");
        }
        return getCurrentSubscription(mosqueId);
    }

    @Transactional(readOnly = true)
    public boolean isFeatureEnabled(Long mosqueId, String featureKey) {
        OrganizationSubscription subscription = getCurrentSubscription(mosqueId);
        PlanEntitlement entitlement = planEntitlementRepository
                .findByPlanIdAndFeatureKey(subscription.getPlan().getId(), featureKey)
                .orElse(null);
        return entitlement != null && Boolean.TRUE.equals(entitlement.getEnabled());
    }

    @Transactional(readOnly = true)
    public Integer getFeatureLimit(Long mosqueId, String featureKey) {
        OrganizationSubscription subscription = getCurrentSubscription(mosqueId);
        return planEntitlementRepository
                .findByPlanIdAndFeatureKey(subscription.getPlan().getId(), featureKey)
                .map(PlanEntitlement::getLimitValue)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public void assertFeatureEnabled(Long mosqueId, String featureKey) {
        if (!isFeatureEnabled(mosqueId, featureKey)) {
            throw new PlanEntitlementException(featureKey);
        }
    }

    @Transactional
    public OrganizationSubscription createSubscription(Long mosqueId,
            String planCode,
            PlanBillingCycle billingCycle,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            Boolean autoRenew) {

        SubscriptionPlan plan = getPlanByCode(planCode);

        OrganizationSubscription subscription = new OrganizationSubscription();
        subscription.setMosqueId(mosqueId);
        subscription.setPlan(plan);
        subscription.setBillingCycle(billingCycle);
        subscription.setStatus(OrganizationSubscriptionStatus.ACTIVE);
        subscription.setStartsAt(startsAt != null ? startsAt : LocalDateTime.now());
        subscription.setEndsAt(endsAt);
        subscription.setAutoRenew(autoRenew != null ? autoRenew : true);

        OrganizationSubscription saved = organizationSubscriptionRepository.save(subscription);
        log.info("Created subscription id={} for mosqueId={} with plan={}",
                saved.getId(), mosqueId, planCode);
        return saved;
    }

    @Transactional
    public OrganizationSubscription updateSubscriptionStatus(Long subscriptionId,
            OrganizationSubscriptionStatus status,
            LocalDateTime canceledAt) {

        OrganizationSubscription subscription = organizationSubscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new RuntimeException("Subscription not found with id: " + subscriptionId));

        subscription.setStatus(status);
        if (canceledAt != null) {
            subscription.setCanceledAt(canceledAt);
        }

        OrganizationSubscription saved = organizationSubscriptionRepository.save(subscription);
        log.info("Updated subscription id={} to status={}", saved.getId(), status);
        return saved;
    }

    // -------------------------------------------------------------------------
    // DTO mapping helpers
    // -------------------------------------------------------------------------

    public SubscriptionPlanDTO toPlanDTO(SubscriptionPlan plan) {
        SubscriptionPlanDTO dto = new SubscriptionPlanDTO();
        dto.setId(plan.getId());
        dto.setCode(plan.getCode());
        dto.setName(plan.getName());
        dto.setDescription(plan.getDescription());
        dto.setMonthlyPrice(plan.getMonthlyPrice());
        dto.setYearlyPrice(plan.getYearlyPrice());
        dto.setIsActive(plan.getIsActive());
        dto.setCreatedAt(plan.getCreatedAt());
        dto.setUpdatedAt(plan.getUpdatedAt());
        if (plan.getEntitlements() != null) {
            dto.setEntitlements(plan.getEntitlements().stream()
                    .map(e -> new PlanEntitlementDTO(e.getFeatureKey(), e.getEnabled(), e.getLimitValue()))
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    public OrganizationSubscriptionDTO toSubscriptionDTO(OrganizationSubscription sub) {
        OrganizationSubscriptionDTO dto = new OrganizationSubscriptionDTO();
        dto.setId(sub.getId());
        dto.setMosqueId(sub.getMosqueId());
        dto.setBillingCycle(sub.getBillingCycle());
        dto.setStatus(sub.getStatus());
        dto.setStartsAt(sub.getStartsAt());
        dto.setEndsAt(sub.getEndsAt());
        dto.setTrialEndsAt(sub.getTrialEndsAt());
        dto.setCanceledAt(sub.getCanceledAt());
        dto.setAutoRenew(sub.getAutoRenew());
        dto.setProviderRef(sub.getProviderRef());
        dto.setCurrentlyActive(sub.isCurrentlyActive());
        dto.setCreatedAt(sub.getCreatedAt());
        dto.setUpdatedAt(sub.getUpdatedAt());
        if (sub.getPlan() != null) {
            dto.setPlan(toPlanDTO(sub.getPlan()));
        }
        return dto;
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPlanDTO> getActivePlansAsDTO() {
        return subscriptionPlanRepository.findByIsActiveTrue().stream()
                .map(this::toPlanDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SubscriptionPlanDTO getPlanByCodeAsDTO(String code) {
        return toPlanDTO(getPlanByCode(code));
    }

    @Transactional(readOnly = true)
    public OrganizationSubscriptionDTO getCurrentSubscriptionDTO(Long mosqueId) {
        return toSubscriptionDTO(getCurrentSubscription(mosqueId));
    }

    @Transactional(readOnly = true)
    public OrganizationSubscriptionDTO getCurrentSubscriptionDTOForCurrentMosque() {
        return toSubscriptionDTO(getCurrentSubscriptionForCurrentMosque());
    }
}
