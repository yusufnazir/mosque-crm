package com.mosque.crm.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.CurrentUserDTO;
import com.mosque.crm.dto.UserPreferencesDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserPreferences;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.UserPreferencesService;

/**
 * Provides the current authenticated user's context including
 * permissions for frontend UI visibility.
 * <p>
 * This is for UI behavior ONLY — the backend always re-validates.
 */
@RestController
@RequestMapping("/me")
public class CurrentUserController {

    private final AuthorizationService authorizationService;
    private final UserPreferencesService userPreferencesService;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    public CurrentUserController(AuthorizationService authorizationService,
                                  UserPreferencesService userPreferencesService,
                                  OrganizationRepository organizationRepository,
                                  UserRepository userRepository) {
        this.authorizationService = authorizationService;
        this.userPreferencesService = userPreferencesService;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<CurrentUserDTO> getCurrentUser() {
        User user = authorizationService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Set<String> permissions = authorizationService.getPermissionsForCurrentUser();

        List<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName())
                .collect(Collectors.toList());

        String personId = user.getPerson() != null
                ? user.getPerson().getId().toString()
                : null;

        UserPreferences prefs = userPreferencesService.getOrCreate(user);
        UserPreferencesDTO preferencesDTO = userPreferencesService.toDTO(prefs);

        boolean isSuperAdmin = user.getRoles().stream()
                .anyMatch(r -> "SUPER_ADMIN".equals(r.getName()));

        // Super admins get null organizationId so the frontend knows
        // not to apply tenant scoping (mirrors the JWT behavior).
        Long effectiveOrganizationId = isSuperAdmin ? null : user.getOrganizationId();

        CurrentUserDTO dto = new CurrentUserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setOrganizationId(effectiveOrganizationId);
        dto.setSuperAdmin(isSuperAdmin);
        dto.setPersonId(personId);
        dto.setPermissions(new ArrayList<>(permissions));
        dto.setRoles(roleNames);
        dto.setPreferences(preferencesDTO);
        dto.setMustChangePassword(user.isMustChangePassword());

        // Resolve organization name if user is assigned to a organization
        if (effectiveOrganizationId != null) {
            organizationRepository.findById(effectiveOrganizationId)
                    .ifPresent(organization -> dto.setOrganizationName(organization.getName()));
        }

        // Include super admin's persisted organization selection
        if (dto.isSuperAdmin() && user.getSelectedOrganizationId() != null) {
            dto.setSelectedOrganizationId(user.getSelectedOrganizationId());
            organizationRepository.findById(user.getSelectedOrganizationId())
                    .ifPresent(organization -> dto.setSelectedOrganizationName(organization.getName()));
        }

        return ResponseEntity.ok(dto);
    }

    /**
     * PUT /api/me/selected-organization
     * Persists the super admin's organization selection so it survives across sessions and devices.
     * Body: { "organizationId": 1 } or { "organizationId": null } to clear the selection (= "All Organizations").
     */
    @PutMapping("/selected-organization")
    public ResponseEntity<?> updateSelectedOrganization(@RequestBody Map<String, Long> body) {
        User user = authorizationService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        // Only super admins can use this feature
        boolean isSuperAdmin = user.getRoles().stream()
                .anyMatch(r -> "SUPER_ADMIN".equals(r.getName()));
        if (!isSuperAdmin) {
            return ResponseEntity.status(403).body("Only super admins can change organization selection");
        }

        Long organizationId = body.get("organizationId");

        // Validate the organization exists if a non-null value is provided
        if (organizationId != null) {
            boolean exists = organizationRepository.existsById(organizationId);
            if (!exists) {
                return ResponseEntity.status(400).body("Organization not found");
            }
        }

        user.setSelectedOrganizationId(organizationId);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("selectedOrganizationId", organizationId != null ? organizationId : "null"));
    }
}
