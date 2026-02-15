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
import com.mosque.crm.repository.MosqueRepository;
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
    private final MosqueRepository mosqueRepository;
    private final UserRepository userRepository;

    public CurrentUserController(AuthorizationService authorizationService,
                                  UserPreferencesService userPreferencesService,
                                  MosqueRepository mosqueRepository,
                                  UserRepository userRepository) {
        this.authorizationService = authorizationService;
        this.userPreferencesService = userPreferencesService;
        this.mosqueRepository = mosqueRepository;
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

        CurrentUserDTO dto = new CurrentUserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setMosqueId(user.getMosqueId());
        dto.setSuperAdmin(user.getMosqueId() == null);
        dto.setPersonId(personId);
        dto.setPermissions(new ArrayList<>(permissions));
        dto.setRoles(roleNames);
        dto.setPreferences(preferencesDTO);

        // Resolve mosque name if user is assigned to a mosque
        if (user.getMosqueId() != null) {
            mosqueRepository.findById(user.getMosqueId())
                    .ifPresent(mosque -> dto.setMosqueName(mosque.getName()));
        }

        // Include super admin's persisted mosque selection
        if (dto.isSuperAdmin() && user.getSelectedMosqueId() != null) {
            dto.setSelectedMosqueId(user.getSelectedMosqueId());
            mosqueRepository.findById(user.getSelectedMosqueId())
                    .ifPresent(mosque -> dto.setSelectedMosqueName(mosque.getName()));
        }

        return ResponseEntity.ok(dto);
    }

    /**
     * PUT /api/me/selected-mosque
     * Persists the super admin's mosque selection so it survives across sessions and devices.
     * Body: { "mosqueId": 1 } or { "mosqueId": null } to clear the selection (= "All Mosques").
     */
    @PutMapping("/selected-mosque")
    public ResponseEntity<?> updateSelectedMosque(@RequestBody Map<String, Long> body) {
        User user = authorizationService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        // Only super admins (mosque_id IS NULL) can use this feature
        if (user.getMosqueId() != null) {
            return ResponseEntity.status(403).body("Only super admins can change mosque selection");
        }

        Long mosqueId = body.get("mosqueId");

        // Validate the mosque exists if a non-null value is provided
        if (mosqueId != null) {
            boolean exists = mosqueRepository.existsById(mosqueId);
            if (!exists) {
                return ResponseEntity.status(400).body("Mosque not found");
            }
        }

        user.setSelectedMosqueId(mosqueId);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("selectedMosqueId", mosqueId != null ? mosqueId : "null"));
    }
}
