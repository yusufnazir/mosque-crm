package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.DistributionEvent;

@Repository
public interface DistributionEventRepository extends JpaRepository<DistributionEvent, Long> {

    List<DistributionEvent> findByYearOrderByCreatedAtDesc(int year);

    List<DistributionEvent> findAllByOrderByYearDescCreatedAtDesc();
}
