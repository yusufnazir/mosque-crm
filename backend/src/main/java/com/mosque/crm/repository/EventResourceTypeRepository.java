package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.EventResourceType;

public interface EventResourceTypeRepository extends JpaRepository<EventResourceType, Long> {

    List<EventResourceType> findByCategoryIdOrderBySortOrderAscNameAsc(Long categoryId);

    long countByCategoryId(Long categoryId);
}
