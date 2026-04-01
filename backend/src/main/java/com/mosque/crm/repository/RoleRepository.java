package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Role;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(String name);

    Optional<Role> findByNameAndMosqueId(String name, Long mosqueId);

    Optional<Role> findByNameAndMosqueIdIsNull(String name);

    List<Role> findByNameInAndMosqueIdIsNull(List<String> names);

    List<Role> findByNameAndMosqueIdIsNotNull(String name);

    boolean existsByName(String name);

    boolean existsByNameAndMosqueId(String name, Long mosqueId);

    boolean existsByNameAndMosqueIdIsNull(String name);

    List<Role> findByMosqueId(Long mosqueId);

    List<Role> findByMosqueIdOrMosqueIdIsNull(Long mosqueId);

    List<Role> findByMosqueIdIsNull();

    /**
     * Find the union of all assignable roles across a set of role IDs.
     * Used by RoleGovernanceService to compute the effective "role pool" for a user.
     */
    @Query("SELECT DISTINCT ar FROM Role r JOIN r.assignableRoles ar WHERE r.id IN :roleIds")
    Set<Role> findAssignableRolesByRoleIds(@Param("roleIds") Set<Long> roleIds);
}
