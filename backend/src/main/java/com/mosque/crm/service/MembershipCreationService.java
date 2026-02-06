package com.mosque.crm.service;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.MembershipCreateDTO;
import com.mosque.crm.dto.MembershipListDTO;
import com.mosque.crm.entity.GedcomPersonLink;
import com.mosque.crm.entity.Membership;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserMemberLink;
import com.mosque.crm.entity.gedcom.Individual;
import com.mosque.crm.enums.GenderEnum;
import com.mosque.crm.enums.MembershipStatus;
import com.mosque.crm.enums.MembershipType;
import com.mosque.crm.enums.PersonStatus;
import com.mosque.crm.repository.GedcomPersonLinkRepository;
import com.mosque.crm.repository.IndividualRepository;
import com.mosque.crm.repository.MembershipRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.UserMemberLinkRepository;
import com.mosque.crm.repository.UserRepository;

@Service
public class MembershipCreationService {

    private final PersonRepository personRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final IndividualRepository individualRepository;
    private final GedcomPersonLinkRepository gedcomPersonLinkRepository;
    private final UserMemberLinkRepository userMemberLinkRepository;

    public MembershipCreationService(PersonRepository personRepository,
                                     MembershipRepository membershipRepository,
                                     UserRepository userRepository,
                                     RoleRepository roleRepository,
                                     PasswordEncoder passwordEncoder,
                                     IndividualRepository individualRepository,
                                     GedcomPersonLinkRepository gedcomPersonLinkRepository,
                                     UserMemberLinkRepository userMemberLinkRepository) {
        this.personRepository = personRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.individualRepository = individualRepository;
        this.gedcomPersonLinkRepository = gedcomPersonLinkRepository;
        this.userMemberLinkRepository = userMemberLinkRepository;
    }

    @Transactional
    public MembershipListDTO createMember(MembershipCreateDTO dto) {
        // Create person
        Person person = new Person();
        person.setFirstName(normalizeString(dto.getFirstName()));
        person.setLastName(normalizeString(dto.getLastName()));
        person.setEmail(normalizeString(dto.getEmail()));
        person.setPhone(dto.getPhone());
        person.setGender(normalizeGender(dto.getGender()));
        person.setDateOfBirth(dto.getDateOfBirth());
        person.setAddress(normalizeString(dto.getAddress()));
        person.setCity(normalizeString(dto.getCity()));
        person.setCountry(normalizeString(dto.getCountry()));
        person.setPostalCode(dto.getPostalCode());
        person.setStatus(PersonStatus.ACTIVE);
        Person savedPerson = personRepository.save(person);

        // Create membership
        Membership membership = new Membership();
        membership.setPerson(savedPerson);
        membership.setMembershipType(dto.getMembershipType() != null ? dto.getMembershipType() : MembershipType.FULL);
        membership.setStatus(dto.getMembershipStatus() != null ? dto.getMembershipStatus() : MembershipStatus.ACTIVE);
        membership.setStartDate(dto.getStartDate() != null ? dto.getStartDate() : LocalDate.now());
        membership.setEndDate(dto.getEndDate());
        membership.setNotes(dto.getNotes());
        Membership savedMembership = membershipRepository.save(membership);

        // Create GEDCOM individual + link
        createGedcomIndividualAndLink(savedPerson);

        // Optionally create account
        if (dto.isNeedsAccount()) {
            createUserAccount(dto, savedPerson);
        }

        // --- ACCOUNT MANAGEMENT LOGIC ---
        // If username is present, create or update user account and link
        if (dto.getUsername() != null && !dto.getUsername().isBlank()) {
            User user = userRepository.findByUsername(dto.getUsername()).orElse(null);
            boolean isNewUser = false;
            if (user == null) {
                user = new User();
                user.setUsername(dto.getUsername());
                isNewUser = true;
            }
            if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
                user.setPassword(passwordEncoder.encode(dto.getPassword()));
            }
            user.setEmail(dto.getEmail());
            user.setAccountEnabled(true);
            // Assign role
            String roleName = dto.getRole() != null ? dto.getRole() : "MEMBER";
            Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));
            user.setRoles(Collections.singleton(role));
            userRepository.save(user);

            // Create or update UserMemberLink
            UserMemberLink link = user.getMemberLink();
            if (link == null) {
                link = new UserMemberLink();
                link.setUser(user);
                link.setPerson(savedPerson);
            } else {
                link.setPerson(savedPerson);
            }
            user.setMemberLink(link);
            userRepository.save(user); // Cascade saves link
        }

        // Account info for DTO
        String username = null;
        String role = null;
        boolean needsAccount = false;
        if (savedPerson.getUserLink() != null && savedPerson.getUserLink().getUser() != null) {
            User user = savedPerson.getUserLink().getUser();
            username = user.getUsername();
            if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                role = user.getRoles().iterator().next().getName();
            }
            needsAccount = true;
        }
        return new MembershipListDTO(
                    savedPerson.getId().toString(),
                    savedPerson.getFirstName(),
                    savedPerson.getLastName(),
                    savedPerson.getEmail(),
                    savedPerson.getPhone(),
                    savedPerson.getGender(),
                    savedPerson.getDateOfBirth(),
                    savedPerson.getAddress(),
                    savedPerson.getCity(),
                    savedPerson.getCountry(),
                    savedPerson.getPostalCode(),
                    savedMembership.getStatus().name(),
                    savedMembership.getMembershipType().name(),
                    savedMembership.getStartDate(),
                    savedMembership.getEndDate(),
                    username,
                    role,
                    needsAccount,
                    savedPerson.getDateOfDeath() // Added date of death
                );
    }

    private void createUserAccount(MembershipCreateDTO dto, Person person) {
        if (dto.getUsername() == null || dto.getPassword() == null) {
            throw new IllegalArgumentException("Username and password are required when creating an account.");
        }

        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new IllegalArgumentException("Username already exists.");
        }

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setEmail(dto.getEmail());
        user.setAccountEnabled(true);

        String roleName = dto.getRole() != null ? dto.getRole() : "MEMBER";
        Role role = roleRepository.findByName(roleName)
            .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));
        user.setRoles(Collections.singleton(role));

        UserMemberLink link = new UserMemberLink();
        link.setUser(user);
        link.setPerson(person);
        user.setMemberLink(link);

        userRepository.save(user); // Save user first to get ID
        userMemberLinkRepository.save(link); // Explicitly save link
    }

    private void createGedcomIndividualAndLink(Person person) {
        // Generate GEDCOM xref like @I<8chars>@ to keep under 20 chars
        String xref = "@I" + person.getId().toString().replace("-", "").substring(0, 8) + "@";

        Individual ind = new Individual();
        ind.setId(xref);
        ind.setGivenName(person.getFirstName());
        ind.setSurname(person.getLastName());
        ind.setSex(mapSex(person.getGender()));
        ind.setBirthDate(person.getDateOfBirth());
        ind.setLiving(true);

        Individual savedInd = individualRepository.save(ind);

        GedcomPersonLink link = new GedcomPersonLink();
        link.setPerson(person);
        link.setGedcomIndividual(savedInd);
        gedcomPersonLinkRepository.save(link);
    }

    @Transactional
    public MembershipListDTO updateMember(String personId, MembershipCreateDTO dto) {
        Person person = personRepository.findById(Long.valueOf(personId))
                .orElseThrow(() -> new IllegalArgumentException("Person not found with ID: " + personId));

        // Update person fields
        person.setFirstName(normalizeString(dto.getFirstName()));
        person.setLastName(normalizeString(dto.getLastName()));
        person.setEmail(normalizeString(dto.getEmail()));
        person.setPhone(dto.getPhone());
        person.setGender(normalizeGender(dto.getGender()));
        person.setDateOfBirth(dto.getDateOfBirth());
        person.setAddress(normalizeString(dto.getAddress()));
        person.setCity(normalizeString(dto.getCity()));
        person.setCountry(normalizeString(dto.getCountry()));
        person.setPostalCode(dto.getPostalCode());
        Person savedPerson = personRepository.save(person);

        // Update membership
        Membership membership = membershipRepository.findByPersonId(Long.parseLong(personId))
                .orElseThrow(() -> new IllegalArgumentException("Membership not found for person ID: " + personId));

        membership.setMembershipType(dto.getMembershipType() != null ? dto.getMembershipType() : MembershipType.FULL);
        membership.setStatus(dto.getMembershipStatus() != null ? dto.getMembershipStatus() : MembershipStatus.ACTIVE);
        membership.setStartDate(dto.getStartDate() != null ? dto.getStartDate() : membership.getStartDate());
        membership.setEndDate(dto.getEndDate());
        membership.setNotes(dto.getNotes());
        Membership savedMembership = membershipRepository.save(membership);

        // Update GEDCOM individual if exists
        GedcomPersonLink link = gedcomPersonLinkRepository.findByPerson(person)
                .orElse(null);
        if (link != null) {
            Individual individual = link.getGedcomIndividual();
            individual.setGivenName(savedPerson.getFirstName());
            individual.setSurname(savedPerson.getLastName());
            individual.setSex(mapSex(savedPerson.getGender()));
            individual.setBirthDate(savedPerson.getDateOfBirth());
            individualRepository.save(individual);
        }

        // --- ACCOUNT MANAGEMENT LOGIC ---
        if (dto.isNeedsAccount() && dto.getUsername() != null && !dto.getUsername().isBlank()) {
            User user = userRepository.findByUsername(dto.getUsername()).orElse(null);
            boolean isNewUser = false;
            if (user == null) {
                user = new User();
                user.setUsername(dto.getUsername());
                isNewUser = true;
            }
            if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
                user.setPassword(passwordEncoder.encode(dto.getPassword()));
            }
            user.setEmail(dto.getEmail());
            user.setAccountEnabled(true);
            // Assign role
            String roleName = dto.getRole() != null ? dto.getRole() : "MEMBER";
            Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));
            Set<Role> roles = new HashSet<>();
            roles.add(role);
            user.setRoles(roles);
            userRepository.save(user);

            // Create or update UserMemberLink
            UserMemberLink userLink = user.getMemberLink();
            if (userLink == null) {
                userLink = new UserMemberLink();
                userLink.setUser(user);
                userLink.setPerson(savedPerson);
            } else {
                userLink.setPerson(savedPerson);
            }
            user.setMemberLink(userLink);
            userRepository.save(user); // Cascade saves link
        }

        // Account info for DTO
        String username = null;
        String role = null;
        boolean needsAccount = false;
        if (savedPerson.getUserLink() != null && savedPerson.getUserLink().getUser() != null) {
            User user = savedPerson.getUserLink().getUser();
            username = user.getUsername();
            if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                role = user.getRoles().iterator().next().getName();
            }
            needsAccount = true;
        }
        return new MembershipListDTO(
                    savedPerson.getId().toString(),
                    savedPerson.getFirstName(),
                    savedPerson.getLastName(),
                    savedPerson.getEmail(),
                    savedPerson.getPhone(),
                    savedPerson.getGender(),
                    savedPerson.getDateOfBirth(),
                    savedPerson.getAddress(),
                    savedPerson.getCity(),
                    savedPerson.getCountry(),
                    savedPerson.getPostalCode(),
                    savedMembership.getStatus().name(),
                    savedMembership.getMembershipType().name(),
                    savedMembership.getStartDate(),
                    savedMembership.getEndDate(),
                    username,
                    role,
                    needsAccount,
                    savedPerson.getDateOfDeath() // Added date of death
                );
    }

    private GenderEnum mapSex(String gender) {
        if (gender == null || gender.isBlank()) {
			return GenderEnum.U;
		}
        String g = gender.trim().toUpperCase();
        return switch (g) {
            case "MALE", "M", "MAN", "MEN" -> GenderEnum.M;
            case "FEMALE", "F", "WOMAN", "WOMEN" -> GenderEnum.F;
            default -> GenderEnum.U;
        };
    }

    /**
     * Normalizes string fields to lowercase for consistent storage.
     * Used for names, cities, countries, etc. where case sensitivity is not important.
     */
    private String normalizeString(String value) {
        if (value == null || value.isBlank()) {
			return value;
		}
        return value.trim().toLowerCase();
    }

    /**
     * Normalizes gender string to database format ("M" or "F").
     * This ensures consistency with existing data.
     */
    private String normalizeGender(String gender) {
        if (gender == null || gender.isBlank()) {
			return null;
		}
        String g = gender.trim().toUpperCase();
        return switch (g) {
            case "MALE", "M", "MAN", "MEN" -> "M";
            case "FEMALE", "F", "WOMAN", "WOMEN" -> "F";
            default -> gender; // Keep original if unrecognized
        };
    }
}
