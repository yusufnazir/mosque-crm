package com.mosque.crm.subscription;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.mosque.crm.entity.OrganizationSubscription;
import com.mosque.crm.enums.OrganizationSubscriptionStatus;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.OrganizationSubscriptionRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Enforces subscription status on every authenticated request.
 *
 * <ul>
 *   <li><b>ACTIVE / TRIALING</b> — full access</li>
 *   <li><b>PAST_DUE / GRACE</b> — full access, but a {@code X-Subscription-Status}
 *       response header is added so the frontend can display a warning banner</li>
 *   <li><b>READ_ONLY</b> — only GET requests allowed; mutations blocked with 402</li>
 *   <li><b>LOCKED / CANCELED / EXPIRED / no subscription</b> — all requests blocked with
 *       HTTP 402 Payment Required</li>
 * </ul>
 *
 * Excluded paths (always allowed regardless of subscription status):
 * <ul>
 *   <li>{@code /auth/**} — login, logout, password reset</li>
 *   <li>{@code /me/**} — current-user context</li>
 *   <li>{@code /subscription/**} — users must be able to view/manage their subscription</li>
 *   <li>{@code /admin/subscription/**} — super-admin subscription management</li>
 * </ul>
 *
 * Super administrators bypass all checks (checked via SecurityContext authority).
 */
@Component
public class SubscriptionEnforcementInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionEnforcementInterceptor.class);

    private final OrganizationSubscriptionRepository organizationSubscriptionRepository;

    public SubscriptionEnforcementInterceptor(OrganizationSubscriptionRepository organizationSubscriptionRepository) {
        this.organizationSubscriptionRepository = organizationSubscriptionRepository;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (isSuperAdmin()) {
            return true;
        }

        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            return true;
        }

        LocalDateTime now = LocalDateTime.now();
        List<OrganizationSubscriptionStatus> usableStatuses = List.of(
                OrganizationSubscriptionStatus.TRIALING,
                OrganizationSubscriptionStatus.ACTIVE,
                OrganizationSubscriptionStatus.PAST_DUE,
                OrganizationSubscriptionStatus.GRACE,
                OrganizationSubscriptionStatus.READ_ONLY);

        Optional<OrganizationSubscription> subscriptionOpt = organizationSubscriptionRepository
                .findFirstByOrganizationIdAndStatusInAndStartsAtLessThanEqualOrderByStartsAtDesc(
                        organizationId, usableStatuses, now);

        if (subscriptionOpt.isEmpty()) {
            log.warn("Subscription enforcement: no active subscription for organizationId={}, blocking request {}",
                    organizationId, request.getRequestURI());
            sendPaymentRequired(response, "SUBSCRIPTION_INACTIVE",
                    "Your organization's subscription is inactive. Please contact your administrator.");
            return false;
        }

        OrganizationSubscription subscription = subscriptionOpt.get();
        OrganizationSubscriptionStatus status = subscription.getStatus();

        // Subscriptions with billing disabled always get full access
        if (Boolean.FALSE.equals(subscription.getBillingEnabled())) {
            return true;
        }

        // Always expose status in response header so the frontend can react
        response.setHeader("X-Subscription-Status", status.name());

        if (status == OrganizationSubscriptionStatus.PAST_DUE
                || status == OrganizationSubscriptionStatus.GRACE) {
            log.debug("Subscription enforcement: organizationId={} is {}, allowing request with warning header",
                    organizationId, status);
            return true;
        }

        if (status == OrganizationSubscriptionStatus.READ_ONLY) {
            String method = request.getMethod();
            if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) {
                log.debug("Subscription enforcement: organizationId={} is READ_ONLY, allowing {} request",
                        organizationId, method);
                return true;
            }
            log.warn("Subscription enforcement: organizationId={} is READ_ONLY, blocking {} {}",
                    organizationId, method, request.getRequestURI());
            sendPaymentRequired(response, "SUBSCRIPTION_READ_ONLY",
                    "Your subscription is overdue. Only read access is available until payment is received.");
            return false;
        }

        return true;
    }

    private boolean isSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> "SUPER_ADMIN".equals(a.getAuthority()));
    }

    private void sendPaymentRequired(HttpServletResponse response, String code, String message) {
        response.setStatus(402);
        response.setContentType("application/json");
        try {
            response.getWriter().write("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
        } catch (IOException e) {
            log.error("Failed to write 402 response", e);
        }
    }
}
