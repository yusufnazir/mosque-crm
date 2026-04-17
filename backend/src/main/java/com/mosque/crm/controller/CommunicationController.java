package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.CommunicationMessageDTO;
import com.mosque.crm.dto.CommunicationTemplateDTO;
import com.mosque.crm.dto.SendMessageRequest;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.service.CommunicationService;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanFeatureRequired;

@PlanFeatureRequired(FeatureKeys.COMMUNICATION_TOOLS)
@RestController
@RequestMapping("/communications")
public class CommunicationController {

    private static final Logger log = LoggerFactory.getLogger(CommunicationController.class);

    private final CommunicationService communicationService;
    private final UserRepository userRepository;

    public CommunicationController(CommunicationService communicationService, UserRepository userRepository) {
        this.communicationService = communicationService;
        this.userRepository = userRepository;
    }

    // ==================== Messages ====================

    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody SendMessageRequest request) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            CommunicationMessageDTO result = communicationService.sendMessage(request, currentUser.getId());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error sending communication: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/messages")
    public ResponseEntity<Page<CommunicationMessageDTO>> listMessages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(communicationService.listMessages(pageable));
    }

    @GetMapping("/messages/recent")
    public ResponseEntity<List<CommunicationMessageDTO>> recentMessages() {
        return ResponseEntity.ok(communicationService.listRecentMessages(5));
    }

    @GetMapping("/messages/{id}")
    public ResponseEntity<CommunicationMessageDTO> getMessage(@PathVariable Long id) {
        return communicationService.getMessage(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ==================== Templates ====================

    @GetMapping("/templates")
    public ResponseEntity<List<CommunicationTemplateDTO>> listTemplates() {
        return ResponseEntity.ok(communicationService.listTemplates());
    }

    @GetMapping("/templates/{id}")
    public ResponseEntity<CommunicationTemplateDTO> getTemplate(@PathVariable Long id) {
        return communicationService.getTemplate(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/templates")
    public ResponseEntity<?> createTemplate(@RequestBody CommunicationTemplateDTO dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            CommunicationTemplateDTO created = communicationService.createTemplate(dto, currentUser.getId());
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            log.error("Error creating template: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<?> updateTemplate(@PathVariable Long id, @RequestBody CommunicationTemplateDTO dto) {
        try {
            return ResponseEntity.ok(communicationService.updateTemplate(id, dto));
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        communicationService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Helper ====================

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }
}
