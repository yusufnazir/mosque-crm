package com.mosque.crm.controller;

import java.util.List;

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

import com.mosque.crm.dto.OrganizationCurrencyCreateDTO;
import com.mosque.crm.dto.OrganizationCurrencyDTO;
import com.mosque.crm.service.OrganizationCurrencyService;
import com.mosque.crm.subscription.PlanFeatureRequired;

/**
 * REST controller for per-organization currency management.
 * Read endpoints are open; write endpoints require the {@code finance.multi_currency} plan feature.
 */
@RestController
@RequestMapping("/organization-currencies")
public class OrganizationCurrencyController {

    private final OrganizationCurrencyService organizationCurrencyService;

    public OrganizationCurrencyController(OrganizationCurrencyService organizationCurrencyService) {
        this.organizationCurrencyService = organizationCurrencyService;
    }

    @GetMapping
    public ResponseEntity<List<OrganizationCurrencyDTO>> getAllOrganizationCurrencies() {
        return ResponseEntity.ok(organizationCurrencyService.getAllOrganizationCurrencies());
    }

    @GetMapping("/active")
    public ResponseEntity<List<OrganizationCurrencyDTO>> getActiveOrganizationCurrencies() {
        return ResponseEntity.ok(organizationCurrencyService.getActiveOrganizationCurrencies());
    }

    @PostMapping
    @PlanFeatureRequired("finance.multi_currency")
    public ResponseEntity<OrganizationCurrencyDTO> addCurrency(@RequestBody OrganizationCurrencyCreateDTO createDTO) {
        try {
            OrganizationCurrencyDTO created = organizationCurrencyService.addCurrency(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    @PlanFeatureRequired("finance.multi_currency")
    public ResponseEntity<OrganizationCurrencyDTO> updateOrganizationCurrency(@PathVariable Long id,
                                                                    @RequestBody OrganizationCurrencyCreateDTO updateDTO) {
        try {
            return ResponseEntity.ok(organizationCurrencyService.updateOrganizationCurrency(id, updateDTO));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/primary")
    @PlanFeatureRequired("finance.multi_currency")
    public ResponseEntity<OrganizationCurrencyDTO> setPrimaryCurrency(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(organizationCurrencyService.setPrimaryCurrency(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PlanFeatureRequired("finance.multi_currency")
    public ResponseEntity<Void> removeCurrency(@PathVariable Long id) {
        try {
            organizationCurrencyService.removeCurrency(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
