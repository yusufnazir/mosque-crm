package com.mosque.crm.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.mosque.crm.subscription.PlanEntitlementException;
import com.mosque.crm.subscription.PlanLimitExceededException;

/**
 * Global exception handler for cross-cutting concerns that aren't specific
 * to a single controller.
 *
 * <p>Currently handles:
 * <ul>
 *   <li>{@link PlanEntitlementException} → HTTP 403 with structured error body</li>
 * </ul>
 * </p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles plan entitlement violations thrown by {@link com.mosque.crm.subscription.PlanFeatureAspect}.
     * Returns HTTP 403 Forbidden with a structured body:
     * <pre>
     * {
     *   "code": "PLAN_ENTITLEMENT_REQUIRED",
     *   "message": "Feature not available on current subscription plan: reports.advanced",
     *   "featureKey": "reports.advanced"
     * }
     * </pre>
     */
    @ExceptionHandler(PlanEntitlementException.class)
    public ResponseEntity<Map<String, String>> handlePlanEntitlementException(PlanEntitlementException ex) {
        log.warn("Plan entitlement violation — featureKey={}: {}", ex.getFeatureKey(), ex.getMessage());

        Map<String, String> body = new LinkedHashMap<>();
        body.put("code", "PLAN_ENTITLEMENT_REQUIRED");
        body.put("message", ex.getMessage());
        body.put("featureKey", ex.getFeatureKey());

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    /**
     * Handles plan resource-limit violations (e.g. max admin users reached).
     * Returns HTTP 403 Forbidden with a structured body:
     * <pre>
     * {
     *   "code": "PLAN_LIMIT_EXCEEDED",
     *   "message": "Plan limit exceeded for 'admin.users.max': limit=2, current=2",
     *   "featureKey": "admin.users.max",
     *   "limit": "2",
     *   "current": "2"
     * }
     * </pre>
     */
    @ExceptionHandler(PlanLimitExceededException.class)
    public ResponseEntity<Map<String, String>> handlePlanLimitExceededException(PlanLimitExceededException ex) {
        log.warn("Plan limit exceeded — featureKey={}, limit={}, current={}: {}",
                ex.getFeatureKey(), ex.getLimit(), ex.getCurrent(), ex.getMessage());

        Map<String, String> body = new LinkedHashMap<>();
        body.put("code", "PLAN_LIMIT_EXCEEDED");
        body.put("message", ex.getMessage());
        body.put("featureKey", ex.getFeatureKey());
        body.put("limit", String.valueOf(ex.getLimit()));
        body.put("current", String.valueOf(ex.getCurrent()));

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }
}
