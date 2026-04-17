package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GeneralEventSession;

@Repository
public interface GeneralEventSessionRepository extends JpaRepository<GeneralEventSession, Long> {

    List<GeneralEventSession> findByGeneralEventIdOrderBySessionDateAscSessionOrderAsc(Long generalEventId);
}
