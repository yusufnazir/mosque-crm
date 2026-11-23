package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.entity.User;
import com.mosque.crm.dto.UpdateAccountContactsRequest;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.security.JwtUtil;
import com.mosque.crm.service.UserMemberLinkService;
import com.mosque.crm.service.UserContactService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final UserMemberLinkService userMemberLinkService;
    private final UserContactService userContacts;

    public UserController(UserRepository userRepository, JwtUtil jwtUtil, UserMemberLinkService userMemberLinkService,
            UserContactService userContacts) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.userMemberLinkService = userMemberLinkService;
        this.userContacts = userContacts;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        String username = jwtUtil.extractUsername(token);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("role", user.getRoles().isEmpty() ? "MEMBER" : user.getRoles().iterator().next().getName());
        // TODO: Add memberId when user-member linking is available

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/email")
    public ResponseEntity<?> updateEmail(@Valid @RequestBody UpdateAccountContactsRequest payload,
            HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        String username = jwtUtil.extractUsername(token);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newEmail = payload.getEmail();
        if (newEmail == null || newEmail.trim().isEmpty()) {
            return ResponseEntity.status(400).body("Email is required");
        }

        try {
            userContacts.updateContacts(user, newEmail, user.getPhone());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        // Ensure user-member link exists after update (if user has a person)
        if (user.getPerson() != null) {
            userMemberLinkService.ensureUserMemberLink(user.getId(), user.getPerson().getId());
        }

        Map<String, String> response = new HashMap<>();
        response.put("message", "Email updated successfully");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/contacts")
    public ResponseEntity<?> updateContacts(@Valid @RequestBody UpdateAccountContactsRequest payload,
            HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        User user = userRepository.findByUsername(jwtUtil.extractUsername(token))
                .orElseThrow(() -> new RuntimeException("User not found"));
        try {
            userContacts.updateContacts(user, payload.getEmail(), payload.getPhone());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
        return ResponseEntity.ok(Map.of("message", "Account contacts updated successfully"));
    }

    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
