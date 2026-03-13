package com.mosque.crm.subscription;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method (or entire controller class) as requiring a
 * specific plan entitlement to be enabled for the current mosque.
 *
 * Usage:
 * <pre>
 *   {@literal @}GetMapping("/advanced-reports")
 *   {@literal @}PlanFeatureRequired("reports.advanced")
 *   public ResponseEntity<?> getAdvancedReport() { ... }
 * </pre>
 *
 * Enforced by {@link PlanFeatureAspect}. Super-admins (mosqueId == null)
 * bypass all plan checks.
 *
 * If the feature is not enabled, {@link PlanEntitlementException} is thrown
 * and the request returns HTTP 403 with code "PLAN_ENTITLEMENT_REQUIRED".
 */
@Documented
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface PlanFeatureRequired {

    /**
     * The feature key to check against the plan entitlements table.
     * Corresponds to {@code plan_entitlements.feature_key}.
     * Examples: "reports.advanced", "member.portal", "import.excel"
     */
    String value();
}
