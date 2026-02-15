package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.ContributionObligationCreateDTO;
import com.mosque.crm.dto.ContributionObligationDTO;
import com.mosque.crm.service.ContributionObligationService;

import jakarta.validation.Valid;

/**
 * REST controller for managing contribution obligations.
 * Base path: /contributions/obligations
 */
@RestController
@RequestMapping("/contributions/obligations")
@CrossOrigin(origins = "*")
public class ContributionObligationController {

    private final ContributionObligationService obligationService;

    public ContributionObligationController(ContributionObligationService obligationService) {
        this.obligationService = obligationService;
    }

    /**
     * Get all obligations.
     */
    @GetMapping
    public ResponseEntity<List<ContributionObligationDTO>> getAllObligations() {
        List<ContributionObligationDTO> obligations = obligationService.getAllObligations();
        return ResponseEntity.ok(obligations);
    }

    /**
     * Get obligation by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ContributionObligationDTO> getObligationById(@PathVariable Long id) {
        try {
            ContributionObligationDTO obligation = obligationService.getObligationById(id);
            return ResponseEntity.ok(obligation);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get obligation for a specific contribution type.
     */
    @GetMapping("/by-type/{typeId}")
    public ResponseEntity<ContributionObligationDTO> getObligationByTypeId(@PathVariable Long typeId) {
        try {
            ContributionObligationDTO obligation = obligationService.getObligationByTypeId(typeId);
            return ResponseEntity.ok(obligation);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Create a new obligation.
     */
    @PostMapping
    public ResponseEntity<?> createObligation(
            @Valid @RequestBody ContributionObligationCreateDTO createDTO) {
        try {
            ContributionObligationDTO obligation = obligationService.createObligation(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(obligation);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update an existing obligation.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateObligation(@PathVariable Long id,
                                               @Valid @RequestBody ContributionObligationCreateDTO updateDTO) {
        try {
            ContributionObligationDTO obligation = obligationService.updateObligation(id, updateDTO);
            return ResponseEntity.ok(obligation);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Delete an obligation.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteObligation(@PathVariable Long id) {
        try {
            obligationService.deleteObligation(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
