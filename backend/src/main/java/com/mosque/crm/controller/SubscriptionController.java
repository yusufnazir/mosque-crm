package com.mosque.crm.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
import com.mosque.crm.dto.FeatureDefinitionDTO;
import com.mosque.crm.dto.OrganizationSubscriptionDTO;
import com.mosque.crm.dto.RecordSubscriptionPaymentRequest;
import com.mosque.crm.dto.SubscriptionInvoiceDTO;
import com.mosque.crm.dto.SubscriptionPaymentDTO;
import com.mosque.crm.dto.SubscriptionPlanDTO;
import com.mosque.crm.dto.UpdateSubscriptionPlanRequest;
import com.mosque.crm.dto.UpdateSubscriptionStatusRequest;
import com.mosque.crm.enums.OrganizationSubscriptionStatus;
import com.mosque.crm.enums.PlanBillingCycle;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.entity.SubscriptionInvoice;
import com.mosque.crm.service.BillingService;
import com.mosque.crm.service.InvoicePdfService;
import com.mosque.crm.service.OrganizationSubscriptionService;

import jakarta.validation.Valid;

/**
 * REST endpoints for subscription plan management.
 *
 * <p>Public (authenticated) endpoints:</p>
 * <ul>
 *   <li>GET  /subscription/current   — current organization's active subscription + entitlements</li>
 *   <li>GET  /subscription/plans     — all active plans in the catalog</li>
 *   <li>GET  /subscription/plans/{code} — single plan by code (e.g. STARTER)</li>
 * </ul>
 *
 * <p>Admin/super-admin endpoints (under /admin/subscription):</p>
 * <ul>
 *   <li>POST /admin/subscription             — assign a subscription to a organization</li>
 *   <li>PUT  /admin/subscription/{id}/status — lifecycle transition (CANCEL, ACTIVATE, etc.)</li>
 * </ul>
 *
 * Security is managed centrally in SecurityConfig — no annotations here.
 */
@RestController
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);

    private final OrganizationSubscriptionService organizationSubscriptionService;
    private final BillingService billingService;
    private final InvoicePdfService invoicePdfService;

    public SubscriptionController(OrganizationSubscriptionService organizationSubscriptionService,
            BillingService billingService,
            InvoicePdfService invoicePdfService) {
        this.organizationSubscriptionService = organizationSubscriptionService;
        this.billingService = billingService;
        this.invoicePdfService = invoicePdfService;
    }

    // -------------------------------------------------------------------------
    // Authenticated (any role): current organization's subscription
    // -------------------------------------------------------------------------

    /**
     * Returns the current organization's active subscription with full plan details
     * and entitlements matrix. Used by frontend to gate feature visibility.
     *
     * Super-admins operating without a organization scope get a 204 No Content response.
     */
    @GetMapping("/subscription/current")
    public ResponseEntity<?> getCurrentSubscription() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            // Super-admin without organization scope — no subscription applicable
            return ResponseEntity.noContent().build();
        }
        try {
            OrganizationSubscriptionDTO dto = organizationSubscriptionService.getCurrentSubscriptionDTO(organizationId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            log.debug("No active subscription for organizationId={}: {}", organizationId, e.getMessage());
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
     * Returns the full feature catalogue ordered by sort_order.
     * Used by the admin billing UI and the public pricing page to derive
     * display labels and table ordering without any hardcoded frontend maps.
     */
    @GetMapping("/subscription/features")
    public ResponseEntity<List<FeatureDefinitionDTO>> getFeatureCatalogue() {
        return ResponseEntity.ok(organizationSubscriptionService.getFeatureDefinitions());
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
     * Changes current organization subscription plan.
     * Upgrade: applied immediately with prorated charge for remaining days.
     * Downgrade: scheduled at end of current billing period.
     */
    @PostMapping("/subscription/change-plan")
    public ResponseEntity<?> changePlan(@Valid @RequestBody ChangeSubscriptionPlanRequest request) {
        try {
            ChangeSubscriptionPlanResultDTO result =
                    organizationSubscriptionService.changeCurrentPlanForCurrentOrganization(request.getPlanCode());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Previews current organization subscription plan change impact without persisting.
     */
    @PostMapping("/subscription/change-plan/preview")
    public ResponseEntity<?> previewPlanChange(@Valid @RequestBody ChangeSubscriptionPlanRequest request) {
        try {
            ChangeSubscriptionPlanResultDTO result =
                    organizationSubscriptionService.previewCurrentPlanChangeForCurrentOrganization(request.getPlanCode());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Self-service: lets an authenticated user choose an initial plan for their
     * organization when no subscription exists yet.
     *
     * Body: { planCode }
     */
    @PostMapping("/subscription/choose-plan")
    public ResponseEntity<?> choosePlan(@Valid @RequestBody ChangeSubscriptionPlanRequest request) {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "No organization context available"));
        }
        try {
            // Check if there's already an active subscription
            try {
                organizationSubscriptionService.getCurrentSubscription(organizationId);
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Organization already has an active subscription. Use change-plan instead."));
            } catch (RuntimeException ignored) {
                // No active subscription — proceed with creation
            }

            OrganizationSubscriptionDTO created = organizationSubscriptionService.toSubscriptionDTO(
                    organizationSubscriptionService.createSubscription(
                            organizationId,
                            request.getPlanCode(),
                            PlanBillingCycle.MONTHLY,
                            null, null, true, true));
            log.info("POST /subscription/choose-plan — created subscription id={} for organizationId={}",
                    created.getId(), created.getOrganizationId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            log.warn("Failed to choose plan: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // Admin-only: assign and manage subscriptions
    // -------------------------------------------------------------------------

    /**
     * Assigns a subscription plan to a organization. Intended for super-admin or
     * internal admin tooling.
     *
     * Body: { organizationId, planCode, billingCycle, startsAt?, endsAt?, autoRenew? }
     */
    @PostMapping("/admin/subscription")
    public ResponseEntity<?> createSubscription(@Valid @RequestBody CreateSubscriptionRequest request) {
        try {
            // Cancel any existing active subscriptions before assigning a new plan
            organizationSubscriptionService.cancelAllActiveSubscriptionsForOrganization(request.getOrganizationId());

            OrganizationSubscriptionDTO created = organizationSubscriptionService.toSubscriptionDTO(
                    organizationSubscriptionService.createSubscription(
                            request.getOrganizationId(),
                            request.getPlanCode(),
                            request.getBillingCycle(),
                            request.getStartsAt(),
                            request.getEndsAt(),
                            request.getAutoRenew(),
                            request.getBillingEnabled()));
            log.info("POST /admin/subscription — created subscription id={} for organizationId={}",
                    created.getId(), created.getOrganizationId());
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

    /**
     * Enables or disables billing for a specific subscription (tenant-level override).
     * Body: { billingEnabled: true | false }
     */
    @PatchMapping("/admin/subscription/{id}/billing-enabled")
    public ResponseEntity<?> updateBillingEnabled(@PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        try {
            Boolean billingEnabled = body.get("billingEnabled");
            if (billingEnabled == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "billingEnabled field is required"));
            }
            OrganizationSubscriptionDTO updated = organizationSubscriptionService.toSubscriptionDTO(
                    organizationSubscriptionService.updateBillingEnabled(id, billingEnabled));
            log.info("PATCH /admin/subscription/{}/billing-enabled — set to {}", id, billingEnabled);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.warn("Failed to update billingEnabled for subscription id={}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // Billing: invoices and payments
    // -------------------------------------------------------------------------

    @GetMapping("/subscription/invoices")
    public ResponseEntity<?> getInvoices() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            return ResponseEntity.noContent().build();
        }
        List<SubscriptionInvoiceDTO> invoices = billingService.getInvoicesForOrganization(organizationId)
                .stream()
                .map(billingService::toInvoiceDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(invoices);
    }

    @GetMapping("/subscription/invoices/{id}")
    public ResponseEntity<?> getInvoice(@PathVariable Long id) {
        try {
            SubscriptionInvoiceDTO dto = billingService.toInvoiceDTO(billingService.getInvoice(id));
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("code", "INVOICE_NOT_FOUND", "message", e.getMessage()));
        }
    }

    @GetMapping("/subscription/invoices/{id}/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable Long id) {
        try {
            SubscriptionInvoice invoice = billingService.getInvoice(id);
            SubscriptionInvoiceDTO dto = billingService.toInvoiceDTO(invoice);
            byte[] pdf = invoicePdfService.generate(invoice, dto.getOrganizationName(), dto.getPlanName());
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "invoice-" + id + ".pdf");
            headers.setContentLength(pdf.length);
            log.info("GET /subscription/invoices/{}/pdf — generated {} bytes", id, pdf.length);
            return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
        } catch (RuntimeException e) {
            log.warn("Failed to generate PDF for invoice {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/admin/subscription/invoices/{id}/payment")
    public ResponseEntity<?> recordPayment(@PathVariable Long id,
            @Valid @RequestBody RecordSubscriptionPaymentRequest request) {
        try {
            SubscriptionPaymentDTO dto = billingService.toPaymentDTO(
                    billingService.recordPayment(id, request));
            log.info("POST /admin/subscription/invoices/{}/payment — recorded payment", id);
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (RuntimeException e) {
            log.warn("Failed to record payment for invoice {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/admin/subscription/invoices/{id}")
    public ResponseEntity<?> deleteInvoice(@PathVariable Long id) {
        try {
            billingService.deleteInvoice(id);
            log.info("DELETE /admin/subscription/invoices/{} — deleted", id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.warn("Failed to delete invoice {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
