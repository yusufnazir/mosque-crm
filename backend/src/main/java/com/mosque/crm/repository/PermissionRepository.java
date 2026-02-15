package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Permission;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {

    Optional<Permission> findByCode(String code);

    boolean existsByCode(String code);

    List<Permission> findByCategory(String category);

    /**
     * Find all permission codes for a given set of role IDs.
     * Used to resolve the effective permissions for a user from their active roles.
     */
    @Query("SELECT DISTINCT p.code FROM Permission p " +
           "JOIN p.roles r " +
           "WHERE r.id IN :roleIds")
    Set<String> findPermissionCodesByRoleIds(@Param("roleIds") Set<Long> roleIds);
}
