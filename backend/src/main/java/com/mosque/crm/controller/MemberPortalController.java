package com.mosque.crm.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.service.MembershipFeeService;
import com.mosque.crm.service.MembershipListingService;

@RestController
@RequestMapping("/member")
public class MemberPortalController {

    private static final Logger log = LoggerFactory.getLogger(MemberPortalController.class);


    private final UserRepository userRepository;
    private final MembershipListingService membershipListingService;
    private final MembershipFeeService feeService;

    public MemberPortalController(UserRepository userRepository,
                                  MembershipListingService membershipListingService,
                                  MembershipFeeService feeService) {
        this.userRepository = userRepository;
        this.membershipListingService = membershipListingService;
        this.feeService = feeService;
    }


    @GetMapping("/profile")
    public ResponseEntity<?> getMyProfile() {
        // Get authenticated user from JWT token
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || "anonymousUser".equals(username)) {
            return ResponseEntity.status(401).body(new java.util.HashMap<String, Object>() {{
                put("error", "Not authenticated");
            }});
        }
        log.info("/member/profile called for username: {}", username);
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            log.error("User not found for username: {}", username);
            return ResponseEntity.status(404).body(new java.util.HashMap<String, Object>() {{
                put("error", "User not found");
            }});
        }
        if (user.getPerson() == null) {
            log.error("No member profile linked to user: {}", username);
            return ResponseEntity.status(404).body(new java.util.HashMap<String, Object>() {{
                put("error", "No member profile linked to this user");
            }});
        }
        var person = user.getPerson();
        var membershipOpt = membershipListingService
            .listActiveMembers().stream()
            .filter(m -> m.getPersonId() != null && m.getPersonId().equals(person.getId().toString()))
            .findFirst();
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("personId", person.getId().toString());
        result.put("firstName", capitalize(person.getFirstName()));
        result.put("lastName", capitalize(person.getLastName()));
        result.put("email", emptyToNull(person.getEmail()));
        result.put("phone", emptyToNull(person.getPhone()));
        result.put("gender", emptyToNull(person.getGender()));
        result.put("dateOfBirth", person.getDateOfBirth() != null ? person.getDateOfBirth().toString() : null);
        result.put("dateOfDeath", person.getDateOfDeath() != null ? person.getDateOfDeath().toString() : null);
        result.put("status", person.getStatus() != null ? person.getStatus().name() : "ACTIVE"); // Include person status
        result.put("address", emptyToNull(person.getAddress()));
        result.put("city", emptyToNull(person.getCity()));
        result.put("country", emptyToNull(person.getCountry()));
        result.put("postalCode", emptyToNull(person.getPostalCode()));
        result.put("username", username);
        result.put("role", user.getRoles() != null && !user.getRoles().isEmpty() ? user.getRoles().iterator().next().getName() : null);
        result.put("needsAccount", true);
        // Map membership fields
        if (membershipOpt.isPresent()) {
            var m = membershipOpt.get();
            result.put("membershipType", m.getMembershipType());
            result.put("memberSince", m.getStartDate());
            result.put("membershipStatus", m.getStatus());
            result.put("startDate", m.getStartDate());
            result.put("endDate", m.getEndDate());
        } else {
            result.put("membershipType", null);
            result.put("memberSince", null);
            result.put("membershipStatus", "INACTIVE");
            result.put("startDate", null);
            result.put("endDate", null);
        }
        // Add missing fields for frontend compatibility
        result.put("children", new java.util.ArrayList<>()); // No children for demo
        result.put("partnerName", null); // No partner for demo
        log.info("Returning mapped membership profile for personId: {} (username: {})", person.getId(), username);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/fees")
    public ResponseEntity<?> getMyFees() {
        // Get authenticated user from JWT token
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || "anonymousUser".equals(username)) {
            return ResponseEntity.ok(List.of());
        }
        User user = userRepository.findByUsername(username)
                .orElse(null);
        if (user == null || user.getPerson() == null) {
            return ResponseEntity.ok(List.of()); // Return empty list if no member profile
        }
        // Return empty list for demo; no error
        return ResponseEntity.ok(List.of());
    }

    // Temporary debug endpoint - remove after testing
    @GetMapping("/debug/profile/{username}")
    public ResponseEntity<?> debugProfile(@PathVariable String username) {
        log.info("Debug profile called for username: {}", username);
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }
        if (user.getPerson() == null) {
            return ResponseEntity.status(404).body("No member profile linked");
        }
        var person = user.getPerson();
        var membershipOpt = membershipListingService
            .listActiveMembers().stream()
            .filter(m -> m.getPersonId() != null && m.getPersonId().equals(person.getId().toString()))
            .findFirst();
        if (membershipOpt.isEmpty()) {
            return ResponseEntity.ok(new com.mosque.crm.dto.MembershipListDTO(
                person.getId().toString(),
                person.getFirstName(),
                person.getLastName(),
                person.getEmail(),
                person.getPhone(),
                person.getGender(),
                person.getDateOfBirth(),
                person.getAddress(),
                person.getCity(),
                person.getCountry(),
                person.getPostalCode(),
                person.getStatus() != null ? person.getStatus().name() : "INACTIVE", null, null, null,
                username,
                user.getRoles() != null && !user.getRoles().isEmpty() ? user.getRoles().iterator().next().getName() : null,
                true,
                person.getDateOfDeath() // Added date of death
            ));
        }
        return ResponseEntity.ok(membershipOpt.get());
    }
    // Helper functions for capitalization and null handling
    private static String capitalize(String s) {
        if (s == null || s.isBlank()) {
			return null;
		}
        return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
    }

    private static String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
