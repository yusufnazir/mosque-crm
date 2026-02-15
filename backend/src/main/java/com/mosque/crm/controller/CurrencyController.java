package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.CurrencyDTO;
import com.mosque.crm.service.CurrencyService;

/**
 * REST controller for global currency reference data.
 * Available to all authenticated users.
 */
@RestController
@RequestMapping("/currencies")
public class CurrencyController {

    private final CurrencyService currencyService;

    public CurrencyController(CurrencyService currencyService) {
        this.currencyService = currencyService;
    }

    @GetMapping
    public ResponseEntity<List<CurrencyDTO>> getAllCurrencies() {
        return ResponseEntity.ok(currencyService.getAllCurrencies());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CurrencyDTO> getCurrencyById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(currencyService.getCurrencyById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<CurrencyDTO> getCurrencyByCode(@PathVariable String code) {
        try {
            return ResponseEntity.ok(currencyService.getCurrencyByCode(code));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
