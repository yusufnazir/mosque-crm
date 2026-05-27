package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.EventResource;

public interface EventResourceRepository extends JpaRepository<EventResource, Long> {

    List<EventResource> findByResourceTypeIdOrderByNameAsc(Long resourceTypeId);

    long countByResourceTypeId(Long resourceTypeId);

    List<EventResource> findByResourceTypeCategoryEventKindAndResourceTypeCategoryEventId(
            com.mosque.crm.enums.EventKind eventKind, Long eventId);
}
