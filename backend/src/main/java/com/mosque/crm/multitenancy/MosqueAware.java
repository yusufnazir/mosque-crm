package com.mosque.crm.multitenancy;

/**
 * Interface for entities that belong to a specific mosque (tenant).
 *
 * Implementing this interface allows the {@link MosqueEntityListener}
 * to automatically set the mosque_id from {@link TenantContext} on persist.
 */
public interface MosqueAware {

    Long getMosqueId();

    void setMosqueId(Long mosqueId);
}
