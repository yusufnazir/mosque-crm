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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.MembershipTermsVersionCreateDTO;
import com.mosque.crm.dto.MembershipTermsDraftDTO;
import com.mosque.crm.dto.MembershipTermsVersionDTO;
import com.mosque.crm.service.MembershipTermsService;

@RestController
@RequestMapping("/membership-terms")
public class MembershipTermsController {

    private final MembershipTermsService membershipTermsService;

    public MembershipTermsController(MembershipTermsService membershipTermsService) {
        this.membershipTermsService = membershipTermsService;
    }

    @GetMapping
    public ResponseEntity<List<MembershipTermsVersionDTO>> getHistory() {
        return ResponseEntity.ok(membershipTermsService.getHistoryForCurrentTenant());
    }

    @GetMapping("/draft")
    public ResponseEntity<MembershipTermsDraftDTO> getDraft() {
        return ResponseEntity.ok(membershipTermsService.getDraftForCurrentTenant());
    }

    @PutMapping("/draft")
    public ResponseEntity<MembershipTermsDraftDTO> saveDraft(@RequestBody MembershipTermsDraftDTO dto) {
        return ResponseEntity.ok(membershipTermsService.saveDraftForCurrentTenant(dto));
    }

    @GetMapping("/enabled")
    public ResponseEntity<Map<String, Boolean>> isEnabled() {
        Map<String, Boolean> result = new HashMap<>();
        result.put("enabled", membershipTermsService.isTermsEnabledForCurrentTenant());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/enabled")
    public ResponseEntity<Map<String, Boolean>> setEnabled(@RequestBody Map<String, Boolean> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        membershipTermsService.setTermsEnabled(enabled);
        Map<String, Boolean> result = new HashMap<>();
        result.put("enabled", enabled);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrent() {
        return membershipTermsService.getCurrentForCurrentTenant()
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok().body(null));
    }

    @GetMapping("/public/{orgHandle}/current")
    public ResponseEntity<?> getCurrentPublic(@PathVariable String orgHandle) {
        try {
            return membershipTermsService.getCurrentPublic(orgHandle)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping
    public ResponseEntity<?> publish(@RequestBody MembershipTermsVersionCreateDTO dto) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String createdBy = authentication != null ? authentication.getName() : "unknown";
        try {
            return ResponseEntity.ok(membershipTermsService.publishNewVersion(dto, createdBy));
        } catch (IllegalArgumentException | IllegalStateException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}