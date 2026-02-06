package com.mosque.crm.service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.MemberDTO;
import com.mosque.crm.entity.GedcomPersonLink;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserMemberLink;
import com.mosque.crm.entity.gedcom.Individual;
import com.mosque.crm.enums.PersonStatus;
import com.mosque.crm.repository.GedcomPersonLinkRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.UserMemberLinkRepository;
import com.mosque.crm.repository.UserRepository;

@Service
@Transactional
public class MemberService {


    @Autowired
    private GedcomPersonLinkRepository gedcomPersonLinkRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserMemberLinkRepository userMemberLinkRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<MemberDTO> getAllMembers() {
        List<Person> persons = personRepository.findAll();

        return persons.stream()
            .map(this::convertPersonToDTO)
            .collect(Collectors.toList());
    }

    public MemberDTO getMemberById(Long id) {
        Optional<Person> personOpt = personRepository.findById(id);
        if (personOpt.isEmpty()) {
            return null;
        }
        Person person = personOpt.get();
        MemberDTO dto = convertPersonToDTO(person);
        // Account info is handled in convertPersonToDTO
        return dto;
    }

    public MemberDTO createMember(MemberDTO memberDTO) {
        Person person = new Person();
        person.setFirstName(memberDTO.getFirstName());
        person.setLastName(memberDTO.getLastName());
        person.setEmail(memberDTO.getEmail());
        person.setPhone(memberDTO.getPhone());
        person.setGender(memberDTO.getGender());
        person.setDateOfBirth(memberDTO.getDateOfBirth());
        person.setAddress(memberDTO.getAddress());
        person.setCity(memberDTO.getCity());
        person.setCountry(memberDTO.getCountry());
        person.setPostalCode(memberDTO.getPostalCode());
        person.setStatus(PersonStatus.ACTIVE); // Default to active status

        Person savedPerson = personRepository.save(person);
        return convertPersonToDTO(savedPerson);
    }

    public MemberDTO updateMember(Long id, MemberDTO memberDTO) {
        // Convert Long id to UUID if needed, or use id from the MemberDTO
        // For now, we'll assume memberDTO has an id field that maps to UUID
        if (memberDTO.getId() != null) {
            Long personId = Long.valueOf(memberDTO.getId());
            Optional<Person> personOpt = personRepository.findById(personId);
            if (personOpt.isPresent()) {
                Person person = personOpt.get();
                person.setFirstName(memberDTO.getFirstName());
                person.setLastName(memberDTO.getLastName());
                person.setEmail(memberDTO.getEmail());
                person.setPhone(memberDTO.getPhone());
                person.setGender(memberDTO.getGender());
                person.setDateOfBirth(memberDTO.getDateOfBirth());
                person.setAddress(memberDTO.getAddress());
                person.setCity(memberDTO.getCity());
                person.setCountry(memberDTO.getCountry());
                person.setPostalCode(memberDTO.getPostalCode());
                // Only update status if it's provided in the DTO
                if (memberDTO.getMembershipStatus() != null) {
                    try {
                        person.setStatus(PersonStatus.valueOf(memberDTO.getMembershipStatus()));
                    } catch (IllegalArgumentException e) {
                        // If the status is invalid, keep the current status
                    }
                }

                Person updatedPerson = personRepository.save(person);

                // --- ACCOUNT MANAGEMENT LOGIC ---
                if (memberDTO.isAccountEnabled() && StringUtils.isNotBlank(memberDTO.getUsername())) {
                    User user = userRepository.findByUsername(memberDTO.getUsername()).orElse(null);
                    boolean isNewUser = false;
                    if (user == null) {
                        user = new User();
                        user.setUsername(memberDTO.getUsername());
                        isNewUser = true;
                    }
                    user.setEmail(memberDTO.getEmail());
                    user.setAccountEnabled(true);
                    // Set password if provided
                    if (StringUtils.isNotBlank(memberDTO.getPassword())) {
                        user.setPassword(passwordEncoder.encode(memberDTO.getPassword()));
                    } else if (isNewUser) {
                        // If creating a new user and no password provided, set a random password (or throw error)
                        user.setPassword(passwordEncoder.encode("changeme123"));
                    }
                    // Assign role
                    String roleName = memberDTO.getRole() != null ? memberDTO.getRole() : "MEMBER";
                    Role role = roleRepository.findByName(roleName)
                        .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));
                    Set<Role> roleSet = new HashSet<>();
                    roleSet.add(role);
                    user.setRoles(roleSet);
                    userRepository.save(user);

                    // Create or update UserMemberLink (robust pattern)
                    UserMemberLink userLink = userMemberLinkRepository.findByUser(user).orElse(null);
                    if (userLink == null) {
                        userLink = new UserMemberLink();
                        userLink.setUser(user);
                        userLink.setPerson(updatedPerson);
                        userMemberLinkRepository.save(userLink);
                        user.setMemberLink(userLink);
                        userRepository.save(user);
                    } else {
                        userLink.setPerson(updatedPerson);
                        userMemberLinkRepository.save(userLink);
                    }
                }

                return convertPersonToDTO(updatedPerson);
            }
        }
        throw new IllegalArgumentException("Member not found or invalid id");
    }

    public void deleteMember(Long id) {
        // Implementation depends on how the ID mapping works
        throw new UnsupportedOperationException("Member deletion needs to be implemented based on personId");
    }

    public List<MemberDTO> searchMembers(String keyword) {
        List<Person> persons = personRepository.searchPersons(keyword);
        return persons.stream()
            .map(this::convertPersonToDTO)
            .collect(Collectors.toList());
    }

    /**
     * Convert GEDCOM Individual to a read-only DTO. Membership table removed.
     */
    private MemberDTO convertLinkToDTO(GedcomPersonLink link) {
        Person person = link.getPerson();
        Individual individual = link.getGedcomIndividual();

        String firstName = coalesce(person.getFirstName(), individual.getGivenName());
        String lastName = coalesce(person.getLastName(), individual.getSurname());
        String gender = coalesce(person.getGender(), individual.getSex() != null ? individual.getSex().name() : null);
    return new MemberDTO(
                    person.getId() != null ? person.getId().toString() : null,
                    firstName,
                    lastName,
                    person.getEmail(),
                    person.getPhone(),
                    person.getDateOfBirth() != null ? person.getDateOfBirth() : individual.getBirthDate(),
                    gender,
                    person.getAddress(),
                    person.getCity(),
                    person.getCountry(),
                    person.getPostalCode(),
                    mapStatus(person.getStatus()),
                    null, // memberSince
                    null, // partnerId
                    null, // partnerName
                    null, // parentId
                    null, // children
                    null, // username
                    null, // role
                    false // accountEnabled
                );
    }

    private String mapStatus(PersonStatus status) {
        if (status == null) {
			return "INACTIVE";
		}
        return switch (status) {
            case ACTIVE -> "ACTIVE";
            case INACTIVE, DECEASED -> "INACTIVE";
        };
    }

    private String coalesce(String a, String b) {
        return (a != null && !a.isBlank()) ? a : b;
    }

    private MemberDTO convertPersonToDTO(Person person) {
        MemberDTO dto = new MemberDTO();
        dto.setId(person.getId().toString());
        dto.setFirstName(person.getFirstName());
        dto.setLastName(person.getLastName());
        dto.setEmail(person.getEmail());
        dto.setPhone(person.getPhone());
        dto.setGender(person.getGender());
        dto.setDateOfBirth(person.getDateOfBirth());
        dto.setAddress(person.getAddress());
        dto.setCity(person.getCity());
        dto.setCountry(person.getCountry());
        dto.setPostalCode(person.getPostalCode());
        dto.setMembershipStatus(person.getStatus() != null ? person.getStatus().name() : null);
        // Add account info if linked
        if (person.getUserLink() != null && person.getUserLink().getUser() != null) {
            User user = person.getUserLink().getUser();
            dto.setUsername(user.getUsername());
            if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                dto.setRole(user.getRoles().iterator().next().getName());
            }
            dto.setAccountEnabled(user.isAccountEnabled());
        } else {
            dto.setAccountEnabled(false);
        }
        return dto;
    }
}
