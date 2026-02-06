package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.mosque.crm.dto.RelationshipResponse;
import com.mosque.crm.entity.GedcomPersonLink;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.gedcom.Family;
import com.mosque.crm.entity.gedcom.FamilyChild;
import com.mosque.crm.entity.gedcom.Individual;
import com.mosque.crm.enums.GenderEnum;
import com.mosque.crm.enums.RelationshipType;
import com.mosque.crm.repository.FamilyChildRepository;
import com.mosque.crm.repository.FamilyRepository;
import com.mosque.crm.repository.GedcomPersonLinkRepository;
import com.mosque.crm.repository.IndividualRepository;
import com.mosque.crm.repository.PersonRepository;

import jakarta.transaction.Transactional;

/**
 * Service for managing family relationships using GEDCOM entities.
 *
 * CRITICAL RULES:
 * - Never modify Person entity for relationships
 * - All relationship logic uses GEDCOM entities (Individual, Family, FamilyChild)
 * - Person and GedcomIndividual are linked via GedcomPersonLink
 * - Create GEDCOM Individual automatically if not exists
 */
@Service
public class RelationshipService {

    private static final Logger log = LoggerFactory.getLogger(RelationshipService.class);

    private final PersonRepository personRepository;
    private final IndividualRepository individualRepository;
    private final FamilyRepository familyRepository;
    private final FamilyChildRepository familyChildRepository;
    private final GedcomPersonLinkRepository gedcomPersonLinkRepository;

    public RelationshipService(PersonRepository personRepository,
                               IndividualRepository individualRepository,
                               FamilyRepository familyRepository,
                               FamilyChildRepository familyChildRepository,
                               GedcomPersonLinkRepository gedcomPersonLinkRepository) {
        this.personRepository = personRepository;
        this.individualRepository = individualRepository;
        this.familyRepository = familyRepository;
        this.familyChildRepository = familyChildRepository;
        this.gedcomPersonLinkRepository = gedcomPersonLinkRepository;
    }

    /**
     * Get all family relationships for a person.
     */
    public List<RelationshipResponse> getRelationships(Long personId) {
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Person not found"));

        // Get the GEDCOM Individual linked to this person
        Optional<GedcomPersonLink> gedcomLinkOpt = gedcomPersonLinkRepository.findByPerson(person);
        if (!gedcomLinkOpt.isPresent()) {
            return new ArrayList<>(); // Return empty list if no GEDCOM link exists
        }
        
        Individual individual = gedcomLinkOpt.get().getGedcomIndividual();
        List<RelationshipResponse> relationships = new ArrayList<>();

        // Find parents (through FamilyChild)
        List<FamilyChild> childRecords = familyChildRepository.findByChildId(individual.getId());
        for (FamilyChild childRecord : childRecords) {
            Family family = familyRepository.findById(childRecord.getFamilyId()).orElse(null);
            if (family != null) {
                // Add father
                if (family.getHusbandId() != null) {
                    addParentRelationship(relationships, family.getHusbandId(), "FATHER");
                }
                // Add mother
                if (family.getWifeId() != null) {
                    addParentRelationship(relationships, family.getWifeId(), "MOTHER");
                }
            }
        }

        // Find spouses (where individual is husband or wife)
        List<Family> spouseFamilies = familyRepository.findFamiliesBySpouse(individual.getId());
        for (Family family : spouseFamilies) {
            if (family.getHusbandId() != null && family.getHusbandId().equals(individual.getId())) {
                // Individual is husband, so wife is spouse
                if (family.getWifeId() != null) {
                    addSpouseRelationship(relationships, family.getWifeId(), family.getId());
                }
            } else if (family.getWifeId() != null && family.getWifeId().equals(individual.getId())) {
                // Individual is wife, so husband is spouse
                if (family.getHusbandId() != null) {
                    addSpouseRelationship(relationships, family.getHusbandId(), family.getId());
                }
            }
        }

        // Find children (families where individual is parent - either husband or wife)
        List<Family> parentFamilies = familyRepository.findFamiliesBySpouse(individual.getId());
        for (Family family : parentFamilies) {
            List<FamilyChild> children = familyChildRepository.findByFamilyId(family.getId());
            for (FamilyChild child : children) {
                addChildRelationship(relationships, child.getChildId(), child.getId().toString());
            }
        }

        return relationships;
    }

    /**
     * Add a family relationship.
     */
    @Transactional
    public RelationshipResponse addRelationship(Long personId, Long relatedPersonId, String relationshipTypeStr) {
        // Validate persons exist
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Person not found"));
        Person relatedPerson = personRepository.findById(relatedPersonId)
                .orElseThrow(() -> new IllegalArgumentException("Related person not found"));

        // Get or create GEDCOM Individuals
        Individual individual = getOrCreateIndividual(person);
        Individual relatedIndividual = getOrCreateIndividual(relatedPerson);

        // Process relationship based on type
        switch (relationshipTypeStr.toUpperCase()) {
            case "FATHER":
                return addParentRelationship(individual, relatedIndividual, true);
            case "MOTHER":
                return addParentRelationship(individual, relatedIndividual, false);
            case "SPOUSE":
                return addSpouseRelationship(individual, relatedIndividual);
            case "CHILD":
                return addChildRelationship(individual, relatedIndividual);
            default:
                throw new IllegalArgumentException("Invalid relationship type: " + relationshipTypeStr);
        }
    }

    /**
     * Remove a family relationship.
     */
    @Transactional
    public void removeRelationship(String relationshipId) {
        // Try to parse as Long (FamilyChild ID)
        try {
            Long familyChildId = Long.parseLong(relationshipId);
            familyChildRepository.deleteById(familyChildId);
            log.info("Removed family-child relationship: {}", familyChildId);
            return;
        } catch (NumberFormatException e) {
            // Not a FamilyChild ID, try as Family ID
        }

        // Try as Family ID (for spouse relationships)
        if (familyRepository.existsById(relationshipId)) {
            // Don't delete family if it has children
            List<FamilyChild> children = familyChildRepository.findByFamilyId(relationshipId);
            if (children.isEmpty()) {
                familyRepository.deleteById(relationshipId);
                log.info("Removed family relationship: {}", relationshipId);
            } else {
                throw new IllegalStateException("Cannot remove family relationship - family has children. Remove children first.");
            }
        } else {
            throw new IllegalArgumentException("Relationship not found: " + relationshipId);
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Get existing GEDCOM Individual or create new one for Person.
     */
    private Individual getOrCreateIndividual(Person person) {
        // Check if link exists
        Optional<GedcomPersonLink> linkOpt = gedcomPersonLinkRepository.findByPerson(person);
        if (linkOpt.isPresent()) {
            return linkOpt.get().getGedcomIndividual();
        }

        // Create new GEDCOM Individual
        Individual individual = new Individual();
        individual.setId(generateIndividualId());
        individual.setGivenName(person.getFirstName());
        individual.setSurname(person.getLastName());
        individual.setBirthDate(person.getDateOfBirth());
        individual.setDeathDate(person.getDateOfDeath());
        individual.setSex(inferSex(person.getGender()));
        individual.setLiving(person.getDateOfDeath() == null);
        individual = individualRepository.save(individual);

        // Create link
        GedcomPersonLink link = new GedcomPersonLink();
        link.setPerson(person);
        link.setGedcomIndividual(individual);
        link.setLinkedBy("SYSTEM");
        link.setLinkReason("Auto-created for family relationship management");
        gedcomPersonLinkRepository.save(link);

        log.info("Created GEDCOM Individual {} for Person {}", individual.getId(), person.getId());
        return individual;
    }

    /**
     * Generate unique GEDCOM Individual ID in format @I{number}@
     */
    private String generateIndividualId() {
        // Find highest existing ID number
        List<Individual> allIndividuals = individualRepository.findAll();
        int maxId = allIndividuals.stream()
                .map(i -> extractIdNumber(i.getId()))
                .max(Integer::compareTo)
                .orElse(0);
        return String.format("@I%d@", maxId + 1);
    }

    /**
     * Extract numeric part from GEDCOM ID (e.g., "@I5@" -> 5)
     */
    private int extractIdNumber(String gedcomId) {
        try {
            return Integer.parseInt(gedcomId.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /**
     * Generate unique GEDCOM Family ID in format @F{number}@
     */
    private String generateFamilyId() {
        List<Family> allFamilies = familyRepository.findAll();
        int maxId = allFamilies.stream()
                .map(f -> extractIdNumber(f.getId()))
                .max(Integer::compareTo)
                .orElse(0);
        return String.format("@F%d@", maxId + 1);
    }

    /**
     * Infer GEDCOM Sex enum from Person gender string.
     */
    private GenderEnum inferSex(String gender) {
        if (gender == null) {
			return null;
		}
        switch (gender.toLowerCase()) {
            case "male":
            case "m":
                return GenderEnum.M;
            case "female":
            case "f":
                return GenderEnum.F;
            default:
                return null;
        }
    }

    /**
     * Add parent relationship (FATHER or MOTHER).
     * Creates or reuses Family and adds individual as child.
     */
    private RelationshipResponse addParentRelationship(Individual child, Individual parent, boolean isFather) {
        // Find existing family where child already belongs
        List<FamilyChild> childRecords = familyChildRepository.findByChildId(child.getId());
        Family family = null;

        if (!childRecords.isEmpty()) {
            // Child already in a family, use that family
            String existingFamilyId = childRecords.get(0).getFamilyId();
            family = familyRepository.findById(existingFamilyId).orElse(null);
        }

        if (family == null) {
            // Create new family
            family = new Family();
            family.setId(generateFamilyId());
            if (isFather) {
                family.setHusbandId(parent.getId());
            } else {
                family.setWifeId(parent.getId());
            }
            family = familyRepository.save(family);

            // Add child to family
            FamilyChild familyChild = new FamilyChild();
            familyChild.setFamilyId(family.getId());
            familyChild.setChildId(child.getId());
            familyChild.setRelationshipType(RelationshipType.BIOLOGICAL);
            familyChildRepository.save(familyChild);

            log.info("Created new family {} with parent {} and child {}", family.getId(), parent.getId(), child.getId());
        } else {
            // Update existing family with new parent
            if (isFather) {
                family.setHusbandId(parent.getId());
            } else {
                family.setWifeId(parent.getId());
            }
            family = familyRepository.save(family);
            log.info("Added parent {} to existing family {}", parent.getId(), family.getId());
        }

        // Find Person for parent
        Person parentPerson = findPersonByIndividualId(parent.getId());

        return new RelationshipResponse(
                family.getId(),
                parentPerson.getId(),
                getFullName(parentPerson),
                isFather ? "FATHER" : "MOTHER"
        );
    }

    /**
     * Add spouse relationship.
     * Creates or reuses Family with both as spouses.
     */
    private RelationshipResponse addSpouseRelationship(Individual person1, Individual person2) {
        // Check if family already exists between these two
        List<Family> existingFamilies = familyRepository.findFamilyBySpouses(person1.getId(), person2.getId());
        Family family;

        if (!existingFamilies.isEmpty()) {
            family = existingFamilies.get(0);
            log.info("Spouse relationship already exists in family {}", family.getId());
        } else {
            // Create new family
            family = new Family();
            family.setId(generateFamilyId());

            // Assign roles based on sex
            if (person1.getSex() == GenderEnum.M) {
                family.setHusbandId(person1.getId());
                family.setWifeId(person2.getId());
            } else if (person1.getSex() == GenderEnum.F) {
                family.setWifeId(person1.getId());
                family.setHusbandId(person2.getId());
            } else {
                // Gender-neutral assignment
                family.setHusbandId(person1.getId());
                family.setWifeId(person2.getId());
            }

            family = familyRepository.save(family);
            log.info("Created new family {} for spouses {} and {}", family.getId(), person1.getId(), person2.getId());
        }

        Person spousePerson = findPersonByIndividualId(person2.getId());

        return new RelationshipResponse(
                family.getId(),
                spousePerson.getId(),
                getFullName(spousePerson),
                "SPOUSE"
        );
    }

    /**
     * Add child relationship.
     * Adds related individual as child to person's family.
     */
    private RelationshipResponse addChildRelationship(Individual parent, Individual child) {
        // Find or create family where parent is spouse
        List<Family> parentFamilies = familyRepository.findFamiliesBySpouse(parent.getId());
        Family family;

        if (!parentFamilies.isEmpty()) {
            // Use first family (parent might have multiple families from remarriage)
            family = parentFamilies.get(0);
        } else {
            // Create new family with just this parent
            family = new Family();
            family.setId(generateFamilyId());
            if (parent.getSex() == GenderEnum.M) {
                family.setHusbandId(parent.getId());
            } else {
                family.setWifeId(parent.getId());
            }
            family = familyRepository.save(family);
            log.info("Created new single-parent family {} for parent {}", family.getId(), parent.getId());
        }

        // Check if child already in this family
        if (familyChildRepository.existsByFamilyIdAndChildId(family.getId(), child.getId())) {
            throw new IllegalStateException("Child relationship already exists in this family");
        }

        // Add child to family
        FamilyChild familyChild = new FamilyChild();
        familyChild.setFamilyId(family.getId());
        familyChild.setChildId(child.getId());
        familyChild.setRelationshipType(RelationshipType.BIOLOGICAL);
        familyChild = familyChildRepository.save(familyChild);

        log.info("Added child {} to family {}", child.getId(), family.getId());

        Person childPerson = findPersonByIndividualId(child.getId());

        return new RelationshipResponse(
                familyChild.getId().toString(),
                childPerson.getId(),
                getFullName(childPerson),
                "CHILD"
        );
    }

    /**
     * Helper to add parent relationship to result list.
     */
    private void addParentRelationship(List<RelationshipResponse> relationships, String parentIndividualId, String type) {
        Person parentPerson = findPersonByIndividualId(parentIndividualId);
        if (parentPerson != null) {
            relationships.add(new RelationshipResponse(
                    parentIndividualId,  // Use individual ID for parents
                    parentPerson.getId(),
                    getFullName(parentPerson),
                    type
            ));
        }
    }

    /**
     * Helper to add spouse relationship to result list.
     */
    private void addSpouseRelationship(List<RelationshipResponse> relationships, String spouseIndividualId, String familyId) {
        Person spousePerson = findPersonByIndividualId(spouseIndividualId);
        if (spousePerson != null) {
            relationships.add(new RelationshipResponse(
                    familyId,
                    spousePerson.getId(),
                    getFullName(spousePerson),
                    "SPOUSE"
            ));
        }
    }

    /**
     * Helper to add child relationship to result list.
     */
    private void addChildRelationship(List<RelationshipResponse> relationships, String childIndividualId, String familyChildId) {
        Person childPerson = findPersonByIndividualId(childIndividualId);
        if (childPerson != null) {
            relationships.add(new RelationshipResponse(
                    familyChildId,
                    childPerson.getId(),
                    getFullName(childPerson),
                    "CHILD"
            ));
        }
    }

    /**
     * Find Person by GEDCOM Individual ID.
     */
    private Person findPersonByIndividualId(String individualId) {
        Individual individual = individualRepository.findById(individualId).orElse(null);
        if (individual == null) {
			return null;
		}

        GedcomPersonLink link = gedcomPersonLinkRepository.findByGedcomIndividual(individual).orElse(null);
        return link != null ? link.getPerson() : null;
    }

    /**
     * Get full name from Person.
     */
    private String getFullName(Person person) {
        if (person.getLastName() != null && !person.getLastName().isEmpty()) {
            return person.getFirstName() + " " + person.getLastName();
        }
        return person.getFirstName();
    }
}
