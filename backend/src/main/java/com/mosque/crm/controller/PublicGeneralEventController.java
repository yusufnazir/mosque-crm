package com.mosque.crm.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.PublicGeneralEventSelfRegisterDTO;
import com.mosque.crm.dto.PublicRegistrationUpdateDTO;
import com.mosque.crm.service.PublicGeneralEventService;

@RestController
@RequestMapping("/general-events/public")
@CrossOrigin(origins = "*")
public class PublicGeneralEventController {

    private final PublicGeneralEventService publicGeneralEventService;

    public PublicGeneralEventController(PublicGeneralEventService publicGeneralEventService) {
        this.publicGeneralEventService = publicGeneralEventService;
    }

    @GetMapping("/{orgHandle}/{eventId}")
    public ResponseEntity<?> getPublicEvent(@PathVariable String orgHandle, @PathVariable Long eventId) {
        try {
            return ResponseEntity.ok(publicGeneralEventService.getPublicEvent(orgHandle, eventId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{orgHandle}/{eventId}/register")
    public ResponseEntity<?> selfRegister(
            @PathVariable String orgHandle,
            @PathVariable Long eventId,
            @RequestBody PublicGeneralEventSelfRegisterDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(publicGeneralEventService.selfRegister(orgHandle, eventId, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========================
    // Manage my registration (per-registration bearer link)
    // ========================

    @GetMapping("/registration/{token}")
    public ResponseEntity<?> getRegistrationManage(@PathVariable String token) {
        try {
            return ResponseEntity.ok(publicGeneralEventService.getRegistrationManage(token));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/registration/{token}")
    public ResponseEntity<?> updateRegistrationManage(
            @PathVariable String token,
            @RequestBody PublicRegistrationUpdateDTO dto) {
        try {
            return ResponseEntity.ok(publicGeneralEventService.updateRegistrationManage(token, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
