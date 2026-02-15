package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.ContributionObligation;

@Repository
public interface ContributionObligationRepository extends JpaRepository<ContributionObligation, Long> {

    Optional<ContributionObligation> findByContributionTypeId(Long contributionTypeId);

    boolean existsByContributionTypeId(Long contributionTypeId);

    void deleteByContributionTypeId(Long contributionTypeId);

    @Query("SELECT o FROM ContributionObligation o JOIN FETCH o.contributionType WHERE o.id = :id")
    Optional<ContributionObligation> findByIdWithType(@Param("id") Long id);

    /**
     * Find all obligations for a contribution type, ordered by start date ascending.
     */
    List<ContributionObligation> findByContributionTypeIdOrderByStartDateAsc(Long contributionTypeId);
}
