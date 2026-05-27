package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.EventMemberGroup;
import com.mosque.crm.enums.EventKind;

public interface EventMemberGroupRepository extends JpaRepository<EventMemberGroup, Long> {

    List<EventMemberGroup> findByEventKindAndEventIdOrderByNameAsc(EventKind eventKind, Long eventId);

    void deleteByEventKindAndEventId(EventKind eventKind, Long eventId);
}
