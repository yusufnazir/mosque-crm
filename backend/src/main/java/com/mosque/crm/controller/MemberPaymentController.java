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
     * Get all payments with optional pagination.
     */
    @GetMapping
    public ResponseEntity<?> getAllPayments(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false, defaultValue = "paymentDate") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String direction) {
        if (page != null && size != null) {
            Sort sort = Sort.by(
                    "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC,
                    sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);
            Page<MemberPaymentDTO> payments = paymentService.getAllPayments(pageable);
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
     * Get all payments for a specific person.
     */
    @GetMapping("/by-person/{personId}")
    public ResponseEntity<List<MemberPaymentDTO>> getPaymentsByPerson(@PathVariable Long personId) {
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
