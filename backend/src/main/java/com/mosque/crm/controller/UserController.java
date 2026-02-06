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
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.security.JwtUtil;
import com.mosque.crm.service.UserMemberLinkService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final UserMemberLinkService userMemberLinkService;

    public UserController(UserRepository userRepository, JwtUtil jwtUtil, UserMemberLinkService userMemberLinkService) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.userMemberLinkService = userMemberLinkService;
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
        response.put("role", user.getRoles().isEmpty() ? "MEMBER" : user.getRoles().iterator().next().getName());
        // TODO: Add memberId when user-member linking is available

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/email")
    public ResponseEntity<?> updateEmail(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        String username = jwtUtil.extractUsername(token);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newEmail = payload.get("email");
        if (newEmail == null || newEmail.trim().isEmpty()) {
            return ResponseEntity.status(400).body("Email is required");
        }

        user.setEmail(newEmail.trim());
        userRepository.save(user);

        // Ensure user-member link exists after update (if user has a person)
        if (user.getPerson() != null) {
            userMemberLinkService.ensureUserMemberLink(user.getId(), user.getPerson().getId());
        }

        Map<String, String> response = new HashMap<>();
        response.put("message", "Email updated successfully");
        return ResponseEntity.ok(response);
    }

    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
