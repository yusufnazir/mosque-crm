package com.mosque.crm.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.AddRelationshipRequest;
import com.mosque.crm.dto.RelationshipResponse;
import com.mosque.crm.service.RelationshipService;

import jakarta.validation.Valid;

/**
 * REST controller for managing family relationships.
 *
 * Endpoints:
 * - GET /api/genealogy/persons/{personId}/relationships - Get relationships
 * - POST /api/genealogy/persons/{personId}/relationships - Add relationship
 * - DELETE /api/genealogy/persons/{personId}/relationships/{relationshipId} - Remove relationship
 *
 * Note: Person search is handled by PersonController at /api/persons/search
 * Note: Context path /api is already set in application.yml
 */
@RestController
@RequestMapping("/genealogy")
public class RelationshipController {

    private static final Logger log = LoggerFactory.getLogger(RelationshipController.class);

    private final RelationshipService relationshipService;

    public RelationshipController(RelationshipService relationshipService) {
        this.relationshipService = relationshipService;
    }

    /**
     * Get all family relationships for a person.
     *
     * GET /api/genealogy/persons/{personId}/relationships
     */
    @GetMapping("/persons/{personId}/relationships")
    public ResponseEntity<List<RelationshipResponse>> getRelationships(@PathVariable Long personId) {
        log.info("Getting relationships for person: {}", personId);

        List<RelationshipResponse> relationships = relationshipService.getRelationships(personId);

        log.info("Found {} relationships for person {}", relationships.size(), personId);
        return ResponseEntity.ok(relationships);
    }

    /**
     * Add a family relationship.
     *
     * POST /api/genealogy/persons/{personId}/relationships
     * Body: { "relatedPersonId": "long", "relationshipType": "FATHER" }
     */
    @PostMapping("/persons/{personId}/relationships")
    public ResponseEntity<RelationshipResponse> addRelationship(
            @PathVariable Long personId,
            @Valid @RequestBody AddRelationshipRequest request) {

        log.info("Adding {} relationship between {} and {}",
                request.getRelationshipType(), personId, request.getRelatedPersonId());

        RelationshipResponse response = relationshipService.addRelationship(
                personId,
                request.getRelatedPersonId(),
                request.getRelationshipType());

        log.info("Successfully added relationship: {}", response.getRelationshipId());
        return ResponseEntity.ok(response);
    }

    /**
     * Remove a family relationship.
     *
     * DELETE /api/genealogy/persons/{personId}/relationships/{relationshipId}
     */
    @DeleteMapping("/persons/{personId}/relationships/{relationshipId}")
    public ResponseEntity<Void> removeRelationship(
            @PathVariable Long personId,
            @PathVariable String relationshipId) {

        log.info("Removing relationship {} for person {}", relationshipId, personId);

        relationshipService.removeRelationship(relationshipId);

        log.info("Successfully removed relationship: {}", relationshipId);
        return ResponseEntity.noContent().build();
    }
}
