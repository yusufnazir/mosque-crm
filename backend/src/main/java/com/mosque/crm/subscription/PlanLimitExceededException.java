package com.mosque.crm.subscription;

/**
 * Thrown when an organization has reached the maximum count allowed by their
 * subscription plan for a given resource (e.g. admin users).
 *
 * Caught by {@link com.mosque.crm.controller.GlobalExceptionHandler}
 * which maps it to HTTP 403 with code "PLAN_LIMIT_EXCEEDED".
 */
public class PlanLimitExceededException extends RuntimeException {

    private final String featureKey;
    private final int limit;
    private final int current;

    public PlanLimitExceededException(String featureKey, int limit, int current) {
        super(String.format(
                "Plan limit exceeded for '%s': limit=%d, current=%d", featureKey, limit, current));
        this.featureKey = featureKey;
        this.limit = limit;
        this.current = current;
    }

    public String getFeatureKey() {
        return featureKey;
    }

    public int getLimit() {
        return limit;
    }

    public int getCurrent() {
        return current;
    }
}
