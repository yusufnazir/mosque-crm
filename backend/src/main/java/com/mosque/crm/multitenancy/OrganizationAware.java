package com.mosque.crm.multitenancy;

/**
 * Interface for entities that belong to a specific organization (tenant).
 *
 * Implementing this interface allows the {@link OrganizationEntityListener}
 * to automatically set the organization_id from {@link TenantContext} on persist.
 */
public interface OrganizationAware {

    Long getOrganizationId();

    void setOrganizationId(Long organizationId);
}
