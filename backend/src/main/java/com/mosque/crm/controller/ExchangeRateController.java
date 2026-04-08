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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.ExchangeRateCreateDTO;
import com.mosque.crm.dto.ExchangeRateDTO;
import com.mosque.crm.service.ExchangeRateService;
import com.mosque.crm.subscription.PlanFeatureRequired;

/**
 * REST controller for per-organization exchange rate management.
 * Read endpoints are open; write endpoints require the {@code finance.multi_currency} plan feature.
 */
@RestController
@RequestMapping("/exchange-rates")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    public ExchangeRateController(ExchangeRateService exchangeRateService) {
        this.exchangeRateService = exchangeRateService;
    }

    @GetMapping
    public ResponseEntity<List<ExchangeRateDTO>> getAllExchangeRates() {
        return ResponseEntity.ok(exchangeRateService.getAllExchangeRates());
    }

    @GetMapping("/pair")
    public ResponseEntity<List<ExchangeRateDTO>> getRatesByCurrencyPair(
            @RequestParam Long fromCurrencyId,
            @RequestParam Long toCurrencyId) {
        return ResponseEntity.ok(exchangeRateService.getRatesByCurrencyPair(fromCurrencyId, toCurrencyId));
    }

    @PostMapping
    @PlanFeatureRequired("finance.multi_currency")
    public ResponseEntity<ExchangeRateDTO> createExchangeRate(@RequestBody ExchangeRateCreateDTO createDTO) {
        try {
            ExchangeRateDTO created = exchangeRateService.createExchangeRate(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    @PlanFeatureRequired("finance.multi_currency")
    public ResponseEntity<ExchangeRateDTO> updateExchangeRate(@PathVariable Long id,
                                                               @RequestBody ExchangeRateCreateDTO updateDTO) {
        try {
            return ResponseEntity.ok(exchangeRateService.updateExchangeRate(id, updateDTO));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PlanFeatureRequired("finance.multi_currency")
    public ResponseEntity<Void> deleteExchangeRate(@PathVariable Long id) {
        try {
            exchangeRateService.deleteExchangeRate(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
