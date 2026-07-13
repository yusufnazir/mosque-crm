package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Organization;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findByName(String name);

    Optional<Organization> findByHandle(String handle);

    Optional<Organization> findByFederationInviteCodeIgnoreCase(String federationInviteCode);

    boolean existsByFederationInviteCode(String federationInviteCode);

    List<Organization> findByActiveTrue();

    boolean existsByName(String name);

    boolean existsByHandle(String handle);

    @Query("""
            SELECT o FROM Organization o
            WHERE o.active = true
              AND o.id <> :excludeId
              AND (LOWER(o.name) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(o.handle) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(o.city) LIKE LOWER(CONCAT('%', :query, '%')))
            ORDER BY o.name ASC
            """)
    List<Organization> searchActiveOrganizations(@Param("query") String query, @Param("excludeId") Long excludeId);
}
