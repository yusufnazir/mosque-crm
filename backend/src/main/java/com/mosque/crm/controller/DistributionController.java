package com.mosque.crm.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.DistributionEventCreateDTO;
import com.mosque.crm.dto.DistributionEventDTO;
import com.mosque.crm.dto.DistributionSummaryDTO;
import com.mosque.crm.dto.MemberRegistrationCreateDTO;
import com.mosque.crm.dto.MemberRegistrationDTO;
import com.mosque.crm.dto.NonMemberRecipientCreateDTO;
import com.mosque.crm.dto.NonMemberRecipientDTO;
import com.mosque.crm.dto.ParcelCategoryCreateDTO;
import com.mosque.crm.dto.ParcelCategoryDTO;
import com.mosque.crm.dto.ParcelDistributionCreateDTO;
import com.mosque.crm.dto.ParcelDistributionDTO;
import com.mosque.crm.service.DistributionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/events")
@CrossOrigin(origins = "*")
public class DistributionController {

    private final DistributionService distributionService;

    public DistributionController(DistributionService distributionService) {
        this.distributionService = distributionService;
    }

    // ========================
    // Distribution Events
    // ========================

    @PostMapping("/events")
    public ResponseEntity<?> createEvent(@Valid @RequestBody DistributionEventCreateDTO dto) {
        try {
            DistributionEventDTO result = distributionService.createEvent(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/events/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable Long id, @Valid @RequestBody DistributionEventCreateDTO dto) {
        try {
            DistributionEventDTO result = distributionService.updateEvent(id, dto);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/events/{id}/status")
    public ResponseEntity<?> updateEventStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            DistributionEventDTO result = distributionService.updateEventStatus(id, status);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<?> getEvent(@PathVariable Long id) {
        try {
            DistributionEventDTO result = distributionService.getEvent(id);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/events")
    public ResponseEntity<List<DistributionEventDTO>> listEvents() {
        return ResponseEntity.ok(distributionService.listEvents());
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        try {
            distributionService.deleteEvent(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/events/{id}/summary")
    public ResponseEntity<?> getEventSummary(@PathVariable Long id) {
        try {
            DistributionSummaryDTO result = distributionService.getEventSummary(id);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ========================
    // Parcel Categories
    // ========================

    @PostMapping("/categories")
    public ResponseEntity<?> createCategory(@Valid @RequestBody ParcelCategoryCreateDTO dto) {
        try {
            ParcelCategoryDTO result = distributionService.createCategory(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @Valid @RequestBody ParcelCategoryCreateDTO dto) {
        try {
            ParcelCategoryDTO result = distributionService.updateCategory(id, dto);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/categories/{id}")
    public ResponseEntity<?> getCategory(@PathVariable Long id) {
        try {
            ParcelCategoryDTO result = distributionService.getCategory(id);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/categories")
    public ResponseEntity<List<ParcelCategoryDTO>> listCategories(@RequestParam Long eventId) {
        return ResponseEntity.ok(distributionService.listCategoriesByEvent(eventId));
    }

    // ========================
    // Non-Member Recipients
    // ========================

    @PostMapping("/non-members")
    public ResponseEntity<?> createNonMember(@Valid @RequestBody NonMemberRecipientCreateDTO dto) {
        try {
            NonMemberRecipientDTO result = distributionService.createNonMember(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/non-members/{id}")
    public ResponseEntity<?> getNonMember(@PathVariable Long id) {
        try {
            NonMemberRecipientDTO result = distributionService.getNonMember(id);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/non-members")
    public ResponseEntity<List<NonMemberRecipientDTO>> listNonMembers(@RequestParam Long eventId) {
        return ResponseEntity.ok(distributionService.listNonMembersByEvent(eventId));
    }

    @GetMapping("/non-members/search")
    public ResponseEntity<?> findNonMemberByNumber(@RequestParam Long eventId, @RequestParam String number) {
        try {
            NonMemberRecipientDTO result = distributionService.findNonMemberByNumber(eventId, number);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ========================
    // Member Registrations
    // ========================

    @PostMapping("/member-registrations")
    public ResponseEntity<?> createMemberRegistration(@Valid @RequestBody MemberRegistrationCreateDTO dto) {
        try {
            MemberRegistrationDTO result = distributionService.createMemberRegistration(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/member-registrations/{id}")
    public ResponseEntity<?> getMemberRegistration(@PathVariable Long id) {
        try {
            MemberRegistrationDTO result = distributionService.getMemberRegistration(id);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/member-registrations")
    public ResponseEntity<List<MemberRegistrationDTO>> listMemberRegistrations(@RequestParam Long eventId) {
        return ResponseEntity.ok(distributionService.listMemberRegistrationsByEvent(eventId));
    }

    // ========================
    // Parcel Distribution
    // ========================

    @PostMapping("/distribute")
    public ResponseEntity<?> distribute(@Valid @RequestBody ParcelDistributionCreateDTO dto) {
        try {
            ParcelDistributionDTO result = distributionService.distribute(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/distributions/{id}")
    public ResponseEntity<?> getDistribution(@PathVariable Long id) {
        try {
            ParcelDistributionDTO result = distributionService.getDistribution(id);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/distributions")
    public ResponseEntity<List<ParcelDistributionDTO>> listDistributions(@RequestParam Long eventId) {
        return ResponseEntity.ok(distributionService.listDistributionsByEvent(eventId));
    }
}
