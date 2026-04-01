package com.mosque.crm.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.CreateSubscriptionRequest;
import com.mosque.crm.dto.CreateSubscriptionPlanRequest;
import com.mosque.crm.dto.ChangeSubscriptionPlanRequest;
import com.mosque.crm.dto.ChangeSubscriptionPlanResultDTO;
import com.mosque.crm.dto.OrganizationSubscriptionDTO;
import com.mosque.crm.dto.SubscriptionPlanDTO;
import com.mosque.crm.dto.UpdateSubscriptionPlanRequest;
import com.mosque.crm.dto.UpdateSubscriptionStatusRequest;
import com.mosque.crm.enums.OrganizationSubscriptionStatus;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.service.OrganizationSubscriptionService;

import jakarta.validation.Valid;

/**
 * REST endpoints for subscription plan management.
 *
 * <p>Public (authenticated) endpoints:</p>
 * <ul>
 *   <li>GET  /subscription/current   — current mosque's active subscription + entitlements</li>
 *   <li>GET  /subscription/plans     — all active plans in the catalog</li>
 *   <li>GET  /subscription/plans/{code} — single plan by code (e.g. STARTER)</li>
 * </ul>
 *
 * <p>Admin/super-admin endpoints (under /admin/subscription):</p>
 * <ul>
 *   <li>POST /admin/subscription             — assign a subscription to a mosque</li>
 *   <li>PUT  /admin/subscription/{id}/status — lifecycle transition (CANCEL, ACTIVATE, etc.)</li>
 * </ul>
 *
 * Security is managed centrally in SecurityConfig — no annotations here.
 */
@RestController
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);

    private final OrganizationSubscriptionService organizationSubscriptionService;

    public SubscriptionController(OrganizationSubscriptionService organizationSubscriptionService) {
        this.organizationSubscriptionService = organizationSubscriptionService;
    }

    // -------------------------------------------------------------------------
    // Authenticated (any role): current mosque's subscription
    // -------------------------------------------------------------------------

    /**
     * Returns the current mosque's active subscription with full plan details
     * and entitlements matrix. Used by frontend to gate feature visibility.
     *
     * Super-admins operating without a mosque scope get a 204 No Content response.
     */
    @GetMapping("/subscription/current")
    public ResponseEntity<?> getCurrentSubscription() {
        Long mosqueId = TenantContext.getCurrentMosqueId();
        if (mosqueId == null) {
            // Super-admin without mosque scope — no subscription applicable
            return ResponseEntity.noContent().build();
        }
        try {
            OrganizationSubscriptionDTO dto = organizationSubscriptionService.getCurrentSubscriptionDTO(mosqueId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            log.debug("No active subscription for mosqueId={}: {}", mosqueId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("code", "NO_ACTIVE_SUBSCRIPTION",
                            "message", "No active subscription found for this organization"));
        }
    }

    /**
     * Returns all active plans in the catalog.
     * Used by upgrade/plan-selection UI.
     */
    @GetMapping("/subscription/plans")
    public ResponseEntity<List<SubscriptionPlanDTO>> getAvailablePlans() {
        List<SubscriptionPlanDTO> plans = organizationSubscriptionService.getActivePlansAsDTO();
        return ResponseEntity.ok(plans);
    }

    /**
     * Returns a single plan by its code (e.g. STARTER, GROWTH, PRO).
     */
    @GetMapping("/subscription/plans/{code}")
    public ResponseEntity<?> getPlanByCode(@PathVariable String code) {
        try {
            SubscriptionPlanDTO plan = organizationSubscriptionService.getPlanByCodeAsDTO(code.toUpperCase());
            return ResponseEntity.ok(plan);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("code", "PLAN_NOT_FOUND",
                            "message", "Plan not found: " + code));
        }
    }

    /**
     * Changes current mosque subscription plan.
     * Upgrade: applied immediately with prorated charge for remaining days.
     * Downgrade: scheduled at end of current billing period.
     */
    @PostMapping("/subscription/change-plan")
    public ResponseEntity<?> changePlan(@Valid @RequestBody ChangeSubscriptionPlanRequest request) {
        try {
            ChangeSubscriptionPlanResultDTO result =
                    organizationSubscriptionService.changeCurrentPlanForCurrentMosque(request.getPlanCode());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Previews current mosque subscription plan change impact without persisting.
     */
    @PostMapping("/subscription/change-plan/preview")
    public ResponseEntity<?> previewPlanChange(@Valid @RequestBody ChangeSubscriptionPlanRequest request) {
        try {
            ChangeSubscriptionPlanResultDTO result =
                    organizationSubscriptionService.previewCurrentPlanChangeForCurrentMosque(request.getPlanCode());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // Admin-only: assign and manage subscriptions
    // -------------------------------------------------------------------------

    /**
     * Assigns a subscription plan to a mosque. Intended for super-admin or
     * internal admin tooling.
     *
     * Body: { mosqueId, planCode, billingCycle, startsAt?, endsAt?, autoRenew? }
     */
    @PostMapping("/admin/subscription")
    public ResponseEntity<?> createSubscription(@Valid @RequestBody CreateSubscriptionRequest request) {
        try {
            OrganizationSubscriptionDTO created = organizationSubscriptionService.toSubscriptionDTO(
                    organizationSubscriptionService.createSubscription(
                            request.getMosqueId(),
                            request.getPlanCode(),
                            request.getBillingCycle(),
                            request.getStartsAt(),
                            request.getEndsAt(),
                            request.getAutoRenew()));
            log.info("POST /admin/subscription — created subscription id={} for mosqueId={}",
                    created.getId(), created.getMosqueId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            log.warn("Failed to create subscription: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Creates a new subscription plan with optional entitlements.
     * Body: { code, name, description?, monthlyPrice, yearlyPrice, isActive?, entitlements?[] }
     */
    @PostMapping("/admin/subscription/plans")
    public ResponseEntity<?> createPlan(@Valid @RequestBody CreateSubscriptionPlanRequest request) {
        try {
            SubscriptionPlanDTO created = organizationSubscriptionService.createPlanAsDTO(request);
            log.info("POST /admin/subscription/plans — created plan code={} id={}",
                    created.getCode(), created.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            log.warn("Failed to create subscription plan: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Updates an existing subscription plan by code.
     */
    @PutMapping("/admin/subscription/plans/{code}")
    public ResponseEntity<?> updatePlan(@PathVariable String code,
            @Valid @RequestBody UpdateSubscriptionPlanRequest request) {
        try {
            SubscriptionPlanDTO updated = organizationSubscriptionService.updatePlanAsDTO(code, request);
            log.info("PUT /admin/subscription/plans/{} — updated", code);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.warn("Failed to update subscription plan {}: {}", code, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Deletes a plan from selection by deactivating it.
     */
    @PutMapping("/admin/subscription/plans/{code}/deactivate")
    public ResponseEntity<?> deactivatePlan(@PathVariable String code) {
        try {
            SubscriptionPlanDTO updated = organizationSubscriptionService.deactivatePlanAsDTO(code);
            log.info("PUT /admin/subscription/plans/{}/deactivate — deactivated", code);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.warn("Failed to deactivate subscription plan {}: {}", code, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Transitions a subscription to a new lifecycle status.
     * Body: { status: "CANCELED" | "ACTIVE" | "EXPIRED" | "PAST_DUE" | "TRIALING" }
     */
    @PutMapping("/admin/subscription/{id}/status")
    public ResponseEntity<?> updateSubscriptionStatus(@PathVariable Long id,
            @Valid @RequestBody UpdateSubscriptionStatusRequest request) {
        try {
            LocalDateTime canceledAt = request.getStatus() == OrganizationSubscriptionStatus.CANCELED
                    ? LocalDateTime.now()
                    : null;
            OrganizationSubscriptionDTO updated = organizationSubscriptionService.toSubscriptionDTO(
                    organizationSubscriptionService.updateSubscriptionStatus(id, request.getStatus(), canceledAt));
            log.info("PUT /admin/subscription/{}/status — updated to {}", id, request.getStatus());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.warn("Failed to update subscription status for id={}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
