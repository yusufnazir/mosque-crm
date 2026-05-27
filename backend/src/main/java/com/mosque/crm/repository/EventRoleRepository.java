package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.EventRole;
import com.mosque.crm.enums.EventKind;

public interface EventRoleRepository extends JpaRepository<EventRole, Long> {

    List<EventRole> findByEventKindAndEventIdOrderBySortOrderAscNameAsc(EventKind eventKind, Long eventId);

    void deleteByEventKindAndEventId(EventKind eventKind, Long eventId);

    long countByIdAndEventKindAndEventId(Long id, EventKind eventKind, Long eventId);
}
