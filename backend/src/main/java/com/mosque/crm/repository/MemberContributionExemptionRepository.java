package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.MemberContributionExemption;

@Repository
public interface MemberContributionExemptionRepository extends JpaRepository<MemberContributionExemption, Long> {

    List<MemberContributionExemption> findByPersonId(Long personId);

    List<MemberContributionExemption> findByContributionTypeId(Long contributionTypeId);

    @Query("SELECT e FROM MemberContributionExemption e " +
           "WHERE e.person.id = :personId AND e.contributionType.id = :typeId " +
           "AND e.isActive = true " +
           "AND e.startDate <= CURRENT_DATE " +
           "AND (e.endDate IS NULL OR e.endDate >= CURRENT_DATE)")
    List<MemberContributionExemption> findActiveExemptions(
            @Param("personId") Long personId,
            @Param("typeId") Long contributionTypeId);

    @Query("SELECT e FROM MemberContributionExemption e " +
           "JOIN FETCH e.person JOIN FETCH e.contributionType " +
           "ORDER BY e.person.firstName, e.contributionType.code")
    List<MemberContributionExemption> findAllWithDetails();
}
