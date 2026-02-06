package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.UserRole;
import com.mosque.crm.entity.UserRoleId;

/**
 * Repository for UserRole entity.
 * Provides methods to query the user_roles junction table directly.
 */
@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    /**
     * Find all role assignments for a specific user.
     */
    List<UserRole> findByIdUserId(Long userId);

    /**
     * Find all users assigned to a specific role.
     */
    List<UserRole> findByIdRoleId(Long roleId);

    /**
     * Check if a user has a specific role.
     */
    boolean existsByIdUserIdAndIdRoleId(Long userId, Long roleId);

    /**
     * Delete all role assignments for a specific user.
     */
    void deleteByIdUserId(Long userId);

    /**
     * Count users assigned to a specific role.
     */
    long countByIdRoleId(Long roleId);

    /**
     * Find all users with their role details using JOIN FETCH.
     */
    @Query("SELECT ur FROM UserRole ur " +
           "JOIN FETCH ur.user u " +
           "JOIN FETCH ur.role r " +
           "WHERE ur.id.userId = :userId")
    List<UserRole> findByUserIdWithDetails(Long userId);
}
