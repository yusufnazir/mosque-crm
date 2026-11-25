package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.BusinessImage;

@Repository
public interface BusinessImageRepository extends JpaRepository<BusinessImage, Long> {

    List<BusinessImage> findByBusinessIdOrderBySortOrderAscIdAsc(Long businessId);

    Optional<BusinessImage> findByIdAndBusinessId(Long id, Long businessId);

    long countByBusinessId(Long businessId);

    List<BusinessImage> findByBusinessId(Long businessId);
}
