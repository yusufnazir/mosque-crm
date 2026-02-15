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

/**
 * Spring MVC interceptor that enables the Hibernate "mosqueFilter" for the
 * current request based on the mosque_id stored in {@link TenantContext}.
 *
 * This interceptor runs AFTER the JWT authentication filter has set the
 * security context and TenantContext. It enables the Hibernate filter on
 * the current EntityManager Session so that all JPA queries automatically
 * include {@code WHERE mosque_id = :mosqueId}.
 *
 * For super administrators (TenantContext.getCurrentMosqueId() == null),
 * the filter is NOT enabled, allowing them to see all mosques' data.
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
        Long mosqueId = TenantContext.getCurrentMosqueId();

        // Super admin can scope to a specific mosque via X-Mosque-Id header
        if (mosqueId == null) {
            String headerMosqueId = request.getHeader("X-Mosque-Id");
            if (headerMosqueId != null && !headerMosqueId.isBlank()) {
                try {
                    mosqueId = Long.parseLong(headerMosqueId.trim());
                    TenantContext.setCurrentMosqueId(mosqueId);
                    log.debug("Super admin scoping to mosque_id={} via X-Mosque-Id header", mosqueId);
                } catch (NumberFormatException e) {
                    log.warn("Invalid X-Mosque-Id header value: {}", headerMosqueId);
                }
            }
        }

        if (mosqueId != null) {
            try {
                Session session = entityManager.unwrap(Session.class);
                session.enableFilter("mosqueFilter").setParameter("mosqueId", mosqueId);
                log.debug("Enabled mosqueFilter for mosque_id={} on request {}", mosqueId, request.getRequestURI());
            } catch (Exception e) {
                log.warn("Failed to enable mosqueFilter: {}", e.getMessage());
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        TenantContext.clear();
    }
}
