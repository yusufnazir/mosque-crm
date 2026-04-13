package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.JoinRequest;

@Repository
public interface JoinRequestRepository extends JpaRepository<JoinRequest, Long> {

    List<JoinRequest> findByStatusOrderBySubmittedAtDesc(String status);

    List<JoinRequest> findAllByOrderBySubmittedAtDesc();

    boolean existsByEmailAndOrganizationId(String email, Long organizationId);

    boolean existsByEmailIgnoreCaseAndOrganizationId(String email, Long organizationId);

    long countByStatus(String status);

    /**
     * Find by token without tenant filter (used for public complete-registration endpoint).
     * Native query bypasses Hibernate @Filter for cross-tenant token lookup.
     */
    @Query(value = "SELECT * FROM join_requests WHERE approval_token = :token", nativeQuery = true)
    Optional<JoinRequest> findByApprovalTokenNative(@Param("token") String token);
}
