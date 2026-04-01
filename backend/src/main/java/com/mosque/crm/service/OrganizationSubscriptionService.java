package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.math.BigDecimal;
import java.math.RoundingMode;
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
import com.mosque.crm.dto.CreateSubscriptionPlanRequest;
import com.mosque.crm.dto.ChangeSubscriptionPlanResultDTO;
import com.mosque.crm.dto.UpdateSubscriptionPlanRequest;

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

    @Transactional
    public SubscriptionPlan createPlan(CreateSubscriptionPlanRequest request) {
        String normalizedCode = request.getCode().trim().toUpperCase();
        if (subscriptionPlanRepository.findByCode(normalizedCode).isPresent()) {
            throw new RuntimeException("Subscription plan already exists for code: " + normalizedCode);
        }

        SubscriptionPlan plan = new SubscriptionPlan();
        plan.setCode(normalizedCode);
        plan.setName(request.getName().trim());
        plan.setDescription(request.getDescription());
        plan.setMonthlyPrice(request.getMonthlyPrice());
        plan.setYearlyPrice(request.getYearlyPrice());
        plan.setIsActive(request.getIsActive() == null ? Boolean.TRUE : request.getIsActive());

        if (request.getEntitlements() != null) {
            for (CreateSubscriptionPlanRequest.PlanEntitlementInput input : request.getEntitlements()) {
                PlanEntitlement entitlement = new PlanEntitlement();
                entitlement.setFeatureKey(input.getFeatureKey());
                entitlement.setEnabled(input.getEnabled());
                entitlement.setLimitValue(input.getLimitValue());
                plan.addEntitlement(entitlement);
            }
        }

        SubscriptionPlan saved = subscriptionPlanRepository.save(plan);
        log.info("Created subscription plan code={} id={}", saved.getCode(), saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public OrganizationSubscription getCurrentSubscription(Long mosqueId) {
        LocalDateTime now = LocalDateTime.now();
        List<OrganizationSubscriptionStatus> activeStates = List.of(
                OrganizationSubscriptionStatus.TRIALING,
                OrganizationSubscriptionStatus.ACTIVE,
                OrganizationSubscriptionStatus.PAST_DUE);

        return organizationSubscriptionRepository
            .findFirstByMosqueIdAndStatusInAndStartsAtLessThanEqualOrderByStartsAtDesc(mosqueId, activeStates, now)
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

    @Transactional
    public SubscriptionPlanDTO createPlanAsDTO(CreateSubscriptionPlanRequest request) {
        return toPlanDTO(createPlan(request));
    }

    @Transactional
    public SubscriptionPlan updatePlan(String code, UpdateSubscriptionPlanRequest request) {
        SubscriptionPlan plan = getPlanByCode(code.trim().toUpperCase());

        plan.setName(request.getName().trim());
        plan.setDescription(request.getDescription());
        plan.setMonthlyPrice(request.getMonthlyPrice());
        plan.setYearlyPrice(request.getYearlyPrice());
        plan.setIsActive(request.getIsActive());

        plan.getEntitlements().clear();
        if (request.getEntitlements() != null) {
            for (CreateSubscriptionPlanRequest.PlanEntitlementInput input : request.getEntitlements()) {
                PlanEntitlement entitlement = new PlanEntitlement();
                entitlement.setFeatureKey(input.getFeatureKey());
                entitlement.setEnabled(input.getEnabled());
                entitlement.setLimitValue(input.getLimitValue());
                plan.addEntitlement(entitlement);
            }
        }

        SubscriptionPlan saved = subscriptionPlanRepository.save(plan);
        log.info("Updated subscription plan code={} id={}", saved.getCode(), saved.getId());
        return saved;
    }

    @Transactional
    public SubscriptionPlanDTO updatePlanAsDTO(String code, UpdateSubscriptionPlanRequest request) {
        return toPlanDTO(updatePlan(code, request));
    }

    @Transactional
    public SubscriptionPlan deactivatePlan(String code) {
        SubscriptionPlan plan = getPlanByCode(code.trim().toUpperCase());
        plan.setIsActive(false);
        SubscriptionPlan saved = subscriptionPlanRepository.save(plan);
        log.info("Deactivated subscription plan code={} id={}", saved.getCode(), saved.getId());
        return saved;
    }

    @Transactional
    public SubscriptionPlanDTO deactivatePlanAsDTO(String code) {
        return toPlanDTO(deactivatePlan(code));
    }

    @Transactional
    public ChangeSubscriptionPlanResultDTO changeCurrentPlan(Long mosqueId, String requestedPlanCode) {
        return evaluatePlanChange(mosqueId, requestedPlanCode, true);
    }

    @Transactional(readOnly = true)
    public ChangeSubscriptionPlanResultDTO previewCurrentPlanChange(Long mosqueId, String requestedPlanCode) {
        return evaluatePlanChange(mosqueId, requestedPlanCode, false);
    }

    private ChangeSubscriptionPlanResultDTO evaluatePlanChange(Long mosqueId,
            String requestedPlanCode,
            boolean applyChanges) {
        OrganizationSubscription current = getCurrentSubscription(mosqueId);
        SubscriptionPlan targetPlan = getPlanByCode(requestedPlanCode.trim().toUpperCase());

        if (current.getPlan().getCode().equalsIgnoreCase(targetPlan.getCode())) {
            throw new RuntimeException("Current plan is already " + targetPlan.getCode());
        }

        BigDecimal currentPrice = getPriceForCycle(current.getPlan(), current.getBillingCycle());
        BigDecimal targetPrice = getPriceForCycle(targetPlan, current.getBillingCycle());
        LocalDateTime now = LocalDateTime.now();
        BillingPeriodWindow periodWindow = resolveCurrentPeriodWindow(current, now);
        LocalDateTime periodEnd = periodWindow.getEnd();

        ChangeSubscriptionPlanResultDTO result = new ChangeSubscriptionPlanResultDTO();

        if (targetPrice.compareTo(currentPrice) > 0) {
            BigDecimal amountDue = calculateProratedDifference(
                    currentPrice,
                    targetPrice,
                    periodWindow.getStart(),
                    periodEnd,
                    now);
            long daysLeft = Math.max(0, ChronoUnit.DAYS.between(now.toLocalDate(), periodEnd.toLocalDate()));

            OrganizationSubscription saved = current;
            if (applyChanges) {
                current.setPlan(targetPlan);
                saved = organizationSubscriptionRepository.save(current);
            }

            result.setAction(applyChanges ? "UPGRADE_IMMEDIATE" : "UPGRADE_PREVIEW");
            result.setMessage(applyChanges
                    ? "Plan upgraded immediately with prorated charge for remaining period"
                    : "Upgrade preview with prorated charge for remaining period");
            result.setAmountDueNow(amountDue);
            result.setRemainingDays((int) daysLeft);
            result.setEffectiveAt(applyChanges ? now : current.getStartsAt());
            result.setSubscription(toSubscriptionDTO(saved));
            return result;
        }

        // Downgrade: keep current plan active until period end, then switch.
        if (applyChanges) {
            cancelFutureScheduledSubscriptions(mosqueId, now);

            OrganizationSubscription scheduled = new OrganizationSubscription();
            scheduled.setMosqueId(mosqueId);
            scheduled.setPlan(targetPlan);
            scheduled.setBillingCycle(current.getBillingCycle());
            scheduled.setStatus(OrganizationSubscriptionStatus.ACTIVE);
            scheduled.setStartsAt(periodEnd);
            scheduled.setEndsAt(addCycle(periodEnd, current.getBillingCycle()));
            scheduled.setAutoRenew(Boolean.TRUE.equals(current.getAutoRenew()));
            organizationSubscriptionRepository.save(scheduled);
        }

        result.setAction(applyChanges ? "DOWNGRADE_SCHEDULED" : "DOWNGRADE_PREVIEW");
        result.setMessage(applyChanges
                ? "Downgrade scheduled and will apply at the next renewal date"
                : "Downgrade preview. Change will apply at the next renewal date");
        result.setAmountDueNow(BigDecimal.ZERO);
        result.setRemainingDays((int) Math.max(0, ChronoUnit.DAYS.between(now.toLocalDate(), periodEnd.toLocalDate())));
        result.setEffectiveAt(periodEnd);
        result.setSubscription(toSubscriptionDTO(current));
        return result;
    }

    @Transactional
    public ChangeSubscriptionPlanResultDTO changeCurrentPlanForCurrentMosque(String requestedPlanCode) {
        Long mosqueId = TenantContext.getCurrentMosqueId();
        if (mosqueId == null) {
            throw new RuntimeException("No tenant context is set for current request");
        }
        return changeCurrentPlan(mosqueId, requestedPlanCode);
    }

    @Transactional(readOnly = true)
    public ChangeSubscriptionPlanResultDTO previewCurrentPlanChangeForCurrentMosque(String requestedPlanCode) {
        Long mosqueId = TenantContext.getCurrentMosqueId();
        if (mosqueId == null) {
            throw new RuntimeException("No tenant context is set for current request");
        }
        return previewCurrentPlanChange(mosqueId, requestedPlanCode);
    }

    private void cancelFutureScheduledSubscriptions(Long mosqueId, LocalDateTime now) {
        List<OrganizationSubscriptionStatus> activeStates = List.of(
                OrganizationSubscriptionStatus.TRIALING,
                OrganizationSubscriptionStatus.ACTIVE,
                OrganizationSubscriptionStatus.PAST_DUE);

        List<OrganizationSubscription> futureRows = organizationSubscriptionRepository
                .findByMosqueIdAndStatusInAndStartsAtGreaterThanOrderByStartsAtAsc(mosqueId, activeStates, now);

        for (OrganizationSubscription row : futureRows) {
            row.setStatus(OrganizationSubscriptionStatus.CANCELED);
            row.setCanceledAt(now);
            organizationSubscriptionRepository.save(row);
        }
    }

    private BigDecimal getPriceForCycle(SubscriptionPlan plan, PlanBillingCycle cycle) {
        return cycle == PlanBillingCycle.YEARLY ? plan.getYearlyPrice() : plan.getMonthlyPrice();
    }

    private BillingPeriodWindow resolveCurrentPeriodWindow(OrganizationSubscription subscription, LocalDateTime now) {
        LocalDateTime anchor = subscription.getStartsAt();
        if (anchor == null) {
            anchor = now;
        }

        LocalDateTime start = anchor;
        LocalDateTime end = addCycle(start, subscription.getBillingCycle());
        while (!end.isAfter(now)) {
            start = end;
            end = addCycle(end, subscription.getBillingCycle());
        }

        if (subscription.getEndsAt() != null && subscription.getEndsAt().isAfter(now)) {
            return new BillingPeriodWindow(start, subscription.getEndsAt());
        }

        return new BillingPeriodWindow(start, end);
    }

    private LocalDateTime addCycle(LocalDateTime dateTime, PlanBillingCycle cycle) {
        return cycle == PlanBillingCycle.YEARLY ? dateTime.plusYears(1) : dateTime.plusMonths(1);
    }

    private BigDecimal calculateProratedDifference(BigDecimal currentPrice,
            BigDecimal targetPrice,
            LocalDateTime periodStart,
            LocalDateTime periodEnd,
            LocalDateTime now) {

        if (periodStart == null) {
            periodStart = now;
        }
        long totalSeconds = Math.max(1L, ChronoUnit.SECONDS.between(periodStart, periodEnd));
        long remainingSeconds = Math.max(0L, ChronoUnit.SECONDS.between(now, periodEnd));

        BigDecimal difference = targetPrice.subtract(currentPrice);
        BigDecimal ratio = BigDecimal.valueOf(remainingSeconds)
                .divide(BigDecimal.valueOf(totalSeconds), 8, RoundingMode.HALF_UP);

        return difference.multiply(ratio).setScale(2, RoundingMode.HALF_UP);
    }

    private static class BillingPeriodWindow {
        private final LocalDateTime start;
        private final LocalDateTime end;

        BillingPeriodWindow(LocalDateTime start, LocalDateTime end) {
            this.start = start;
            this.end = end;
        }

        LocalDateTime getStart() {
            return start;
        }

        LocalDateTime getEnd() {
            return end;
        }
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
