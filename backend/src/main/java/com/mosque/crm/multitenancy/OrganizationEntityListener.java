package com.mosque.crm.multitenancy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.persistence.PrePersist;

/**
 * JPA Entity Listener that automatically sets the organization_id on entities
 * implementing {@link OrganizationAware} before they are persisted.
 *
 * The organization_id is taken from {@link TenantContext}, which is set per-request
 * by the {@link TenantInterceptor} based on the authenticated user's JWT.
 *
 * If the entity already has a organization_id set (e.g., super admin creating data
 * for a specific organization), the existing value is preserved.
 */
public class OrganizationEntityListener {

    private static final Logger log = LoggerFactory.getLogger(OrganizationEntityListener.class);

    @PrePersist
    public void setOrganizationId(Object entity) {
        if (entity instanceof OrganizationAware) {
            OrganizationAware organizationAware = (OrganizationAware) entity;
            if (organizationAware.getOrganizationId() == null) {
                Long organizationId = TenantContext.getCurrentOrganizationId();
                if (organizationId != null) {
                    organizationAware.setOrganizationId(organizationId);
                    log.debug("Auto-set organization_id={} on {}", organizationId, entity.getClass().getSimpleName());
                }
            }
        }
    }
}
