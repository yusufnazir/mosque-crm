package com.mosque.crm.subscription;

/**
 * Thrown when a requested feature is not available on the organization's
 * current subscription plan.
 *
 * Caught by {@link com.mosque.crm.controller.GlobalExceptionHandler}
 * which maps it to HTTP 403 with code "PLAN_ENTITLEMENT_REQUIRED".
 */
public class PlanEntitlementException extends RuntimeException {

    private final String featureKey;

    public PlanEntitlementException(String featureKey) {
        super("Feature not available on current subscription plan: " + featureKey);
        this.featureKey = featureKey;
    }

    public PlanEntitlementException(String featureKey, String message) {
        super(message);
        this.featureKey = featureKey;
    }

    public String getFeatureKey() {
        return featureKey;
    }
}
