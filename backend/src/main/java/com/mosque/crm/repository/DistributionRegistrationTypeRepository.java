package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.DistributionRegistrationType;

public interface DistributionRegistrationTypeRepository extends JpaRepository<DistributionRegistrationType, Long> {

    List<DistributionRegistrationType> findByDistributionEventIdOrderBySortOrderAscNameAsc(Long eventId);

    Optional<DistributionRegistrationType> findByDistributionEventIdAndNameIgnoreCase(Long eventId, String name);

    void deleteByDistributionEventId(Long eventId);

    long countByDistributionEventId(Long eventId);
}
