package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.JoinRequestCreateDTO;
import com.mosque.crm.dto.JoinRequestDTO;
import com.mosque.crm.dto.JoinRequestReviewDTO;
import com.mosque.crm.service.JoinRequestService;

@RestController
@RequestMapping("/join-requests")
public class JoinRequestController {

    private static final Logger log = LoggerFactory.getLogger(JoinRequestController.class);

    private final JoinRequestService joinRequestService;

    public JoinRequestController(JoinRequestService joinRequestService) {
        this.joinRequestService = joinRequestService;
    }

    /**
     * Public endpoint — submit a membership application.
     */
    @PostMapping("/apply")
    public ResponseEntity<?> apply(@RequestBody JoinRequestCreateDTO dto) {
        try {
            JoinRequestDTO result = joinRequestService.apply(dto);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(409).body(error);
        }
    }

    /**
     * Public endpoint — validate an approval token before showing the set-password form.
     */
    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestParam String token) {
        try {
            JoinRequestDTO dto = joinRequestService.validateToken(token);
            Map<String, Object> result = new HashMap<>();
            result.put("firstName", dto.getFirstName());
            result.put("lastName", dto.getLastName());
            result.put("email", dto.getEmail());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException | IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(400).body(error);
        }
    }

    /**
     * Public endpoint — complete registration by setting a password.
     */
    @PostMapping("/complete-registration")
    public ResponseEntity<?> completeRegistration(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String password = body.get("password");
        if (token == null || password == null) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "token and password are required");
            return ResponseEntity.badRequest().body(error);
        }
        try {
            String orgHandle = joinRequestService.completeRegistration(token, password);
            Map<String, String> result = new HashMap<>();
            result.put("orgHandle", orgHandle);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException | IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Admin — send a membership invitation email to a prospective member.
     */
    @PostMapping("/invite")
    public ResponseEntity<?> invite(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String locale = body.getOrDefault("locale", "en");
        if (email == null || email.isBlank()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "email is required");
            return ResponseEntity.badRequest().body(error);
        }
        try {
            joinRequestService.sendInvite(email, locale);
            Map<String, String> result = new HashMap<>();
            result.put("message", "Invitation sent to " + email);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException | IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Admin — list all join requests (filtered by tenant context).
     */
    @GetMapping
    public ResponseEntity<List<JoinRequestDTO>> getAll(@RequestParam(required = false) String status) {
        List<JoinRequestDTO> result = status != null
                ? joinRequestService.getByStatus(status)
                : joinRequestService.getAll();
        return ResponseEntity.ok(result);
    }

    /**
     * Admin — get the count of pending join requests.
     */
    @GetMapping("/pending-count")
    public ResponseEntity<Map<String, Long>> getPendingCount() {
        long count = joinRequestService.getPendingCount();
        Map<String, Long> result = new HashMap<>();
        result.put("count", count);
        return ResponseEntity.ok(result);
    }

    /**
     * Admin — get a single join request by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(joinRequestService.getById(id));
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Admin — approve or reject a join request.
     */
    @PutMapping("/{id}/review")
    public ResponseEntity<?> review(@PathVariable Long id, @RequestBody JoinRequestReviewDTO dto) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String reviewedBy = authentication != null ? authentication.getName() : "unknown";

        try {
            JoinRequestDTO result;
            if ("approve".equalsIgnoreCase(dto.getAction())) {
                result = joinRequestService.approve(id, reviewedBy);
            } else if ("reject".equalsIgnoreCase(dto.getAction())) {
                result = joinRequestService.reject(id, dto.getRejectionReason(), reviewedBy);
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "action must be 'approve' or 'reject'");
                return ResponseEntity.badRequest().body(error);
            }
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(409).body(error);
        }
    }

    /**
     * Admin — delete a join request record.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            joinRequestService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(404).body(error);
        } catch (IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(409).body(error);
        }
    }
}
