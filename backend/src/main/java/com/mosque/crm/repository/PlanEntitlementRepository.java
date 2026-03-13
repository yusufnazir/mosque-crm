package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.PlanEntitlement;

@Repository
public interface PlanEntitlementRepository extends JpaRepository<PlanEntitlement, Long> {

    List<PlanEntitlement> findByPlanId(Long planId);

    Optional<PlanEntitlement> findByPlanIdAndFeatureKey(Long planId, String featureKey);
}
