package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GeneralEventAttendance;
import com.mosque.crm.enums.AttendanceStatus;

@Repository
public interface GeneralEventAttendanceRepository extends JpaRepository<GeneralEventAttendance, Long> {

    List<GeneralEventAttendance> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    List<GeneralEventAttendance> findByGeneralEventIdOrderBySessionIdAscCreatedAtAsc(Long generalEventId);

    boolean existsBySessionIdAndRegistrationId(Long sessionId, Long registrationId);

    long countBySessionIdAndStatus(Long sessionId, AttendanceStatus status);
}
