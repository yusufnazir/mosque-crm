package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.MemberContributionAssignment;

@Repository
public interface MemberContributionAssignmentRepository extends JpaRepository<MemberContributionAssignment, Long> {

    /**
     * Find all assignments for a specific person.
     */
    @Query("SELECT a FROM MemberContributionAssignment a " +
           "JOIN FETCH a.person JOIN FETCH a.contributionType " +
           "WHERE a.person.id = :personId ORDER BY a.startDate DESC")
    List<MemberContributionAssignment> findByPersonId(@Param("personId") Long personId);

    /**
     * Find all assignments for a specific contribution type.
     */
    @Query("SELECT a FROM MemberContributionAssignment a " +
           "JOIN FETCH a.person JOIN FETCH a.contributionType " +
           "WHERE a.contributionType.id = :typeId ORDER BY a.person.firstName, a.person.lastName")
    List<MemberContributionAssignment> findByContributionTypeId(@Param("typeId") Long typeId);

    /**
     * Find a specific assignment by person and contribution type.
     */
    Optional<MemberContributionAssignment> findByPersonIdAndContributionTypeId(Long personId, Long contributionTypeId);

    /**
     * Check if an assignment exists for a person and contribution type.
     */
    boolean existsByPersonIdAndContributionTypeId(Long personId, Long contributionTypeId);

    /**
     * Find all assignments with details (for listing all assignments).
     */
    @Query("SELECT a FROM MemberContributionAssignment a " +
           "JOIN FETCH a.person JOIN FETCH a.contributionType " +
           "ORDER BY a.contributionType.code, a.person.firstName")
    List<MemberContributionAssignment> findAllWithDetails();

    /**
     * Find active assignments for a specific person.
     */
    @Query("SELECT a FROM MemberContributionAssignment a " +
           "JOIN FETCH a.person JOIN FETCH a.contributionType " +
           "WHERE a.person.id = :personId AND a.isActive = true ORDER BY a.startDate DESC")
    List<MemberContributionAssignment> findActiveByPersonId(@Param("personId") Long personId);

    /**
     * Delete all assignments for a specific contribution type.
     */
    void deleteByContributionTypeId(Long contributionTypeId);
}
