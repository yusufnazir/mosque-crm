package com.mosque.crm.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.MembershipFeeDTO;
import com.mosque.crm.dto.MonthlyFeeStatsDTO;
import com.mosque.crm.service.MembershipFeeService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/admin/fees")
public class MembershipFeeController {

    @Autowired
    private MembershipFeeService feeService;

    @GetMapping
    public ResponseEntity<List<MembershipFeeDTO>> getAllFees() {
        return ResponseEntity.ok(feeService.getAllFees());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MembershipFeeDTO> getFeeById(@PathVariable Long id) {
        return ResponseEntity.ok(feeService.getFeeById(id));
    }

    @GetMapping("/member/{personId}")
    public ResponseEntity<List<MembershipFeeDTO>> getFeesByMember(@PathVariable String personId) {
        return ResponseEntity.ok(feeService.getFeesByPersonId(personId));
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<MembershipFeeDTO>> getOverdueFees() {
        return ResponseEntity.ok(feeService.getOverdueFees());
    }

    @PostMapping
    public ResponseEntity<MembershipFeeDTO> createFee(@Valid @RequestBody MembershipFeeDTO feeDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(feeService.createFee(feeDTO));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MembershipFeeDTO> updateFee(
            @PathVariable Long id,
            @Valid @RequestBody MembershipFeeDTO feeDTO) {
        return ResponseEntity.ok(feeService.updateFee(id, feeDTO));
    }

    /**
     * Returns monthly expected and realized fee income for the current year.
     */
    @GetMapping("/monthly-stats")
    public ResponseEntity<List<MonthlyFeeStatsDTO>> getMonthlyFeeStats() {
        return ResponseEntity.ok(feeService.getMonthlyFeeStatsForCurrentYear());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFee(@PathVariable Long id) {
        feeService.deleteFee(id);
        return ResponseEntity.noContent().build();
    }
}
