package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GeneralEventVolunteer;

@Repository
public interface GeneralEventVolunteerRepository extends JpaRepository<GeneralEventVolunteer, Long> {

    List<GeneralEventVolunteer> findByGeneralEventIdOrderByCreatedAtDesc(Long generalEventId);
}
