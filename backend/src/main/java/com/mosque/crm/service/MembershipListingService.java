package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.MembershipListDTO;
import com.mosque.crm.entity.Membership;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.User;
import com.mosque.crm.enums.MembershipStatus;
import com.mosque.crm.repository.MembershipRepository;

@Service
@Transactional(readOnly = true)
public class MembershipListingService {

    private final MembershipRepository membershipRepository;

    public MembershipListingService(MembershipRepository membershipRepository) {
        this.membershipRepository = membershipRepository;
    }

    /**
     * List active memberships with person info.
     */
    public List<MembershipListDTO> listActiveMembers() {
        return membershipRepository.findAllActiveWithPerson()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get member by person ID.
     */
    public MembershipListDTO getMemberByPersonId(String personIdStr) {
        Long personId = Long.parseLong(personIdStr);
        return membershipRepository.findByPersonId(personId)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Member not found with person ID: " + personId));
    }

    private MembershipListDTO toDTO(Membership membership) {
        Person p = membership.getPerson();
        String username = null;
        String role = null;
        boolean needsAccount = false;
        if (p.getUserLink() != null && p.getUserLink().getUser() != null) {
            User user = p.getUserLink().getUser();
            username = user.getUsername();
            // Get first role name if present
            if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                role = user.getRoles().iterator().next().getName();
            }
            needsAccount = true;
        }

        // If the person is deceased, override the status to reflect this
        String status = p.getStatus() == com.mosque.crm.enums.PersonStatus.DECEASED ?
            p.getStatus().name() : mapStatus(membership.getStatus());

        return new MembershipListDTO(
            p.getId() != null ? p.getId().toString() : null,
            p.getFirstName(),
            p.getLastName(),
            p.getEmail(),
            p.getPhone(),
            p.getGender(),
            p.getDateOfBirth(),
            p.getAddress(),
            p.getCity(),
            p.getCountry(),
            p.getPostalCode(),
            status,
            membership.getMembershipType() != null ? membership.getMembershipType().name() : null,
            membership.getStartDate(),
            membership.getEndDate(),
            username,
            role,
            needsAccount,
            p.getDateOfDeath() // Added date of death
        );
    }

    private String mapStatus(MembershipStatus status) {
        if (status == null) {
			return "INACTIVE";
		}
        return status.name();
    }
}
