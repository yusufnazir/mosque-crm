package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.ParcelCategory;

@Repository
public interface ParcelCategoryRepository extends JpaRepository<ParcelCategory, Long> {

    List<ParcelCategory> findByDistributionEventIdOrderByNameAsc(Long distributionEventId);

    void deleteByDistributionEventId(Long distributionEventId);
}
