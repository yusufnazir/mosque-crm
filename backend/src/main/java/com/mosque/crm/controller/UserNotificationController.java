package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.UserNotificationDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.service.UserNotificationService;

@RestController
@RequestMapping("/notifications")
public class UserNotificationController {

    private final UserNotificationService userNotificationService;
    private final UserRepository userRepository;

    public UserNotificationController(
            UserNotificationService userNotificationService,
            UserRepository userRepository) {
        this.userNotificationService = userNotificationService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(defaultValue = "20") int limit) {
        User user = currentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        List<UserNotificationDTO> items = userNotificationService.listRecent(user.getId(), limit);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount() {
        User user = currentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        Map<String, Long> body = new HashMap<>();
        body.put("count", userNotificationService.countUnread(user.getId()));
        return ResponseEntity.ok(body);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        User user = currentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            return ResponseEntity.ok(userNotificationService.markRead(user.getId(), id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead() {
        User user = currentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        Map<String, Integer> body = new HashMap<>();
        body.put("updated", userNotificationService.markAllRead(user.getId()));
        return ResponseEntity.ok(body);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }
}
