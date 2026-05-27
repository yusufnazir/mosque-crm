package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mosque.crm.entity.EventResourceAssignment;
import com.mosque.crm.enums.EventKind;
import com.mosque.crm.enums.EventResourceAssignmentStatus;

public interface EventResourceAssignmentRepository extends JpaRepository<EventResourceAssignment, Long> {

    Optional<EventResourceAssignment> findByResourceIdAndStatus(Long resourceId, EventResourceAssignmentStatus status);

    List<EventResourceAssignment> findByResourceIdOrderByAssignedAtDesc(Long resourceId);

    @Query("SELECT a FROM EventResourceAssignment a " +
           "JOIN a.resource r JOIN r.resourceType t JOIN t.category c " +
           "WHERE c.eventKind = :eventKind AND c.eventId = :eventId " +
           "ORDER BY a.assignedAt DESC")
    List<EventResourceAssignment> findByEvent(@Param("eventKind") EventKind eventKind, @Param("eventId") Long eventId);

    @Query("SELECT COUNT(a) FROM EventResourceAssignment a " +
           "JOIN a.resource r JOIN r.resourceType t JOIN t.category c " +
           "WHERE c.eventKind = :eventKind AND c.eventId = :eventId AND a.status = :status")
    long countByEventAndStatus(@Param("eventKind") EventKind eventKind, @Param("eventId") Long eventId,
            @Param("status") EventResourceAssignmentStatus status);

    void deleteByResourceId(Long resourceId);
}
