package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.MemberContributionAssignmentCreateDTO;
import com.mosque.crm.dto.MemberContributionAssignmentDTO;
import com.mosque.crm.service.MemberContributionAssignmentService;

import jakarta.validation.Valid;

/**
 * REST controller for managing member contribution assignments.
 * Base path: /contributions/assignments
 */
@RestController
@RequestMapping("/contributions/assignments")
@CrossOrigin(origins = "*")
public class MemberContributionAssignmentController {

    private final MemberContributionAssignmentService assignmentService;

    public MemberContributionAssignmentController(MemberContributionAssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    /**
     * Get all assignments.
     */
    @GetMapping
    public ResponseEntity<List<MemberContributionAssignmentDTO>> getAllAssignments() {
        List<MemberContributionAssignmentDTO> assignments = assignmentService.getAllAssignments();
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get assignments for a specific person.
     */
    @GetMapping("/by-person/{personId}")
    public ResponseEntity<List<MemberContributionAssignmentDTO>> getByPerson(
            @PathVariable Long personId) {
        List<MemberContributionAssignmentDTO> assignments =
                assignmentService.getAssignmentsByPerson(personId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get active assignments for a specific person (for member detail view).
     */
    @GetMapping("/by-person/{personId}/active")
    public ResponseEntity<List<MemberContributionAssignmentDTO>> getActiveByPerson(
            @PathVariable Long personId) {
        List<MemberContributionAssignmentDTO> assignments =
                assignmentService.getActiveAssignmentsByPerson(personId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get assignments for a specific contribution type.
     */
    @GetMapping("/by-type/{typeId}")
    public ResponseEntity<List<MemberContributionAssignmentDTO>> getByType(
            @PathVariable Long typeId) {
        List<MemberContributionAssignmentDTO> assignments =
                assignmentService.getAssignmentsByType(typeId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Create assignment(s). Supports single (personId) or bulk (personIds).
     */
    @PostMapping
    public ResponseEntity<?> createAssignments(
            @Valid @RequestBody MemberContributionAssignmentCreateDTO createDTO) {
        try {
            List<MemberContributionAssignmentDTO> assignments =
                    assignmentService.createAssignments(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(assignments);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update an existing assignment.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAssignment(@PathVariable Long id,
            @Valid @RequestBody MemberContributionAssignmentCreateDTO updateDTO) {
        try {
            MemberContributionAssignmentDTO assignment =
                    assignmentService.updateAssignment(id, updateDTO);
            return ResponseEntity.ok(assignment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Toggle the active status of an assignment.
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggleActive(@PathVariable Long id) {
        try {
            MemberContributionAssignmentDTO assignment =
                    assignmentService.toggleActive(id);
            return ResponseEntity.ok(assignment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Delete an assignment.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAssignment(@PathVariable Long id) {
        try {
            assignmentService.deleteAssignment(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
