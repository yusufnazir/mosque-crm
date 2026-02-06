package com.mosque.crm.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.PersonCreateDTO;
import com.mosque.crm.dto.PersonDTO;
import com.mosque.crm.dto.PersonUpdateDTO;
import com.mosque.crm.entity.GedcomPersonLink;
import com.mosque.crm.entity.Membership;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.User;
import com.mosque.crm.enums.MembershipStatus;
import com.mosque.crm.enums.PersonStatus;
import com.mosque.crm.repository.GedcomPersonLinkRepository;
import com.mosque.crm.repository.MembershipRepository;
import com.mosque.crm.repository.PersonRepository;

@Service
public class PersonService {

    private final PersonRepository personRepository;
    private final MembershipRepository membershipRepository;
    private final GedcomPersonLinkRepository gedcomPersonLinkRepository;

    public PersonService(PersonRepository personRepository,
                        MembershipRepository membershipRepository,
                        GedcomPersonLinkRepository gedcomPersonLinkRepository) {
        this.personRepository = personRepository;
        this.membershipRepository = membershipRepository;
        this.gedcomPersonLinkRepository = gedcomPersonLinkRepository;
    }

    /**
     * Get all persons
     */
    @Transactional(readOnly = true)
    public List<PersonDTO> getAllPersons() {
        return personRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all persons with sorting
     */
    @Transactional(readOnly = true)
    public List<PersonDTO> getAllPersonsSorted(String sortBy, String direction) {
        Sort sort = Sort.unsorted();
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
            sort = Sort.by(sortDirection, sortBy);
        } else {
            // Default sort by ID ascending if no sort field is specified
            sort = Sort.by(Sort.Direction.ASC, "id");
        }
        
        List<Person> persons = personRepository.findAll(sort);
        return persons.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all active persons
     */
    @Transactional(readOnly = true)
    public List<PersonDTO> getAllActivePersons() {
        return personRepository.findAllActivePersons().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all persons with active memberships
     */
    @Transactional(readOnly = true)
    public List<PersonDTO> getAllWithActiveMemberships() {
        return personRepository.findAllWithActiveMemberships().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get person by ID as DTO
     */
    @Transactional(readOnly = true)
    public Optional<PersonDTO> getPersonById(Long id) {
        return personRepository.findById(id)
                .map(this::convertToDTO);
    }

    /**
     * Get person entity by ID
     */
    @Transactional(readOnly = true)
    public Optional<Person> getPersonEntityById(Long id) {
        return personRepository.findById(id);
    }

    /**
     * Get person by email
     */
    @Transactional(readOnly = true)
    public Optional<PersonDTO> getPersonByEmail(String email) {
        return personRepository.findByEmail(email)
                .map(this::convertToDTO);
    }

    /**
     * Search persons by name or email
     */
    @Transactional(readOnly = true)
    public List<PersonDTO> searchPersons(String searchTerm) {
        return personRepository.searchPersons(searchTerm).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Find person by exact name and date of birth
     */
    @Transactional(readOnly = true)
    public Optional<PersonDTO> findPersonByNameAndDateOfBirth(String firstName, String lastName, LocalDate dateOfBirth) {
    	if(dateOfBirth == null) {
    		Optional<Person> personOpt = personRepository.findByFirstNameAndLastName(firstName, lastName);
    		 return personOpt.map(this::convertToDTO);
    	}else {
    		Optional<Person> personOpt = personRepository.findByFirstNameAndLastNameAndDateOfBirth(firstName, lastName, dateOfBirth);
    		 return personOpt.map(this::convertToDTO);
    	}
    }

    /**
     * Create new person
     */
    @Transactional
    public PersonDTO createPerson(PersonCreateDTO createDTO) {
        Person person = new Person();
        person.setFirstName(createDTO.getFirstName());
        person.setLastName(createDTO.getLastName());
        person.setGender(createDTO.getGender());
        person.setDateOfBirth(createDTO.getDateOfBirth());
        person.setDateOfDeath(createDTO.getDateOfDeath());
        person.setEmail(createDTO.getEmail());
        person.setPhone(createDTO.getPhone());
        person.setAddress(createDTO.getAddress());
        person.setCity(createDTO.getCity());
        person.setCountry(createDTO.getCountry());
        person.setPostalCode(createDTO.getPostalCode());
        person.setStatus(createDTO.getStatus() != null ? createDTO.getStatus() : PersonStatus.ACTIVE);
        person.setCreatedAt(LocalDateTime.now());
        person.setUpdatedAt(LocalDateTime.now());

        Person savedPerson = personRepository.save(person);
        return convertToDTO(savedPerson);
    }

    /**
     * Update existing person
     */
    @Transactional
    public PersonDTO updatePerson(Long id, PersonUpdateDTO updateDTO) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + id));

        // Update fields
        if (updateDTO.getFirstName() != null) {
            person.setFirstName(updateDTO.getFirstName());
        }
        if (updateDTO.getLastName() != null) {
            person.setLastName(updateDTO.getLastName());
        }
        if (updateDTO.getGender() != null) {
            person.setGender(updateDTO.getGender());
        }
        if (updateDTO.getDateOfBirth() != null) {
            person.setDateOfBirth(updateDTO.getDateOfBirth());
        }
        if (updateDTO.getDateOfDeath() != null) {
            person.setDateOfDeath(updateDTO.getDateOfDeath());
        }
        if (updateDTO.getEmail() != null) {
            person.setEmail(updateDTO.getEmail());
        }
        if (updateDTO.getPhone() != null) {
            person.setPhone(updateDTO.getPhone());
        }
        if (updateDTO.getAddress() != null) {
            person.setAddress(updateDTO.getAddress());
        }
        if (updateDTO.getCity() != null) {
            person.setCity(updateDTO.getCity());
        }
        if (updateDTO.getCountry() != null) {
            person.setCountry(updateDTO.getCountry());
        }
        if (updateDTO.getPostalCode() != null) {
            person.setPostalCode(updateDTO.getPostalCode());
        }
        if (updateDTO.getStatus() != null) {
            person.setStatus(updateDTO.getStatus());
        }

        person.setUpdatedAt(LocalDateTime.now());

        Person updatedPerson = personRepository.save(person);
        return convertToDTO(updatedPerson);
    }

    /**
     * Mark person as deceased
     */
    @Transactional
    public PersonDTO markPersonAsDeceased(Long id, LocalDate dateOfDeath) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + id));

        // Update the date of death and status
        person.setDateOfDeath(dateOfDeath);
        person.setStatus(com.mosque.crm.enums.PersonStatus.DECEASED);
        person.setUpdatedAt(LocalDateTime.now());

        // Save the person first
        Person updatedPerson = personRepository.save(person);

        // Update any active memberships to CANCELLED status since the person has passed away
        List<Membership> memberships = membershipRepository.findByPerson(updatedPerson);
        for (Membership membership : memberships) {
            // Update membership status to reflect that the person has passed away
            membership.setStatus(MembershipStatus.CANCELLED);
            membershipRepository.save(membership);
        }

        return convertToDTO(updatedPerson);
    }

    /**
     * Delete person
     */
    @Transactional
    public void deletePerson(Long id) {
        if (!personRepository.existsById(id)) {
            throw new RuntimeException("Person not found with id: " + id);
        }
        personRepository.deleteById(id);
    }

    /**
     * Convert Person entity to PersonDTO
     */
    private PersonDTO convertToDTO(Person person) {
        PersonDTO dto = new PersonDTO();
        dto.setId(person.getId());
        dto.setFirstName(person.getFirstName());
        dto.setLastName(person.getLastName());
        dto.setGender(person.getGender());
        dto.setDateOfBirth(person.getDateOfBirth());
        dto.setDateOfDeath(person.getDateOfDeath());
        dto.setEmail(person.getEmail());
        dto.setPhone(person.getPhone());
        dto.setAddress(person.getAddress());
        dto.setCity(person.getCity());
        dto.setCountry(person.getCountry());
        dto.setPostalCode(person.getPostalCode());
        dto.setStatus(person.getStatus());
        dto.setCreatedAt(person.getCreatedAt());
        dto.setUpdatedAt(person.getUpdatedAt());

        // Set portal access indicator
        dto.setHasPortalAccess(person.hasPortalAccess());

        // Set GEDCOM data indicator
        dto.setHasGedcomData(person.hasGedcomData());
        if (person.hasGedcomData()) {
            GedcomPersonLink link = person.getGedcomLink();
            if (link != null && link.getGedcomIndividual() != null) {
                dto.setGedcomIndividualId(link.getGedcomIndividual().getId());
            }
        }

        // Set active membership indicator
        Optional<Membership> activeMembership = membershipRepository.findActiveMembershipByPerson(person);
        dto.setHasActiveMembership(activeMembership.isPresent());

        // Set account info if user is linked
        if (person.hasPortalAccess()) {
            User user = person.getUser();
            if (user != null) {
                dto.setUsername(user.getUsername());
                dto.setAccountEnabled(user.isAccountEnabled());
                if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                    dto.setRole(user.getRoles().iterator().next().getName());
                }
            }
        }

        return dto;
    }
}
