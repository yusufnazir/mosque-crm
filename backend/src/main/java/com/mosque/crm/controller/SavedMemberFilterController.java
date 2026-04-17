package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.SavedMemberFilterDTO;
import com.mosque.crm.dto.SavedMemberFilterRequest;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.service.SavedMemberFilterService;

@RestController
@RequestMapping("/members/filters")
@CrossOrigin(origins = "*")
public class SavedMemberFilterController {

    private static final Logger log = LoggerFactory.getLogger(SavedMemberFilterController.class);

    private final SavedMemberFilterService service;
    private final UserRepository userRepository;

    public SavedMemberFilterController(SavedMemberFilterService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> listFilters() {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        List<SavedMemberFilterDTO> filters = service.listFilters(currentUser.getId());
        return ResponseEntity.ok(filters);
    }

    @PostMapping
    public ResponseEntity<?> createFilter(@RequestBody SavedMemberFilterRequest request) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        Long orgId = resolveOrgId(currentUser);
        try {
            SavedMemberFilterDTO created = service.createFilter(currentUser.getId(), orgId, request);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            log.error("Error creating saved filter: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFilter(@PathVariable Long id, @RequestBody SavedMemberFilterRequest request) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        Long orgId = resolveOrgId(currentUser);
        try {
            SavedMemberFilterDTO updated = service.updateFilter(id, currentUser.getId(), orgId, request);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error updating saved filter {}: {}", id, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFilter(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            service.deleteFilter(id, currentUser.getId());
            return ResponseEntity.noContent().build();
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).build();
        } catch (jakarta.persistence.EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/set-default")
    public ResponseEntity<?> setDefault(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        Long orgId = resolveOrgId(currentUser);
        try {
            SavedMemberFilterDTO updated = service.setDefault(id, currentUser.getId(), orgId);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error setting default filter {}: {}", id, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // ==================== Helper ====================

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }

    private Long resolveOrgId(User user) {
        return user.getSelectedOrganizationId() != null
                ? user.getSelectedOrganizationId()
                : user.getOrganizationId();
    }
}
