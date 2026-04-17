package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.GeneralEventDocument;

public interface GeneralEventDocumentRepository extends JpaRepository<GeneralEventDocument, Long> {

    List<GeneralEventDocument> findByGeneralEventIdOrderByCreatedAtDesc(Long generalEventId);

    List<GeneralEventDocument> findByGeneralEventIdAndSessionIdOrderByCreatedAtDesc(Long generalEventId, Long sessionId);

    int countByGeneralEventId(Long generalEventId);
}
