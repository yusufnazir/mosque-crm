package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GeneralEventQuestion;

@Repository
public interface GeneralEventQuestionRepository extends JpaRepository<GeneralEventQuestion, Long> {

    List<GeneralEventQuestion> findByGeneralEventIdOrderBySortOrderAscIdAsc(Long generalEventId);

    long countByGeneralEventId(Long generalEventId);
}
