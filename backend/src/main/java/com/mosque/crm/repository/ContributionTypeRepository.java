package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.ContributionType;

@Repository
public interface ContributionTypeRepository extends JpaRepository<ContributionType, Long> {

    List<ContributionType> findByIsActiveTrue();

    List<ContributionType> findByIsRequiredTrue();

    Optional<ContributionType> findByCode(String code);

    boolean existsByCode(String code);

    @Query("SELECT ct FROM ContributionType ct LEFT JOIN FETCH ct.translations WHERE ct.isActive = true")
    List<ContributionType> findAllActiveWithTranslations();

    @Query("SELECT ct FROM ContributionType ct LEFT JOIN FETCH ct.translations LEFT JOIN FETCH ct.obligations")
    List<ContributionType> findAllWithTranslationsAndObligations();

    @Query("SELECT ct FROM ContributionType ct LEFT JOIN FETCH ct.translations LEFT JOIN FETCH ct.obligations WHERE ct.id = :id")
    Optional<ContributionType> findByIdWithTranslationsAndObligations(@Param("id") Long id);
}
