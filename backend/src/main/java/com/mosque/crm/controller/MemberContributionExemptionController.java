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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.MemberContributionExemptionCreateDTO;
import com.mosque.crm.dto.MemberContributionExemptionDTO;
import com.mosque.crm.service.MemberContributionExemptionService;

import jakarta.validation.Valid;

/**
 * REST controller for managing member contribution exemptions.
 * Base path: /contributions/exemptions
 */
@RestController
@RequestMapping("/contributions/exemptions")
@CrossOrigin(origins = "*")
public class MemberContributionExemptionController {

    private final MemberContributionExemptionService exemptionService;

    public MemberContributionExemptionController(MemberContributionExemptionService exemptionService) {
        this.exemptionService = exemptionService;
    }

    @GetMapping
    public ResponseEntity<List<MemberContributionExemptionDTO>> getAllExemptions() {
        List<MemberContributionExemptionDTO> exemptions = exemptionService.getAllExemptions();
        return ResponseEntity.ok(exemptions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemberContributionExemptionDTO> getExemptionById(@PathVariable Long id) {
        try {
            MemberContributionExemptionDTO exemption = exemptionService.getExemptionById(id);
            return ResponseEntity.ok(exemption);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/active")
    public ResponseEntity<List<MemberContributionExemptionDTO>> getActiveExemptions(
            @RequestParam Long personId,
            @RequestParam Long contributionTypeId) {
        List<MemberContributionExemptionDTO> exemptions =
                exemptionService.getActiveExemptions(personId, contributionTypeId);
        return ResponseEntity.ok(exemptions);
    }

    @PostMapping
    public ResponseEntity<?> createExemption(
            @Valid @RequestBody MemberContributionExemptionCreateDTO createDTO) {
        try {
            MemberContributionExemptionDTO exemption = exemptionService.createExemption(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(exemption);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateExemption(@PathVariable Long id,
                                              @Valid @RequestBody MemberContributionExemptionCreateDTO updateDTO) {
        try {
            MemberContributionExemptionDTO exemption = exemptionService.updateExemption(id, updateDTO);
            return ResponseEntity.ok(exemption);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExemption(@PathVariable Long id) {
        try {
            exemptionService.deleteExemption(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
