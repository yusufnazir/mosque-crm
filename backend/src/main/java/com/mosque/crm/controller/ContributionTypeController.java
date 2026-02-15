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

import com.mosque.crm.dto.ContributionTypeCreateDTO;
import com.mosque.crm.dto.ContributionTypeDTO;
import com.mosque.crm.service.ContributionTypeService;

import jakarta.validation.Valid;

/**
 * REST controller for managing contribution types.
 * Base path: /contributions/types
 */
@RestController
@RequestMapping("/contributions/types")
@CrossOrigin(origins = "*")
public class ContributionTypeController {

    private final ContributionTypeService contributionTypeService;

    public ContributionTypeController(ContributionTypeService contributionTypeService) {
        this.contributionTypeService = contributionTypeService;
    }

    /**
     * Get all contribution types with translations and obligations.
     */
    @GetMapping
    public ResponseEntity<List<ContributionTypeDTO>> getAllTypes() {
        List<ContributionTypeDTO> types = contributionTypeService.getAllTypes();
        return ResponseEntity.ok(types);
    }

    /**
     * Get only active contribution types.
     */
    @GetMapping("/active")
    public ResponseEntity<List<ContributionTypeDTO>> getActiveTypes() {
        List<ContributionTypeDTO> types = contributionTypeService.getActiveTypes();
        return ResponseEntity.ok(types);
    }

    /**
     * Get a single contribution type by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ContributionTypeDTO> getTypeById(@PathVariable Long id) {
        try {
            ContributionTypeDTO type = contributionTypeService.getTypeById(id);
            return ResponseEntity.ok(type);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Create a new contribution type.
     */
    @PostMapping
    public ResponseEntity<ContributionTypeDTO> createType(@Valid @RequestBody ContributionTypeCreateDTO createDTO) {
        try {
            ContributionTypeDTO type = contributionTypeService.createType(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(type);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update a contribution type.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ContributionTypeDTO> updateType(@PathVariable Long id,
                                                           @Valid @RequestBody ContributionTypeCreateDTO updateDTO) {
        try {
            ContributionTypeDTO type = contributionTypeService.updateType(id, updateDTO);
            return ResponseEntity.ok(type);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Deactivate (soft-delete) a contribution type.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateType(@PathVariable Long id) {
        try {
            contributionTypeService.deactivateType(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Reactivate a contribution type.
     */
    @PutMapping("/{id}/activate")
    public ResponseEntity<Void> activateType(@PathVariable Long id) {
        try {
            contributionTypeService.activateType(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
