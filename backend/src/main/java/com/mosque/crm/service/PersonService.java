package com.mosque.crm.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.PageResponse;
import com.mosque.crm.dto.PersonCreateDTO;
import com.mosque.crm.dto.PersonDTO;
import com.mosque.crm.dto.PersonUpdateDTO;
import com.mosque.crm.entity.GedcomPersonLink;
import com.mosque.crm.entity.Membership;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.User;
import com.mosque.crm.enums.MembershipStatus;
import com.mosque.crm.enums.PersonStatus;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.GedcomPersonLinkRepository;
import com.mosque.crm.repository.MembershipRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanLimitExceededException;

@Service
public class PersonService {

    private final PersonRepository personRepository;
    private final MembershipRepository membershipRepository;
    private final GedcomPersonLinkRepository gedcomPersonLinkRepository;
    private final OrganizationSubscriptionService organizationSubscriptionService;

    public PersonService(PersonRepository personRepository,
                        MembershipRepository membershipRepository,
                        GedcomPersonLinkRepository gedcomPersonLinkRepository,
                        OrganizationSubscriptionService organizationSubscriptionService) {
        this.personRepository = personRepository;
        this.membershipRepository = membershipRepository;
        this.gedcomPersonLinkRepository = gedcomPersonLinkRepository;
        this.organizationSubscriptionService = organizationSubscriptionService;
    }

    /**
     * Get lightweight stats (counts only, no entity loading)
     */
    @Transactional(readOnly = true)
    public long countActivePersons() {
        return personRepository.countActivePersons();
    }

    @Transactional(readOnly = true)
    public long countAllPersons() {
        return personRepository.countAllPersons();
    }

    /**
     * Get all persons - optimized with batch-loaded associations
     */
    @Transactional(readOnly = true)
    public List<PersonDTO> getAllPersons() {
        List<Person> persons = personRepository.findAllWithAssociations();
        Set<Long> activeMemberPersonIds = new HashSet<>(membershipRepository.findPersonIdsWithActiveMembership());
        return persons.stream()
                .map(p -> convertToDTO(p, activeMemberPersonIds))
                .collect(Collectors.toList());
    }
    
    /**
     * Get all persons with sorting - optimized with batch-loaded associations
     */
    @Transactional(readOnly = true)
    public List<PersonDTO> getAllPersonsSorted(String sortBy, String direction) {
        List<Person> persons = personRepository.findAllWithAssociationsUnsorted();
        Set<Long> activeMemberPersonIds = new HashSet<>(membershipRepository.findPersonIdsWithActiveMembership());

        // Sort in-memory (cannot combine Sort with JOIN FETCH in JPQL)
        Comparator<Person> comparator = getPersonComparator(sortBy);
        if ("desc".equalsIgnoreCase(direction)) {
            comparator = comparator.reversed();
        }
        persons.sort(comparator);

        return persons.stream()
                .map(p -> convertToDTO(p, activeMemberPersonIds))
                .collect(Collectors.toList());
    }

    private Comparator<Person> getPersonComparator(String sortBy) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return Comparator.comparing(Person::getId, Comparator.nullsLast(Comparator.naturalOrder()));
        }
        return switch (sortBy) {
            case "firstName" -> Comparator.comparing(Person::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
            case "lastName" -> Comparator.comparing(Person::getLastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
            case "email" -> Comparator.comparing(Person::getEmail, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
            case "status" -> Comparator.comparing(p -> p.getStatus() != null ? p.getStatus().name() : "", Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
            default -> Comparator.comparing(Person::getId, Comparator.nullsLast(Comparator.naturalOrder()));
        };
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
     * Get persons with server-side pagination, search, and sorting.
     * Uses a two-step approach:
     * 1. Paginated ID query (lightweight, filterable, sortable)
     * 2. Batch-fetch full entities with associations for the page's IDs
     */
    @Transactional(readOnly = true)
    public PageResponse<PersonDTO> getPersonsPaged(int page, int size, String search, String sortBy, String direction) {
        // Build sort
        Sort sort = buildSort(sortBy, direction);
        Pageable pageable = PageRequest.of(page, size, sort);

        // Step 1: Get paged IDs with search filter
        String searchTerm = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        Page<Person> pagedResult = personRepository.findPagedWithSearch(searchTerm, pageable);

        if (pagedResult.isEmpty()) {
            return new PageResponse<>(List.of(), page, size, pagedResult.getTotalElements());
        }

        // Step 2: Batch-fetch associations for this page's persons
        List<Long> pageIds = pagedResult.getContent().stream()
                .map(Person::getId)
                .collect(Collectors.toList());
        List<Person> personsWithAssociations = personRepository.findByIdsWithAssociations(pageIds);

        // Preserve sort order from step 1
        Map<Long, Person> personMap = personsWithAssociations.stream()
                .collect(Collectors.toMap(Person::getId, Function.identity()));
        List<Person> orderedPersons = pageIds.stream()
                .map(personMap::get)
                .filter(p -> p != null)
                .collect(Collectors.toList());

        // Pre-load active membership IDs for this batch
        Set<Long> activeMemberPersonIds = new HashSet<>(membershipRepository.findPersonIdsWithActiveMembership());

        List<PersonDTO> dtos = orderedPersons.stream()
                .map(p -> convertToDTO(p, activeMemberPersonIds))
                .collect(Collectors.toList());

        return new PageResponse<>(dtos, page, size, pagedResult.getTotalElements());
    }

    private Sort buildSort(String sortBy, String direction) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return Sort.by(Sort.Direction.ASC, "firstName");
        }
        Sort.Direction dir = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return switch (sortBy) {
            case "firstName" -> Sort.by(dir, "firstName");
            case "lastName" -> Sort.by(dir, "lastName");
            case "email" -> Sort.by(dir, "email");
            case "status" -> Sort.by(dir, "status");
            default -> Sort.by(Sort.Direction.ASC, "firstName");
        };
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
        // Enforce members.max plan limit
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId != null) {
            try {
                Integer memberLimit = organizationSubscriptionService.getFeatureLimit(organizationId, FeatureKeys.MEMBERS_MAX);
                if (memberLimit != null) {
                    long currentCount = personRepository.countAllPersons();
                    if (currentCount >= memberLimit) {
                        throw new PlanLimitExceededException(FeatureKeys.MEMBERS_MAX, memberLimit, (int) currentCount);
                    }
                }
            } catch (PlanLimitExceededException e) {
                throw e;
            } catch (RuntimeException e) {
                // No active subscription — allow creation (graceful degradation)
            }
        }

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
        person.setIdNumber(createDTO.getIdNumber());
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
        if (updateDTO.getIdNumber() != null) {
            person.setIdNumber(updateDTO.getIdNumber());
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
     * Convert Person entity to PersonDTO.
     * Falls back to per-entity membership query (used by single-entity lookups).
     */
    private PersonDTO convertToDTO(Person person) {
        Optional<Membership> activeMembership = membershipRepository.findActiveMembershipByPerson(person);
        return convertToDTO(person, activeMembership.isPresent());
    }

    /**
     * Convert Person entity to PersonDTO with pre-loaded active membership set.
     * Used by list queries to avoid N+1.
     */
    private PersonDTO convertToDTO(Person person, Set<Long> activeMemberPersonIds) {
        boolean hasActiveMembership = person.getId() != null && activeMemberPersonIds.contains(person.getId());
        return convertToDTO(person, hasActiveMembership);
    }

    /**
     * Core conversion logic - associations are expected to be already loaded on the entity.
     */
    private PersonDTO convertToDTO(Person person, boolean hasActiveMembership) {
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
        dto.setIdNumber(person.getIdNumber());

        // Defensive: if dateOfDeath is set but status is not DECEASED, override the status
        if (person.getDateOfDeath() != null && person.getStatus() != PersonStatus.DECEASED) {
            dto.setStatus(PersonStatus.DECEASED);
        }

        dto.setCreatedAt(person.getCreatedAt());
        dto.setUpdatedAt(person.getUpdatedAt());

        // Set portal access indicator (userLink already fetched via JOIN FETCH)
        dto.setHasPortalAccess(person.hasPortalAccess());

        // Set GEDCOM data indicator (gedcomLink already fetched via JOIN FETCH)
        dto.setHasGedcomData(person.hasGedcomData());
        if (person.hasGedcomData()) {
            GedcomPersonLink link = person.getGedcomLink();
            if (link != null && link.getGedcomIndividual() != null) {
                dto.setGedcomIndividualId(link.getGedcomIndividual().getId());
            }
        }

        // Set active membership indicator (pre-loaded, no extra query)
        dto.setHasActiveMembership(hasActiveMembership);

        // Set profile image URL (served through backend, never expose storage key)
        if (person.getProfileImageKey() != null) {
            dto.setProfileImageUrl("/api/profile-image/persons/" + person.getId());
        }

        // Set account info if user is linked (user already fetched via JOIN FETCH)
        if (person.hasPortalAccess()) {
            User user = person.getUser();
            if (user != null) {
                dto.setUsername(user.getUsername());
                dto.setAccountEnabled(user.isAccountEnabled());
                if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                    List<String> roleNames = user.getRoles().stream()
                            .map(r -> r.getName())
                            .collect(Collectors.toList());
                    dto.setRoles(roleNames);
                    // Keep single role field for backward compatibility
                    dto.setRole(roleNames.get(0));
                }
            }
        }

        return dto;
    }
}
