package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.mosque.crm.dto.GenealogyEdgeDTO;
import com.mosque.crm.dto.GenealogyGraphDTO;
import com.mosque.crm.dto.GenealogyNodeDTO;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.gedcom.Family;
import com.mosque.crm.entity.gedcom.FamilyChild;
import com.mosque.crm.entity.gedcom.Individual;
import com.mosque.crm.repository.FamilyChildRepository;
import com.mosque.crm.repository.FamilyRepository;
import com.mosque.crm.repository.GedcomPersonLinkRepository;
import com.mosque.crm.repository.IndividualRepository;
import com.mosque.crm.repository.PersonRepository;

/**
 * Service for building genealogy graphs for d3-dag visualization.
 * Converts GEDCOM relationships into a DAG with PERSON and FAMILY nodes.
 */
@Service
public class GenealogyGraphService {

    private static final Logger log = LoggerFactory.getLogger(GenealogyGraphService.class);

    private final PersonRepository personRepository;
    private final IndividualRepository individualRepository;
    private final GedcomPersonLinkRepository linkRepository;
    private final FamilyRepository familyRepository;
    private final FamilyChildRepository familyChildRepository;

    public GenealogyGraphService(
            PersonRepository personRepository,
            IndividualRepository individualRepository,
            GedcomPersonLinkRepository linkRepository,
            FamilyRepository familyRepository,
            FamilyChildRepository familyChildRepository) {
        this.personRepository = personRepository;
        this.individualRepository = individualRepository;
        this.linkRepository = linkRepository;
        this.familyRepository = familyRepository;
        this.familyChildRepository = familyChildRepository;
    }

    /**
     * Build genealogy graph starting from a person.
     * Traverses ancestors and descendants up to a configurable depth.
     */
    public GenealogyGraphDTO buildGraph(Long personId) {
        log.info("Building genealogy graph for person: {}", personId);

        List<GenealogyNodeDTO> nodes = new ArrayList<>();
        List<GenealogyEdgeDTO> edges = new ArrayList<>();
        Set<String> processedIndividuals = new HashSet<>();
        Set<String> processedFamilies = new HashSet<>();

        // Get the starting person's GEDCOM individual
        Person startPerson = personRepository.findById(personId).orElse(null);
        if (startPerson == null) {
            log.warn("Person not found: {}", personId);
            return new GenealogyGraphDTO(nodes, edges);
        }

        Individual startIndividual = linkRepository.findByPerson(startPerson)
                .map(link -> link.getGedcomIndividual())
                .orElse(null);

        if (startIndividual == null) {
            log.warn("No GEDCOM individual found for person: {}", personId);
            return new GenealogyGraphDTO(nodes, edges);
        }

        // Traverse graph using BFS to include ancestors and descendants
        Queue<Individual> queue = new LinkedList<>();
        queue.add(startIndividual);
        processedIndividuals.add(startIndividual.getId());

        while (!queue.isEmpty()) {
            Individual individual = queue.poll();

            // Add person node
            Person person = linkRepository.findByGedcomIndividual(individual)
                    .map(link -> link.getPerson())
                    .orElse(null);

            String personLabel = person != null
                    ? person.getFirstName() + " " + (person.getLastName() != null ? person.getLastName() : "")
                    : "Unknown";
            String personGender = individual.getSex() != null ? individual.getSex().toString() : "U";

            nodes.add(new GenealogyNodeDTO(individual.getId(), "PERSON", personLabel, personGender, individual.getBirthDate()));

            // Process families where this individual is a spouse
            List<Family> spouseFamilies = familyRepository.findFamiliesBySpouse(individual.getId());
            for (Family family : spouseFamilies) {
                if (processedFamilies.contains(family.getId())) {
                    continue;
                }
                processedFamilies.add(family.getId());

                // Add family node
                nodes.add(new GenealogyNodeDTO(family.getId(), "FAMILY", null, null));

                // Add edges: spouses → family
                if (family.getHusbandId() != null) {
                    edges.add(new GenealogyEdgeDTO(family.getHusbandId(), family.getId()));
                    if (!processedIndividuals.contains(family.getHusbandId())) {
                        individualRepository.findById(family.getHusbandId()).ifPresent(husband -> {
                            queue.add(husband);
                            processedIndividuals.add(husband.getId());
                        });
                    }
                }
                if (family.getWifeId() != null) {
                    edges.add(new GenealogyEdgeDTO(family.getWifeId(), family.getId()));
                    if (!processedIndividuals.contains(family.getWifeId())) {
                        individualRepository.findById(family.getWifeId()).ifPresent(wife -> {
                            queue.add(wife);
                            processedIndividuals.add(wife.getId());
                        });
                    }
                }

                // Add edges: family → children
                List<FamilyChild> familyChildren = familyChildRepository.findByFamilyId(family.getId());
                for (FamilyChild fc : familyChildren) {
                    edges.add(new GenealogyEdgeDTO(family.getId(), fc.getChildId()));
                    if (!processedIndividuals.contains(fc.getChildId())) {
                        individualRepository.findById(fc.getChildId()).ifPresent(child -> {
                            queue.add(child);
                            processedIndividuals.add(child.getId());
                        });
                    }
                }
            }

            // Process families where this individual is a child (to get parents)
            List<FamilyChild> childRecords = familyChildRepository.findByChildId(individual.getId());
            for (FamilyChild fc : childRecords) {
                Family parentFamily = familyRepository.findById(fc.getFamilyId()).orElse(null);
                if (parentFamily == null || processedFamilies.contains(parentFamily.getId())) {
                    continue;
                }
                processedFamilies.add(parentFamily.getId());

                // Add family node
                nodes.add(new GenealogyNodeDTO(parentFamily.getId(), "FAMILY", null, null));

                // Add edges: parents → family
                if (parentFamily.getHusbandId() != null) {
                    edges.add(new GenealogyEdgeDTO(parentFamily.getHusbandId(), parentFamily.getId()));
                    if (!processedIndividuals.contains(parentFamily.getHusbandId())) {
                        individualRepository.findById(parentFamily.getHusbandId()).ifPresent(parent -> {
                            queue.add(parent);
                            processedIndividuals.add(parent.getId());
                        });
                    }
                }
                if (parentFamily.getWifeId() != null) {
                    edges.add(new GenealogyEdgeDTO(parentFamily.getWifeId(), parentFamily.getId()));
                    if (!processedIndividuals.contains(parentFamily.getWifeId())) {
                        individualRepository.findById(parentFamily.getWifeId()).ifPresent(parent -> {
                            queue.add(parent);
                            processedIndividuals.add(parent.getId());
                        });
                    }
                }

                // Add edge: family → this child
                edges.add(new GenealogyEdgeDTO(parentFamily.getId(), individual.getId()));

                // Add siblings
                List<FamilyChild> siblings = familyChildRepository.findByFamilyId(parentFamily.getId());
                for (FamilyChild sibling : siblings) {
                    if (!sibling.getChildId().equals(individual.getId()) && !processedIndividuals.contains(sibling.getChildId())) {
                        individualRepository.findById(sibling.getChildId()).ifPresent(siblingIndividual -> {
                            queue.add(siblingIndividual);
                            processedIndividuals.add(siblingIndividual.getId());
                        });
                    }
                    edges.add(new GenealogyEdgeDTO(parentFamily.getId(), sibling.getChildId()));
                }
            }
        }

        log.info("Built graph with {} nodes and {} edges", nodes.size(), edges.size());
        return new GenealogyGraphDTO(nodes, edges);
    }

    public GenealogyGraphDTO buildCompleteGraph() {
        log.info("Building complete genealogy graph for all individuals");

        Set<GenealogyNodeDTO> nodeSet = new HashSet<>();
        Set<GenealogyEdgeDTO> edgeSet = new HashSet<>();
        Set<String> processedIndividuals = new HashSet<>();
        Set<String> processedFamilies = new HashSet<>();

        // Get all individuals from the repository
        List<Individual> allIndividuals = individualRepository.findAll();
        log.info("Found {} total individuals", allIndividuals.size());

        // Process all individuals
        for (Individual individual : allIndividuals) {
            if (!processedIndividuals.contains(individual.getId())) {
                String fullName = individual.getGivenName() + " " + individual.getSurname();
                String gender = individual.getSex() != null ? individual.getSex().toString() : null;
                nodeSet.add(new GenealogyNodeDTO(
                    individual.getId(),
                    "PERSON",
                    fullName,
                    gender,
                    individual.getBirthDate()
                ));
                processedIndividuals.add(individual.getId());
            }
        }

        // Get all families
        List<Family> allFamilies = familyRepository.findAll();
        log.info("Found {} total families", allFamilies.size());

        // Process all families
        for (Family family : allFamilies) {
            if (!processedFamilies.contains(family.getId())) {
                nodeSet.add(new GenealogyNodeDTO(family.getId(), "FAMILY"));
                processedFamilies.add(family.getId());

                // Add edges from husband to family
                if (family.getHusbandId() != null) {
                    edgeSet.add(new GenealogyEdgeDTO(family.getHusbandId(), family.getId()));
                }

                // Add edges from wife to family
                if (family.getWifeId() != null) {
                    edgeSet.add(new GenealogyEdgeDTO(family.getWifeId(), family.getId()));
                }

                // Add edges from family to children
                List<FamilyChild> children = familyChildRepository.findByFamilyId(family.getId());
                for (FamilyChild child : children) {
                    edgeSet.add(new GenealogyEdgeDTO(family.getId(), child.getChildId()));
                }
            }
        }

        // Convert sets to lists for DTO
        List<GenealogyNodeDTO> nodes = new ArrayList<>(nodeSet);
        List<GenealogyEdgeDTO> edges = new ArrayList<>(edgeSet);

        log.info("Built complete graph with {} nodes and {} edges", nodes.size(), edges.size());
        return new GenealogyGraphDTO(nodes, edges);
    }
}
