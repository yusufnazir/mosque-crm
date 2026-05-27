package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.EventResourceCategory;
import com.mosque.crm.enums.EventKind;

public interface EventResourceCategoryRepository extends JpaRepository<EventResourceCategory, Long> {

    List<EventResourceCategory> findByEventKindAndEventIdOrderBySortOrderAscNameAsc(EventKind eventKind, Long eventId);

    void deleteByEventKindAndEventId(EventKind eventKind, Long eventId);
}
