package com.mosque.crm.controller;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import com.mosque.crm.dto.GenealogyGraphDTO;
import com.mosque.crm.repository.FamilyChildRepository;
import com.mosque.crm.repository.FamilyRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.service.GenealogyGraphService;



/**
 * Controller for genealogy graph visualization endpoints.
 * Provides data for d3-dag rendering.
 */

@RestController
@RequestMapping("/genealogy")
public class GenealogyGraphController {

    private final FamilyChildRepository familyChildRepository;
    private final PersonRepository personRepository;

    private static final Logger log = LoggerFactory.getLogger(GenealogyGraphController.class);

    private final GenealogyGraphService genealogyGraphService;
    private final FamilyRepository familyRepository;

// ...existing code...

    public GenealogyGraphController(GenealogyGraphService genealogyGraphService, FamilyRepository familyRepository, FamilyChildRepository familyChildRepository, PersonRepository personRepository) {
        this.genealogyGraphService = genealogyGraphService;
        this.familyRepository = familyRepository;
        this.familyChildRepository = familyChildRepository;
        this.personRepository = personRepository;
    }

    /**
     * Get family size distribution (number of families by number of children)
     * GET /api/genealogy/family-size-distribution
     * Returns: [ { "size": 2, "count": 10 }, ... ]
     */
    @GetMapping("/family-size-distribution")
    @ResponseBody
    public ResponseEntity<?> getFamilySizeDistribution() {
        List<Object[]> results = familyChildRepository.countChildrenByFamilyIncludingZero();
        // Map: size -> count
        java.util.Map<Integer, Integer> sizeCount = new java.util.HashMap<>();
        for (Object[] row : results) {
            int size = ((Number) row[1]).intValue();
            sizeCount.put(size, sizeCount.getOrDefault(size, 0) + 1);
        }
        // Convert to list of { size, count }
        java.util.List<java.util.Map<String, Integer>> response = new java.util.ArrayList<>();
        for (var entry : sizeCount.entrySet()) {
            java.util.Map<String, Integer> obj = new java.util.HashMap<>();
            obj.put("size", entry.getKey());
            obj.put("count", entry.getValue());
            response.add(obj);
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Get age distribution (number of members by age bucket)
     * GET /api/genealogy/age-distribution
     * Returns: [ { "bucket": "0-12", "count": 5 }, ... ]
     */
    @GetMapping("/age-distribution")
    @ResponseBody
    public ResponseEntity<?> getAgeDistribution() {
        List<Object[]> results = personRepository.countByAgeBucket();
        java.util.List<java.util.Map<String, Object>> response = new java.util.ArrayList<>();
        for (Object[] row : results) {
            java.util.Map<String, Object> obj = new java.util.HashMap<>();
            obj.put("bucket", row[0]);
            obj.put("count", ((Number) row[1]).intValue());
            response.add(obj);
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Get gender breakdown (number of members by gender)
     * GET /api/genealogy/gender-breakdown
     * Returns: [ { "gender": "M", "count": 50 }, ... ]
     */
    @GetMapping("/gender-breakdown")
    @ResponseBody
    public ResponseEntity<?> getGenderBreakdown() {
        List<Object[]> results = personRepository.countByGender();
        java.util.List<java.util.Map<String, Object>> response = new java.util.ArrayList<>();
        for (Object[] row : results) {
            java.util.Map<String, Object> obj = new java.util.HashMap<>();
            obj.put("gender", row[0]);
            obj.put("count", ((Number) row[1]).intValue());
            response.add(obj);
        }
        return ResponseEntity.ok(response);
    }
    /**
     * Get total number of families (for dashboard stats)
     * GET /api/genealogy/families
     * Returns: { "count": 42 }
     */
    @GetMapping("/families")
    @ResponseBody
    public ResponseEntity<?> getTotalFamilies() {
        long count = familyRepository.count();
        return ResponseEntity.ok(java.util.Collections.singletonMap("count", count));
    }

    /**
     * Get genealogy graph for a person.
     * Returns nodes (PERSON and FAMILY) and edges for d3-dag visualization.
     *
     * GET /api/genealogy/persons/{personId}/graph
     */
    @GetMapping("/persons/{personId}/graph")
    public ResponseEntity<GenealogyGraphDTO> getGraph(@PathVariable Long personId) {
        log.info("Getting genealogy graph for person: {}", personId);

        GenealogyGraphDTO graph = genealogyGraphService.buildGraph(personId);

        log.info("Returning graph with {} nodes and {} edges",
                graph.getNodes().size(), graph.getEdges().size());

        return ResponseEntity.ok(graph);
    }

    /**
     * Get complete genealogy graph for all persons in the organization.
     * Returns nodes (PERSON and FAMILY) and edges for d3-dag visualization.
     *
     * GET /api/genealogy/graph/complete
     */
    @GetMapping("/graph/complete")
    public ResponseEntity<GenealogyGraphDTO> getCompleteGraph() {
        log.info("Getting complete genealogy graph for all persons");

        GenealogyGraphDTO graph = genealogyGraphService.buildCompleteGraph();

        log.info("Returning complete graph with {} nodes and {} edges",
                graph.getNodes().size(), graph.getEdges().size());

        return ResponseEntity.ok(graph);
    }

    /**
     * Get age-gender distribution (number of members by age bucket and gender)
     * GET /api/genealogy/age-gender-distribution
     * Returns: [ { "bucket": "0-12", "gender": "M", "count": 3 }, ... ]
     */
    @GetMapping("/age-gender-distribution")
    @ResponseBody
    public ResponseEntity<?> getAgeGenderDistribution() {
        List<Object[]> results = personRepository.countByAgeBucketAndGender();
        java.util.List<java.util.Map<String, Object>> response = new java.util.ArrayList<>();
        for (Object[] row : results) {
            java.util.Map<String, Object> obj = new java.util.HashMap<>();
            obj.put("bucket", row[0]);
            obj.put("gender", row[1]);
            obj.put("count", ((Number) row[2]).intValue());
            response.add(obj);
        }
        return ResponseEntity.ok(response);
    }
}
