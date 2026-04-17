package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.FeatureDefinition;

public interface FeatureDefinitionRepository extends JpaRepository<FeatureDefinition, String> {

    List<FeatureDefinition> findAllByOrderBySortOrderAsc();
}
