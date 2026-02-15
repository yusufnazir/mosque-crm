package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.ContributionTypeTranslation;

@Repository
public interface ContributionTypeTranslationRepository extends JpaRepository<ContributionTypeTranslation, Long> {

    List<ContributionTypeTranslation> findByContributionTypeId(Long contributionTypeId);

    void deleteByContributionTypeId(Long contributionTypeId);
}
