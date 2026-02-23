package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.MemberContributionAssignmentCreateDTO;
import com.mosque.crm.dto.MemberContributionAssignmentDTO;
import com.mosque.crm.entity.ContributionType;
import com.mosque.crm.entity.MemberContributionAssignment;
import com.mosque.crm.entity.Person;
import com.mosque.crm.repository.ContributionTypeRepository;
import com.mosque.crm.repository.MemberContributionAssignmentRepository;
import com.mosque.crm.repository.PersonRepository;

/**
 * Service for managing member contribution assignments.
 *
 * Business rules:
 * - Only required contribution types can have member assignments
 * - A person can only have one assignment per contribution type (unique constraint)
 * - Supports bulk assignment: assign multiple persons to one type in a single call
 */
@Service
public class MemberContributionAssignmentService {

    private static final Logger log = LoggerFactory.getLogger(MemberContributionAssignmentService.class);

    private final MemberContributionAssignmentRepository assignmentRepository;
    private final ContributionTypeRepository contributionTypeRepository;
    private final PersonRepository personRepository;

    public MemberContributionAssignmentService(
            MemberContributionAssignmentRepository assignmentRepository,
            ContributionTypeRepository contributionTypeRepository,
            PersonRepository personRepository) {
        this.assignmentRepository = assignmentRepository;
        this.contributionTypeRepository = contributionTypeRepository;
        this.personRepository = personRepository;
    }

    /**
     * Get all assignments with details.
     */
    @Transactional(readOnly = true)
    public List<MemberContributionAssignmentDTO> getAllAssignments() {
        return assignmentRepository.findAllWithDetails().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get assignments for a specific person.
     */
    @Transactional(readOnly = true)
    public List<MemberContributionAssignmentDTO> getAssignmentsByPerson(Long personId) {
        return assignmentRepository.findByPersonId(personId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get active assignments for a specific person.
     */
    @Transactional(readOnly = true)
    public List<MemberContributionAssignmentDTO> getActiveAssignmentsByPerson(Long personId) {
        return assignmentRepository.findActiveByPersonId(personId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get assignments for a specific contribution type.
     */
    @Transactional(readOnly = true)
    public List<MemberContributionAssignmentDTO> getAssignmentsByType(Long typeId) {
        return assignmentRepository.findByContributionTypeId(typeId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Create assignment(s). Supports both single (personId) and bulk (personIds).
     * Skips persons that already have an assignment for the given type.
     */
    @Transactional
    public List<MemberContributionAssignmentDTO> createAssignments(MemberContributionAssignmentCreateDTO createDTO) {
        ContributionType type = contributionTypeRepository.findById(createDTO.getContributionTypeId())
                .orElseThrow(() -> new RuntimeException(
                        "Contribution type not found with id: " + createDTO.getContributionTypeId()));

        if (!type.getIsRequired()) {
            throw new RuntimeException(
                    "Cannot assign members to optional contribution type: " + type.getCode());
        }

        // Resolve person IDs: single or bulk
        List<Long> personIds = new ArrayList<>();
        if (createDTO.getPersonIds() != null && !createDTO.getPersonIds().isEmpty()) {
            personIds.addAll(createDTO.getPersonIds());
        } else if (createDTO.getPersonId() != null) {
            personIds.add(createDTO.getPersonId());
        } else {
            throw new RuntimeException("Either personId or personIds must be provided");
        }

        List<MemberContributionAssignment> created = new ArrayList<>();

        for (Long personId : personIds) {
            // Skip if already assigned
            if (assignmentRepository.existsByPersonIdAndContributionTypeId(personId, type.getId())) {
                log.debug("Skipping person {} — already assigned to type {}", personId, type.getCode());
                continue;
            }

            Person person = personRepository.findById(personId)
                    .orElseThrow(() -> new RuntimeException("Person not found with id: " + personId));

            MemberContributionAssignment assignment = new MemberContributionAssignment();
            assignment.setPerson(person);
            assignment.setContributionType(type);
            assignment.setStartDate(createDTO.getStartDate());
            assignment.setEndDate(createDTO.getEndDate());
            assignment.setNotes(createDTO.getNotes());
            assignment.setIsActive(true);

            assignment = assignmentRepository.save(assignment);
            created.add(assignment);
            log.info("Assigned person {} to contribution type {} (startDate={})",
                    person.getId(), type.getCode(), assignment.getStartDate());
        }

        return created.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    /**
     * Update an existing assignment.
     */
    @Transactional
    public MemberContributionAssignmentDTO updateAssignment(Long id,
            MemberContributionAssignmentCreateDTO updateDTO) {
        MemberContributionAssignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Assignment not found with id: " + id));

        assignment.setStartDate(updateDTO.getStartDate());
        assignment.setEndDate(updateDTO.getEndDate());
        assignment.setNotes(updateDTO.getNotes());

        assignment = assignmentRepository.save(assignment);
        log.info("Updated assignment id={} (startDate={}, endDate={})",
                assignment.getId(), assignment.getStartDate(), assignment.getEndDate());
        return convertToDTO(assignment);
    }

    /**
     * Toggle the active status of an assignment.
     */
    @Transactional
    public MemberContributionAssignmentDTO toggleActive(Long id) {
        MemberContributionAssignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Assignment not found with id: " + id));

        assignment.setIsActive(!assignment.getIsActive());
        assignment = assignmentRepository.save(assignment);
        log.info("Toggled assignment id={} active={}", assignment.getId(), assignment.getIsActive());
        return convertToDTO(assignment);
    }

    /**
     * Delete an assignment.
     */
    @Transactional
    public void deleteAssignment(Long id) {
        MemberContributionAssignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Assignment not found with id: " + id));
        assignmentRepository.delete(assignment);
        log.info("Deleted assignment id={}", id);
    }

    // ===== DTO conversion =====
    private MemberContributionAssignmentDTO convertToDTO(MemberContributionAssignment assignment) {
        MemberContributionAssignmentDTO dto = new MemberContributionAssignmentDTO();
        dto.setId(assignment.getId());
        dto.setPersonId(assignment.getPerson().getId());
        dto.setPersonName(buildPersonName(assignment.getPerson()));
        dto.setContributionTypeId(assignment.getContributionType().getId());
        dto.setContributionTypeCode(assignment.getContributionType().getCode());
        dto.setStartDate(assignment.getStartDate());
        dto.setEndDate(assignment.getEndDate());
        dto.setIsActive(assignment.getIsActive());
        dto.setNotes(assignment.getNotes());
        return dto;
    }

    private String buildPersonName(Person person) {
        StringBuilder sb = new StringBuilder();
        if (person.getFirstName() != null) {
            sb.append(person.getFirstName());
        }
        if (person.getLastName() != null) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(person.getLastName());
        }
        return sb.toString();
    }
}
