package com.mosque.crm.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.mosque.crm.exception.ActiveResourceAssignmentsException;
import com.mosque.crm.exception.BusinessImageException;
import com.mosque.crm.exception.SacrificeShareLimitExceededException;
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

    @ExceptionHandler(SacrificeShareLimitExceededException.class)
    public ResponseEntity<Map<String, String>> handleSacrificeShareLimitExceeded(
            SacrificeShareLimitExceededException ex) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("code", "SACRIFICE_SHARE_LIMIT_EXCEEDED");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(ActiveResourceAssignmentsException.class)
    public ResponseEntity<Map<String, String>> handleActiveResourceAssignmentsException(
            ActiveResourceAssignmentsException ex) {
        log.warn("Cannot close event — active resource assignments: {}", ex.getActiveCount());

        Map<String, String> body = new LinkedHashMap<>();
        body.put("code", "ACTIVE_RESOURCE_ASSIGNMENTS");
        body.put("message", ex.getMessage());
        body.put("activeCount", String.valueOf(ex.getActiveCount()));

        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    /**
     * Container-level upload cap (spring.servlet.multipart.max-file-size) — anything
     * bigger never reaches the controller, so translate it into a readable 400 instead
     * of a bodyless 500.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        log.warn("Upload rejected — exceeds multipart limit: {}", ex.getMessage());

        Map<String, String> body = new LinkedHashMap<>();
        body.put("code", "FILE_TOO_LARGE");
        body.put("error", "The uploaded file is too large.");
        body.put("message", "The uploaded file is too large.");

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Business-directory media failures. The response carries a stable {@code code}
     * (e.g. {@code STORAGE_UNAVAILABLE}) so the frontend can show a translated message;
     * the English message is only a fallback for other API clients.
     */
    @ExceptionHandler(BusinessImageException.class)
    public ResponseEntity<Map<String, String>> handleBusinessImageException(BusinessImageException ex) {
        log.warn("Business image rejected — code={}: {}", ex.getCode(), ex.getMessage());

        Map<String, String> body = new LinkedHashMap<>();
        body.put("code", ex.getCode());
        body.put("error", ex.getMessage());
        body.put("message", ex.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
