package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GeneralEvent;
import com.mosque.crm.enums.GeneralEventStatus;

@Repository
public interface GeneralEventRepository extends JpaRepository<GeneralEvent, Long> {

    List<GeneralEvent> findAllByOrderByStartDateDescCreatedAtDesc();

    List<GeneralEvent> findByStatusOrderByStartDateDesc(GeneralEventStatus status);
}
