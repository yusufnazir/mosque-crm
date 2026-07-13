package com.mosque.crm.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.demo.DemoDataService;
import com.mosque.crm.demo.DemoDataService.DemoDataStatusDTO;

@RestController
@RequestMapping("/demo-data")
@PreAuthorize("@auth.hasPermission('superadmin.manage')")
public class DemoDataController {

    private final DemoDataService demoDataService;

    public DemoDataController(DemoDataService demoDataService) {
        this.demoDataService = demoDataService;
    }

    @GetMapping("/status")
    public ResponseEntity<DemoDataStatusDTO> status() {
        return ResponseEntity.ok(demoDataService.getStatus());
    }

    @PostMapping("/seed")
    public ResponseEntity<?> seed() {
        try {
            return ResponseEntity.ok(demoDataService.seed());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }
}
