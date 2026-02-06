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

import com.mosque.crm.dto.PersonCreateDTO;
import com.mosque.crm.dto.PersonDTO;
import com.mosque.crm.dto.PersonDeceasedDTO;
import com.mosque.crm.dto.PersonUpdateDTO;
import com.mosque.crm.service.PersonService;

@RestController
@RequestMapping("/persons")
@CrossOrigin(origins = "*")
public class PersonController {

    private final PersonService personService;

    public PersonController(PersonService personService) {
        this.personService = personService;
    }

    /**
     * Get all persons with optional sorting
     */
    @GetMapping
    public ResponseEntity<List<PersonDTO>> getAllPersons(
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String direction) {
        List<PersonDTO> persons;
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            persons = personService.getAllPersonsSorted(sortBy, direction);
        } else {
            persons = personService.getAllPersons();
        }
        return ResponseEntity.ok(persons);
    }

    /**
     * Get all active persons
     */
    @GetMapping("/active")
    public ResponseEntity<List<PersonDTO>> getAllActivePersons() {
        List<PersonDTO> persons = personService.getAllActivePersons();
        return ResponseEntity.ok(persons);
    }

    /**
     * Get all persons with active memberships
     */
    @GetMapping("/members")
    public ResponseEntity<List<PersonDTO>> getAllWithActiveMemberships() {
        List<PersonDTO> persons = personService.getAllWithActiveMemberships();
        return ResponseEntity.ok(persons);
    }

    /**
     * Get person by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<PersonDTO> getPersonById(@PathVariable String id) {
        try {
            // Try to parse as Long first (for numeric IDs)
            Long personId = Long.parseLong(id);
            return personService.getPersonById(personId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (NumberFormatException e) {
            // If it's not a number, treat as search term
            List<PersonDTO> results = personService.searchPersons(id);
            if (!results.isEmpty()) {
                // Return the first match if found
                return ResponseEntity.ok(results.get(0));
            } else {
                return ResponseEntity.notFound().build();
            }
        }
    }

    /**
     * Search persons by name or email
     * Used by family relationships feature - accessible to all authenticated users
     */
    @GetMapping("/search")
    public ResponseEntity<List<PersonDTO>> searchPersons(@RequestParam String q) {
        List<PersonDTO> persons = personService.searchPersons(q);
        return ResponseEntity.ok(persons);
    }

    /**
     * Create new person
     */
    @PostMapping
    public ResponseEntity<PersonDTO> createPerson(@RequestBody PersonCreateDTO createDTO) {
        try {
            PersonDTO person = personService.createPerson(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(person);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update person
     */
    @PutMapping("/{id}")
    public ResponseEntity<PersonDTO> updatePerson(@PathVariable Long id, @RequestBody PersonUpdateDTO updateDTO) {
        try {
            updateDTO.setId(id);
            PersonDTO person = personService.updatePerson(id, updateDTO);
            return ResponseEntity.ok(person);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Mark person as deceased
     */
    @PutMapping("/{id}/deceased")
    public ResponseEntity<PersonDTO> markPersonAsDeceased(@PathVariable Long id, @RequestBody(required = false) PersonDeceasedDTO deceasedDTO) {
        try {
            // Use today's date if not provided in the request
            java.time.LocalDate dateOfDeath = deceasedDTO != null && deceasedDTO.getDateOfDeath() != null
                ? deceasedDTO.getDateOfDeath()
                : java.time.LocalDate.now();

            PersonDTO person = personService.markPersonAsDeceased(id, dateOfDeath);
            return ResponseEntity.ok(person);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Delete person
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePerson(@PathVariable Long id) {
        try {
            personService.deletePerson(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
