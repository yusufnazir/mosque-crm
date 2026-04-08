package com.mosque.crm.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Configuration;

@Repository
public interface ConfigurationRepository extends JpaRepository<Configuration, Long> {

    /**
     * Filtered query (respects Hibernate organizationFilter).
     * Used for general lookups when the org context is already established.
     */
    Optional<Configuration> findByName(String name);

    /**
     * Native query — bypasses the Hibernate organizationFilter.
     * Returns the system-wide (global) configuration with organization_id IS NULL.
     */
    @Query(value = "SELECT * FROM configurations WHERE name = :name AND organization_id IS NULL LIMIT 1", nativeQuery = true)
    Optional<Configuration> findGlobalByName(@Param("name") String name);

    /**
     * Native query — bypasses the Hibernate organizationFilter.
     * Returns the org-specific override for the given configuration key.
     */
    @Query(value = "SELECT * FROM configurations WHERE name = :name AND organization_id = :organizationId LIMIT 1", nativeQuery = true)
    Optional<Configuration> findTenantByName(@Param("name") String name, @Param("organizationId") Long organizationId);
}
