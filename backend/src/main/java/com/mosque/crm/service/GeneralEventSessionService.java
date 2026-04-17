package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.GeneralEventSessionCreateDTO;
import com.mosque.crm.dto.GeneralEventSessionDTO;
import com.mosque.crm.entity.GeneralEvent;
import com.mosque.crm.entity.GeneralEventSession;
import com.mosque.crm.enums.AttendanceStatus;
import com.mosque.crm.repository.GeneralEventAttendanceRepository;
import com.mosque.crm.repository.GeneralEventRepository;
import com.mosque.crm.repository.GeneralEventSessionRepository;

@Service
public class GeneralEventSessionService {

    private static final Logger log = LoggerFactory.getLogger(GeneralEventSessionService.class);

    private final GeneralEventSessionRepository sessionRepository;
    private final GeneralEventRepository eventRepository;
    private final GeneralEventAttendanceRepository attendanceRepository;

    public GeneralEventSessionService(
            GeneralEventSessionRepository sessionRepository,
            GeneralEventRepository eventRepository,
            GeneralEventAttendanceRepository attendanceRepository) {
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public List<GeneralEventSessionDTO> listSessions(Long eventId) {
        return sessionRepository.findByGeneralEventIdOrderBySessionDateAscSessionOrderAsc(eventId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public GeneralEventSessionDTO createSession(Long eventId, GeneralEventSessionCreateDTO dto) {
        GeneralEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("General event not found: " + eventId));

        GeneralEventSession session = new GeneralEventSession();
        applyDto(dto, session);
        session.setGeneralEvent(event);
        session = sessionRepository.save(session);
        log.info("Created session '{}' for event {}", session.getSessionName(), eventId);
        return toDTO(session);
    }

    @Transactional
    public GeneralEventSessionDTO updateSession(Long sessionId, GeneralEventSessionCreateDTO dto) {
        GeneralEventSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        applyDto(dto, session);
        session = sessionRepository.save(session);
        log.info("Updated session id={}", sessionId);
        return toDTO(session);
    }

    @Transactional
    public void deleteSession(Long sessionId) {
        GeneralEventSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        sessionRepository.delete(session);
        log.info("Deleted session id={}", sessionId);
    }

    private void applyDto(GeneralEventSessionCreateDTO dto, GeneralEventSession session) {
        session.setSessionName(dto.getSessionName());
        session.setSessionDate(dto.getSessionDate());
        session.setStartTime(dto.getStartTime());
        session.setEndTime(dto.getEndTime());
        session.setLocation(dto.getLocation());
        session.setDescription(dto.getDescription());
        session.setCapacity(dto.getCapacity());
        session.setSessionOrder(dto.getSessionOrder());
    }

    GeneralEventSessionDTO toDTO(GeneralEventSession session) {
        GeneralEventSessionDTO dto = new GeneralEventSessionDTO();
        dto.setId(session.getId());
        dto.setGeneralEventId(session.getGeneralEvent() != null ? session.getGeneralEvent().getId() : null);
        dto.setSessionName(session.getSessionName());
        dto.setSessionDate(session.getSessionDate());
        dto.setStartTime(session.getStartTime());
        dto.setEndTime(session.getEndTime());
        dto.setLocation(session.getLocation());
        dto.setDescription(session.getDescription());
        dto.setCapacity(session.getCapacity());
        dto.setSessionOrder(session.getSessionOrder());
        dto.setCreatedAt(session.getCreatedAt());
        dto.setUpdatedAt(session.getUpdatedAt());

        // Attendance summary counts
        int present = (int) attendanceRepository.countBySessionIdAndStatus(session.getId(), AttendanceStatus.PRESENT)
                + (int) attendanceRepository.countBySessionIdAndStatus(session.getId(), AttendanceStatus.LATE);
        int absent = (int) attendanceRepository.countBySessionIdAndStatus(session.getId(), AttendanceStatus.ABSENT);
        int total = (int) (present + absent
                + attendanceRepository.countBySessionIdAndStatus(session.getId(), AttendanceStatus.EXCUSED));
        dto.setPresentCount(present);
        dto.setAbsentCount(absent);
        dto.setTotalAttendance(total);
        return dto;
    }
}
