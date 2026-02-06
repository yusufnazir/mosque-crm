package com.mosque.crm.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.UserPreferencesDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserPreferences;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.security.JwtUtil;
import com.mosque.crm.service.UserPreferencesService;

@RestController
@RequestMapping("/me/preferences")
public class UserPreferencesController {

    private static final Logger log = LoggerFactory.getLogger(UserPreferencesController.class);

    private final UserPreferencesService preferencesService;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public UserPreferencesController(
            UserPreferencesService preferencesService,
            UserRepository userRepository,
            JwtUtil jwtUtil
    ) {
        this.preferencesService = preferencesService;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    /**
     * GET /api/me/preferences
     * Get current user's preferences
     */
    @GetMapping
    public ResponseEntity<UserPreferencesDTO> getMyPreferences(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7); // Remove "Bearer " prefix
            String username = jwtUtil.extractUsername(token);
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            UserPreferences prefs = preferencesService.getOrCreate(user);
            return ResponseEntity.ok(preferencesService.toDTO(prefs));
        } catch (Exception e) {
            log.error("Error fetching preferences", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * PUT /api/me/preferences/language
     * Update user language preference
     */
    @PutMapping("/language")
    public ResponseEntity<UserPreferencesDTO> updateLanguage(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request
    ) {
        try {
            String language = request.get("language");
            if (language == null || language.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            UserPreferences updated = preferencesService.updateLanguage(user, language);
            return ResponseEntity.ok(preferencesService.toDTO(updated));
        } catch (IllegalArgumentException e) {
            log.error("Invalid language code", e);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error updating language preference", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
