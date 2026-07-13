package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.FederationInviteCodeDTO;
import com.mosque.crm.dto.OrganizationDiscoveryDTO;
import com.mosque.crm.dto.OrganizationPartnershipDTO;
import com.mosque.crm.dto.PartnershipOrgHandleRequestDTO;
import com.mosque.crm.dto.UpdateShareSettingDTO;
import com.mosque.crm.service.OrganizationPartnershipService;

@RestController
@RequestMapping("/partnerships")
public class OrganizationPartnershipController {

    private final OrganizationPartnershipService partnershipService;

    public OrganizationPartnershipController(OrganizationPartnershipService partnershipService) {
        this.partnershipService = partnershipService;
    }

    @GetMapping
    public ResponseEntity<List<OrganizationPartnershipDTO>> list() {
        return ResponseEntity.ok(partnershipService.listForCurrentOrganization());
    }

    @GetMapping("/discover")
    public ResponseEntity<List<OrganizationDiscoveryDTO>> discover(@RequestParam String q) {
        return ResponseEntity.ok(partnershipService.discoverOrganizations(q));
    }

    @GetMapping("/invite-code")
    public ResponseEntity<FederationInviteCodeDTO> getInviteCode() {
        return ResponseEntity.ok(partnershipService.getInviteCode());
    }

    @PostMapping("/invite-code/regenerate")
    public ResponseEntity<?> regenerateInviteCode() {
        try {
            return ResponseEntity.ok(partnershipService.regenerateInviteCode());
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).body(errorBody(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(partnershipService.getById(id));
        } catch (IllegalArgumentException e) {
            return notFound(e);
        }
    }

    @PostMapping("/invite")
    public ResponseEntity<?> invite(@RequestBody PartnershipOrgHandleRequestDTO request) {
        return handleMutation(() -> partnershipService.invite(request));
    }

    @PostMapping("/request")
    public ResponseEntity<?> requestToJoin(@RequestBody PartnershipOrgHandleRequestDTO request) {
        return handleMutation(() -> partnershipService.requestToJoin(request));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable Long id) {
        return handleMutation(() -> partnershipService.acceptInvite(id));
    }

    @PostMapping("/{id}/resend-notification")
    public ResponseEntity<?> resendNotification(@PathVariable Long id) {
        return handleMutation(() -> partnershipService.resendNotification(id));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        return handleMutation(() -> partnershipService.approveRequest(id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return handleMutation(() -> partnershipService.reject(id, reason));
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<?> suspend(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return handleMutation(() -> partnershipService.suspend(id, reason));
    }

    @PostMapping("/{id}/reactivate")
    public ResponseEntity<?> reactivate(@PathVariable Long id) {
        return handleMutation(() -> partnershipService.reactivate(id));
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<?> end(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return handleMutation(() -> partnershipService.end(id, reason));
    }

    @GetMapping("/{id}/share-settings")
    public ResponseEntity<?> getShareSettings(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(partnershipService.getShareSettings(id));
        } catch (IllegalArgumentException e) {
            return notFound(e);
        }
    }

    @PutMapping("/{id}/share-settings/{moduleKey}")
    public ResponseEntity<?> updateShareSetting(
            @PathVariable Long id,
            @PathVariable String moduleKey,
            @RequestBody UpdateShareSettingDTO dto) {
        try {
            return ResponseEntity.ok(partnershipService.updateShareSetting(id, moduleKey, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(errorBody(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).body(errorBody(e.getMessage()));
        }
    }

    private ResponseEntity<?> handleMutation(java.util.function.Supplier<OrganizationPartnershipDTO> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(errorBody(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).body(errorBody(e.getMessage()));
        }
    }

    private ResponseEntity<Map<String, String>> notFound(IllegalArgumentException e) {
        return ResponseEntity.status(404).body(errorBody(e.getMessage()));
    }

    private Map<String, String> errorBody(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }
}
