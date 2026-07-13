package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.BusinessCategory;

@Repository
public interface BusinessCategoryRepository extends JpaRepository<BusinessCategory, Long> {

    @EntityGraph(attributePaths = "translations")
    List<BusinessCategory> findByActiveTrueOrderBySortOrderAsc();

    @EntityGraph(attributePaths = "translations")
    Optional<BusinessCategory> findByCode(String code);

    boolean existsByCodeAndActiveTrue(String code);
}
