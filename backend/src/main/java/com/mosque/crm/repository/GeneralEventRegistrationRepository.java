package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GeneralEventRegistration;

@Repository
public interface GeneralEventRegistrationRepository extends JpaRepository<GeneralEventRegistration, Long> {

    List<GeneralEventRegistration> findByGeneralEventIdOrderByRegisteredAtDesc(Long generalEventId);
}
