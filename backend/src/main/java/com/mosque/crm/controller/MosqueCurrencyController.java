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

import com.mosque.crm.dto.MosqueCurrencyCreateDTO;
import com.mosque.crm.dto.MosqueCurrencyDTO;
import com.mosque.crm.service.MosqueCurrencyService;

/**
 * REST controller for per-mosque currency management.
 */
@RestController
@RequestMapping("/mosque-currencies")
public class MosqueCurrencyController {

    private final MosqueCurrencyService mosqueCurrencyService;

    public MosqueCurrencyController(MosqueCurrencyService mosqueCurrencyService) {
        this.mosqueCurrencyService = mosqueCurrencyService;
    }

    @GetMapping
    public ResponseEntity<List<MosqueCurrencyDTO>> getAllMosqueCurrencies() {
        return ResponseEntity.ok(mosqueCurrencyService.getAllMosqueCurrencies());
    }

    @GetMapping("/active")
    public ResponseEntity<List<MosqueCurrencyDTO>> getActiveMosqueCurrencies() {
        return ResponseEntity.ok(mosqueCurrencyService.getActiveMosqueCurrencies());
    }

    @PostMapping
    public ResponseEntity<MosqueCurrencyDTO> addCurrency(@RequestBody MosqueCurrencyCreateDTO createDTO) {
        try {
            MosqueCurrencyDTO created = mosqueCurrencyService.addCurrency(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<MosqueCurrencyDTO> updateMosqueCurrency(@PathVariable Long id,
                                                                    @RequestBody MosqueCurrencyCreateDTO updateDTO) {
        try {
            return ResponseEntity.ok(mosqueCurrencyService.updateMosqueCurrency(id, updateDTO));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/primary")
    public ResponseEntity<MosqueCurrencyDTO> setPrimaryCurrency(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(mosqueCurrencyService.setPrimaryCurrency(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeCurrency(@PathVariable Long id) {
        try {
            mosqueCurrencyService.removeCurrency(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
