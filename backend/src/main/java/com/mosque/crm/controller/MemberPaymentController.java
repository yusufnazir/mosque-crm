package com.mosque.crm.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

import com.mosque.crm.dto.MemberPaymentCreateDTO;
import com.mosque.crm.dto.MemberPaymentDTO;
import com.mosque.crm.service.MemberPaymentService;

import jakarta.validation.Valid;

/**
 * REST controller for managing member payments.
 * Base path: /contributions/payments
 *
 * Pagination: pass page (0-based) and size query params.
 * Sorting: pass sort=field,direction (e.g. sort=person.firstName,asc&sort=periodFrom,asc).
 * Year filter: pass year=2026 to filter by period year.
 */
@RestController
@RequestMapping("/contributions/payments")
@CrossOrigin(origins = "*")
public class MemberPaymentController {

    private final MemberPaymentService paymentService;

    public MemberPaymentController(MemberPaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Build a Sort object from the sort[] request param.
     * Each value is "field,direction" (e.g. "person.firstName,asc").
     * Falls back to person.firstName,asc;periodFrom,asc when no sort is given.
     */
    private Sort buildSort(String[] sort) {
        if (sort == null || sort.length == 0) {
            return Sort.by(
                Sort.Order.asc("person.firstName"),
                Sort.Order.asc("periodFrom")
            );
        }
        Sort result = Sort.unsorted();
        for (String s : sort) {
            String[] parts = s.split(",", 2);
            String field = parts[0].trim();
            Sort.Direction dir = (parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim()))
                    ? Sort.Direction.DESC : Sort.Direction.ASC;
            result = result.and(Sort.by(dir, field));
        }
        return result;
    }

    /**
     * Get all payments with optional pagination, sorting, year and person filter.
     *
     * Examples:
     *   GET /contributions/payments                                          → all (no pagination)
     *   GET /contributions/payments?page=0&size=20                           → page 0, 20 per page
     *   GET /contributions/payments?page=0&size=20&year=2026
     *   GET /contributions/payments?page=0&size=20&personId=5
     *   GET /contributions/payments?page=0&size=20&personId=5&year=2026
     *   GET /contributions/payments?page=0&size=20&sort=person.firstName,asc&sort=periodFrom,asc
     */
    @GetMapping
    public ResponseEntity<?> getAllPayments(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Long personId,
            @RequestParam(required = false) String[] sort) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size, buildSort(sort));
            Page<MemberPaymentDTO> payments;
            if (personId != null && year != null) {
                payments = paymentService.getPaymentsByPerson(personId, year, pageable);
            } else if (personId != null) {
                payments = paymentService.getPaymentsByPerson(personId, pageable);
            } else if (year != null) {
                payments = paymentService.getAllPayments(year, pageable);
            } else {
                payments = paymentService.getAllPayments(pageable);
            }
            return ResponseEntity.ok(payments);
        }
        List<MemberPaymentDTO> payments = paymentService.getAllPayments();
        return ResponseEntity.ok(payments);
    }

    /**
     * Get payment by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MemberPaymentDTO> getPaymentById(@PathVariable Long id) {
        try {
            MemberPaymentDTO payment = paymentService.getPaymentById(id);
            return ResponseEntity.ok(payment);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get all payments for a specific person, with optional pagination, sorting, and year filter.
     *
     * When page & size are omitted the full list is returned (used by overlap detection on save).
     */
    @GetMapping("/by-person/{personId}")
    public ResponseEntity<?> getPaymentsByPerson(
            @PathVariable Long personId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String[] sort) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size, buildSort(sort));
            Page<MemberPaymentDTO> payments;
            if (year != null) {
                payments = paymentService.getPaymentsByPerson(personId, year, pageable);
            } else {
                payments = paymentService.getPaymentsByPerson(personId, pageable);
            }
            return ResponseEntity.ok(payments);
        }
        List<MemberPaymentDTO> payments = paymentService.getPaymentsByPerson(personId);
        return ResponseEntity.ok(payments);
    }

    /**
     * Get all payments for a specific contribution type.
     */
    @GetMapping("/by-type/{typeId}")
    public ResponseEntity<List<MemberPaymentDTO>> getPaymentsByType(@PathVariable Long typeId) {
        List<MemberPaymentDTO> payments = paymentService.getPaymentsByType(typeId);
        return ResponseEntity.ok(payments);
    }

    /**
     * Create a new payment.
     */
    @PostMapping
    public ResponseEntity<?> createPayment(@Valid @RequestBody MemberPaymentCreateDTO createDTO) {
        try {
            MemberPaymentDTO payment = paymentService.createPayment(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(payment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update a payment.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePayment(@PathVariable Long id,
                                            @Valid @RequestBody MemberPaymentCreateDTO updateDTO) {
        try {
            MemberPaymentDTO payment = paymentService.updatePayment(id, updateDTO);
            return ResponseEntity.ok(payment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Delete a payment.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        try {
            paymentService.deletePayment(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
