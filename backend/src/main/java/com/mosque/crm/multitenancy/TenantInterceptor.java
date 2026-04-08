package com.mosque.crm.multitenancy;

import org.hibernate.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/**
 * Spring MVC interceptor that enables the Hibernate "organizationFilter" for the
 * current request based on the organization_id stored in {@link TenantContext}.
 *
 * This interceptor runs AFTER the JWT authentication filter has set the
 * security context and TenantContext. It enables the Hibernate filter on
 * the current EntityManager Session so that all JPA queries automatically
 * include {@code WHERE organization_id = :organizationId}.
 *
 * For super administrators (TenantContext.getCurrentOrganizationId() == null),
 * the filter is NOT enabled, allowing them to see all organizations' data.
 *
 * Requires {@code spring.jpa.open-in-view=true} (Spring Boot default)
 * so the EntityManager is available throughout the request lifecycle.
 */
@Component
public class TenantInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(TenantInterceptor.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Long organizationId = TenantContext.getCurrentOrganizationId();

        // Super admin can scope to a specific organization via X-Organization-Id header
        if (organizationId == null) {
            String headerOrganizationId = request.getHeader("X-Organization-Id");
            if (headerOrganizationId != null && !headerOrganizationId.isBlank()) {
                try {
                    organizationId = Long.parseLong(headerOrganizationId.trim());
                    TenantContext.setCurrentOrganizationId(organizationId);
                    log.debug("Super admin scoping to organization_id={} via X-Organization-Id header", organizationId);
                } catch (NumberFormatException e) {
                    log.warn("Invalid X-Organization-Id header value: {}", headerOrganizationId);
                }
            }
        }

        if (organizationId != null) {
            try {
                Session session = entityManager.unwrap(Session.class);
                session.enableFilter("organizationFilter").setParameter("organizationId", organizationId);
                log.debug("Enabled organizationFilter for organization_id={} on request {}", organizationId, request.getRequestURI());
            } catch (Exception e) {
                log.error("CRITICAL: Failed to enable organizationFilter for organization_id={} on {}: {}",
                        organizationId, request.getRequestURI(), e.getMessage(), e);
                sendTenantIsolationError(response);
                return false;
            }
        }
        return true;
    }

    private void sendTenantIsolationError(HttpServletResponse response) {
        response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        response.setContentType("application/json");
        try {
            response.getWriter().write("{\"code\":\"TENANT_ISOLATION_FAILURE\",\"message\":\"Unable to establish data isolation. Request blocked for security.\"}");
        } catch (IOException ioEx) {
            log.error("Failed to write tenant isolation error response", ioEx);
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        TenantContext.clear();
    }
}
