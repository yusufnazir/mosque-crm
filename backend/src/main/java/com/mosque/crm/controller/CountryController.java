package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.CountryDTO;
import com.mosque.crm.service.CountryService;

/**
 * REST controller for global country reference data (localized).
 */
@RestController
@RequestMapping("/countries")
public class CountryController {

    private final CountryService countryService;

    public CountryController(CountryService countryService) {
        this.countryService = countryService;
    }

    @GetMapping
    public ResponseEntity<List<CountryDTO>> getAllCountries(
            @RequestParam(value = "locale", required = false, defaultValue = "en") String locale) {
        return ResponseEntity.ok(countryService.getAllCountries(locale));
    }

    @GetMapping("/{isoCode}")
    public ResponseEntity<CountryDTO> getCountryByIsoCode(
            @PathVariable String isoCode,
            @RequestParam(value = "locale", required = false, defaultValue = "en") String locale) {
        try {
            return ResponseEntity.ok(countryService.getCountryByIsoCode(isoCode.toUpperCase(), locale));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
