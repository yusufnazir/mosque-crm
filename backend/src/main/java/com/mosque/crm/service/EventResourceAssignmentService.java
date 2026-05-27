package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.EventResourceAssignmentCreateDTO;
import com.mosque.crm.dto.EventResourceAssignmentDTO;
import com.mosque.crm.entity.EventResource;
import com.mosque.crm.entity.EventResourceAssignment;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.EventKind;
import com.mosque.crm.enums.EventResourceAssignmentStatus;
import com.mosque.crm.exception.ActiveResourceAssignmentsException;
import com.mosque.crm.repository.EventResourceAssignmentRepository;
import com.mosque.crm.repository.EventResourceRepository;
import com.mosque.crm.repository.PersonRepository;

@Service
public class EventResourceAssignmentService {

    private final EventReferenceService eventReferenceService;
    private final EventResourceRepository resourceRepository;
    private final EventResourceAssignmentRepository assignmentRepository;
    private final PersonRepository personRepository;

    public EventResourceAssignmentService(
            EventReferenceService eventReferenceService,
            EventResourceRepository resourceRepository,
            EventResourceAssignmentRepository assignmentRepository,
            PersonRepository personRepository) {
        this.eventReferenceService = eventReferenceService;
        this.resourceRepository = resourceRepository;
        this.assignmentRepository = assignmentRepository;
        this.personRepository = personRepository;
    }

    public List<EventResourceAssignmentDTO> listByEvent(EventKind eventKind, Long eventId) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        return assignmentRepository.findByEvent(eventKind, eventId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public EventResourceAssignmentDTO createAssignment(Long resourceId, EventResourceAssignmentCreateDTO dto) {
        EventResource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new RuntimeException("Resource not found: " + resourceId));
        if (!resource.isAssignable()) {
            throw new RuntimeException("Resource is not assignable");
        }
        assignmentRepository.findByResourceIdAndStatus(resourceId, EventResourceAssignmentStatus.ACTIVE)
                .ifPresent(a -> {
                    throw new RuntimeException("Resource already has an active assignment");
                });
        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found: " + dto.getPersonId()));

        EventResourceAssignment assignment = new EventResourceAssignment();
        assignment.setResource(resource);
        assignment.setPerson(person);
        assignment.setStatus(EventResourceAssignmentStatus.ACTIVE);
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setNotes(dto.getNotes());
        return toDTO(assignmentRepository.save(assignment));
    }

    @Transactional
    public EventResourceAssignmentDTO completeAssignment(Long assignmentId) {
        return transitionAssignment(assignmentId, EventResourceAssignmentStatus.COMPLETED);
    }

    @Transactional
    public EventResourceAssignmentDTO cancelAssignment(Long assignmentId) {
        return transitionAssignment(assignmentId, EventResourceAssignmentStatus.CANCELLED);
    }

    public void assertNoActiveAssignments(EventKind eventKind, Long eventId) {
        long count = assignmentRepository.countByEventAndStatus(
                eventKind, eventId, EventResourceAssignmentStatus.ACTIVE);
        if (count > 0) {
            throw new ActiveResourceAssignmentsException(count);
        }
    }

    private EventResourceAssignmentDTO transitionAssignment(Long assignmentId, EventResourceAssignmentStatus target) {
        EventResourceAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found: " + assignmentId));
        if (assignment.getStatus() != EventResourceAssignmentStatus.ACTIVE) {
            throw new RuntimeException("Only active assignments can be updated");
        }
        assignment.setStatus(target);
        assignment.setCompletedAt(LocalDateTime.now());
        return toDTO(assignmentRepository.save(assignment));
    }

    private EventResourceAssignmentDTO toDTO(EventResourceAssignment assignment) {
        EventResourceAssignmentDTO dto = new EventResourceAssignmentDTO();
        dto.setId(assignment.getId());
        dto.setResourceId(assignment.getResource().getId());
        dto.setResourceName(assignment.getResource().getName());
        dto.setPersonId(assignment.getPerson().getId());
        dto.setPersonName(formatPersonName(assignment.getPerson()));
        dto.setStatus(assignment.getStatus().name());
        dto.setAssignedAt(assignment.getAssignedAt());
        dto.setCompletedAt(assignment.getCompletedAt());
        dto.setNotes(assignment.getNotes());
        return dto;
    }

    private String formatPersonName(Person person) {
        String first = person.getFirstName() != null ? person.getFirstName() : "";
        String last = person.getLastName() != null ? person.getLastName() : "";
        return (first + " " + last).trim();
    }
}
