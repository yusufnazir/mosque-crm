package com.mosque.crm.subscription;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.OrganizationSubscriptionService;

/**
 * AOP aspect that enforces plan entitlement checks on methods (or controllers)
 * annotated with {@link PlanFeatureRequired}.
 *
 * <p>Intercepts the method call, resolves the current organization from
 * {@link TenantContext}, and delegates to
 * {@link OrganizationSubscriptionService#assertFeatureEnabled} to verify the
 * feature is included in the organization's active subscription plan.</p>
 *
 * <p>Super-admins (organizationId == null in TenantContext) bypass all plan checks.</p>
 *
 * <p>If the organization has no active subscription, or the feature is disabled on
 * their plan, a {@link PlanEntitlementException} is thrown, which is caught by
 * {@link com.mosque.crm.controller.GlobalExceptionHandler} and returned as
 * HTTP 403.</p>
 */
@Aspect
@Component
public class PlanFeatureAspect {

    private static final Logger log = LoggerFactory.getLogger(PlanFeatureAspect.class);

    private final OrganizationSubscriptionService organizationSubscriptionService;
    private final AuthorizationService authorizationService;

    public PlanFeatureAspect(OrganizationSubscriptionService organizationSubscriptionService,
                             AuthorizationService authorizationService) {
        this.organizationSubscriptionService = organizationSubscriptionService;
        this.authorizationService = authorizationService;
    }

    /**
     * Intercepts all methods annotated with {@link PlanFeatureRequired} and
     * verifies the current organization's plan allows access to the requested feature.
     */
    @Around("@annotation(planFeatureRequired)")
    public Object enforceFeatureAccess(ProceedingJoinPoint joinPoint,
                                        PlanFeatureRequired planFeatureRequired) throws Throwable {

        String featureKey = planFeatureRequired.value();
        Long organizationId = TenantContext.getCurrentOrganizationId();

        // Super-admins bypass all plan entitlement checks
        // Also bypass when a super-admin is scoped to an org via X-Organization-Id header
        if (organizationId == null || authorizationService.hasPermission("superadmin.manage")) {
            log.debug("Super-admin request — bypassing plan check for feature={}", featureKey);
            return joinPoint.proceed();
        }

        log.debug("Checking plan entitlement: organizationId={}, feature={}", organizationId, featureKey);

        try {
            organizationSubscriptionService.assertFeatureEnabled(organizationId, featureKey);
        } catch (PlanEntitlementException e) {
            log.warn("Plan entitlement denied: organizationId={}, feature={}", organizationId, featureKey);
            throw e;
        } catch (RuntimeException e) {
            // No active subscription found or other lookup failure — deny access
            log.warn("Subscription lookup failed for organizationId={}, feature={}: {}",
                    organizationId, featureKey, e.getMessage());
            throw new PlanEntitlementException(featureKey,
                    "No active subscription found. Feature access denied: " + featureKey);
        }

        return joinPoint.proceed();
    }

    /**
     * Class-level annotation support: intercepts all methods in classes
     * annotated with {@link PlanFeatureRequired}.
     */
    @Around("@within(planFeatureRequired)")
    public Object enforceClassLevelFeatureAccess(ProceedingJoinPoint joinPoint,
                                                   PlanFeatureRequired planFeatureRequired) throws Throwable {
        return enforceFeatureAccess(joinPoint, planFeatureRequired);
    }
}
