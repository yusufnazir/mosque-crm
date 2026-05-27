package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.DistributionEvent;

import jakarta.persistence.LockModeType;

@Repository
public interface DistributionEventRepository extends JpaRepository<DistributionEvent, Long> {

    List<DistributionEvent> findByYearOrderByCreatedAtDesc(int year);

    List<DistributionEvent> findAllByOrderByYearDescCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM DistributionEvent e WHERE e.id = :id")
    Optional<DistributionEvent> findByIdForUpdate(@Param("id") Long id);
}
