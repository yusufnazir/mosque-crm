package com.mosque.crm.multitenancy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.persistence.PrePersist;

/**
 * JPA Entity Listener that automatically sets the mosque_id on entities
 * implementing {@link MosqueAware} before they are persisted.
 *
 * The mosque_id is taken from {@link TenantContext}, which is set per-request
 * by the {@link TenantInterceptor} based on the authenticated user's JWT.
 *
 * If the entity already has a mosque_id set (e.g., super admin creating data
 * for a specific mosque), the existing value is preserved.
 */
public class MosqueEntityListener {

    private static final Logger log = LoggerFactory.getLogger(MosqueEntityListener.class);

    @PrePersist
    public void setMosqueId(Object entity) {
        if (entity instanceof MosqueAware) {
            MosqueAware mosqueAware = (MosqueAware) entity;
            if (mosqueAware.getMosqueId() == null) {
                Long mosqueId = TenantContext.getCurrentMosqueId();
                if (mosqueId != null) {
                    mosqueAware.setMosqueId(mosqueId);
                    log.debug("Auto-set mosque_id={} on {}", mosqueId, entity.getClass().getSimpleName());
                }
            }
        }
    }
}
