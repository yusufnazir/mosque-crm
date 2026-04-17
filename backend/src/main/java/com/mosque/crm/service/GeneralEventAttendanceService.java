package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.GeneralEventAttendanceCreateDTO;
import com.mosque.crm.dto.GeneralEventAttendanceDTO;
import com.mosque.crm.entity.GeneralEvent;
import com.mosque.crm.entity.GeneralEventAttendance;
import com.mosque.crm.entity.GeneralEventRegistration;
import com.mosque.crm.entity.GeneralEventSession;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.AttendanceStatus;
import com.mosque.crm.enums.RsvpStatus;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.GeneralEventAttendanceRepository;
import com.mosque.crm.repository.GeneralEventRegistrationRepository;
import com.mosque.crm.repository.GeneralEventRepository;
import com.mosque.crm.repository.GeneralEventSessionRepository;
import com.mosque.crm.repository.PersonRepository;

@Service
public class GeneralEventAttendanceService {

    private static final Logger log = LoggerFactory.getLogger(GeneralEventAttendanceService.class);

    private final GeneralEventAttendanceRepository attendanceRepository;
    private final GeneralEventSessionRepository sessionRepository;
    private final GeneralEventRepository eventRepository;
    private final GeneralEventRegistrationRepository registrationRepository;
    private final PersonRepository personRepository;

    public GeneralEventAttendanceService(
            GeneralEventAttendanceRepository attendanceRepository,
            GeneralEventSessionRepository sessionRepository,
            GeneralEventRepository eventRepository,
            GeneralEventRegistrationRepository registrationRepository,
            PersonRepository personRepository) {
        this.attendanceRepository = attendanceRepository;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.personRepository = personRepository;
    }

    public List<GeneralEventAttendanceDTO> listAttendance(Long eventId, Long sessionId) {
        return attendanceRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Pre-populate attendance rows from all confirmed registrations for this session.
     * Each registration gets an ABSENT row. Idempotent — skips if row already exists.
     */
    @Transactional
    public int prepopulateFromRegistrations(Long eventId, Long sessionId) {
        GeneralEventSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        GeneralEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found: " + eventId));

        List<GeneralEventRegistration> registrations = registrationRepository
                .findByGeneralEventIdOrderByRegisteredAtDesc(eventId)
                .stream()
                .filter(r -> r.getRsvpStatus() == RsvpStatus.CONFIRMED || r.getRsvpStatus() == null)
                .collect(Collectors.toList());

        int created = 0;
        for (GeneralEventRegistration reg : registrations) {
            if (!attendanceRepository.existsBySessionIdAndRegistrationId(sessionId, reg.getId())) {
                GeneralEventAttendance att = new GeneralEventAttendance();
                att.setGeneralEvent(event);
                att.setSession(session);
                att.setRegistration(reg);
                att.setPerson(reg.getPerson());
                att.setStatus(AttendanceStatus.ABSENT);
                att.setOrganizationId(TenantContext.getCurrentOrganizationId());
                attendanceRepository.save(att);
                created++;
            }
        }
        log.info("Pre-populated {} attendance rows for session {}", created, sessionId);
        return created;
    }

    /**
     * Mark a single attendance record (or create a walk-in).
     */
    @Transactional
    public GeneralEventAttendanceDTO markAttendance(Long eventId, Long sessionId,
            GeneralEventAttendanceCreateDTO dto, Long currentUserId) {
        GeneralEventSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        GeneralEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found: " + eventId));

        GeneralEventAttendance att;

        if (dto.getRegistrationId() != null) {
            // Update existing pre-populated row
            att = attendanceRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                    .stream()
                    .filter(a -> a.getRegistration() != null
                            && a.getRegistration().getId().equals(dto.getRegistrationId()))
                    .findFirst()
                    .orElseGet(() -> {
                        GeneralEventAttendance newAtt = new GeneralEventAttendance();
                        newAtt.setGeneralEvent(event);
                        newAtt.setSession(session);
                        newAtt.setOrganizationId(TenantContext.getCurrentOrganizationId());
                        GeneralEventRegistration reg = registrationRepository.findById(dto.getRegistrationId())
                                .orElseThrow(() -> new RuntimeException("Registration not found: " + dto.getRegistrationId()));
                        newAtt.setRegistration(reg);
                        newAtt.setPerson(reg.getPerson());
                        return newAtt;
                    });
        } else {
            // Walk-in
            att = new GeneralEventAttendance();
            att.setGeneralEvent(event);
            att.setSession(session);
            att.setOrganizationId(TenantContext.getCurrentOrganizationId());
            att.setWalkInName(dto.getWalkInName());
            if (dto.getPersonId() != null) {
                Person person = personRepository.findById(dto.getPersonId())
                        .orElseThrow(() -> new RuntimeException("Person not found: " + dto.getPersonId()));
                att.setPerson(person);
            }
        }

        AttendanceStatus newStatus = dto.getStatus() != null
                ? AttendanceStatus.valueOf(dto.getStatus())
                : AttendanceStatus.PRESENT;
        att.setStatus(newStatus);
        att.setNotes(dto.getNotes());
        att.setCheckedInByUserId(currentUserId);
        if (newStatus == AttendanceStatus.PRESENT || newStatus == AttendanceStatus.LATE) {
            att.setCheckedInAt(dto.getCheckedInAt() != null ? dto.getCheckedInAt() : LocalDateTime.now());
        }
        att = attendanceRepository.save(att);
        log.info("Marked attendance id={} status={} for session {}", att.getId(), newStatus, sessionId);
        return toDTO(att);
    }

    /**
     * Bulk update: accepts a list of {registrationId, status} pairs for a session.
     */
    @Transactional
    public int bulkMark(Long eventId, Long sessionId, List<GeneralEventAttendanceCreateDTO> items, Long currentUserId) {
        int count = 0;
        for (GeneralEventAttendanceCreateDTO item : items) {
            markAttendance(eventId, sessionId, item, currentUserId);
            count++;
        }
        return count;
    }

    @Transactional
    public void deleteAttendance(Long attendanceId) {
        GeneralEventAttendance att = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found: " + attendanceId));
        attendanceRepository.delete(att);
    }

    private GeneralEventAttendanceDTO toDTO(GeneralEventAttendance att) {
        GeneralEventAttendanceDTO dto = new GeneralEventAttendanceDTO();
        dto.setId(att.getId());
        dto.setGeneralEventId(att.getGeneralEvent() != null ? att.getGeneralEvent().getId() : null);
        dto.setSessionId(att.getSession() != null ? att.getSession().getId() : null);
        dto.setSessionName(att.getSession() != null ? att.getSession().getSessionName() : null);
        dto.setRegistrationId(att.getRegistration() != null ? att.getRegistration().getId() : null);
        if (att.getPerson() != null) {
            dto.setPersonId(att.getPerson().getId());
            dto.setPersonName(att.getPerson().getFirstName() + " " + att.getPerson().getLastName());
        } else if (att.getRegistration() != null) {
            dto.setPersonName(att.getRegistration().getName());
        }
        dto.setWalkInName(att.getWalkInName());
        dto.setStatus(att.getStatus() != null ? att.getStatus().name() : null);
        dto.setCheckedInAt(att.getCheckedInAt());
        dto.setCheckedInByUserId(att.getCheckedInByUserId());
        dto.setNotes(att.getNotes());
        dto.setCreatedAt(att.getCreatedAt());
        dto.setUpdatedAt(att.getUpdatedAt());
        return dto;
    }
}
