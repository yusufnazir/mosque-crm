package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE LOWER(u.email) = LOWER(:email) AND u.organizationId = :organizationId")
    boolean existsByEmailIgnoreCaseAndOrganizationId(@Param("email") String email, @Param("organizationId") Long organizationId);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    long countByOrganizationId(Long organizationId);

    @Query("SELECT DISTINCT u FROM User u JOIN u.roles r "
            + "WHERE ((u.organizationId = :orgId AND r.name = 'ADMIN') "
            + "OR (r.name = 'SUPER_ADMIN' AND (u.selectedOrganizationId = :orgId OR u.organizationId = :orgId))) "
            + "AND u.email IS NOT NULL AND u.email <> ''")
    List<User> findAdminUsersWithEmail(@Param("orgId") Long orgId);
}
