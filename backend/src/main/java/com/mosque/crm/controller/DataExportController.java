package com.mosque.crm.controller;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.service.DataExportService;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanFeatureRequired;

/**
 * DataExportController — REST endpoints for downloading organization data as Excel files.
 *
 * The exported format is the canonical round-trip format: export, edit, re-import.
 * All endpoints require the data.export plan entitlement (Pro plan only).
 *
 * Security: no @PreAuthorize — access is managed in SecurityConfig.
 */
@RestController
@RequestMapping("/admin/export")
@CrossOrigin(origins = "*")
@PlanFeatureRequired(FeatureKeys.DATA_EXPORT)
public class DataExportController {

    private static final Logger log = LoggerFactory.getLogger(DataExportController.class);

    private static final String XLSX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final DataExportService dataExportService;

    public DataExportController(DataExportService dataExportService) {
        this.dataExportService = dataExportService;
    }

    /**
     * Full export — all sheets: Members, Memberships, Payments, ContributionTypes.
     * GET /admin/export/full
     */
    @GetMapping("/full")
    public ResponseEntity<byte[]> exportFull() throws IOException {
        log.info("Full data export requested");
        byte[] data = dataExportService.exportFull();
        return fileResponse(data, "full-export.xlsx");
    }

    /**
     * Members export — Members + Memberships sheets.
     * GET /admin/export/members
     */
    @GetMapping("/members")
    public ResponseEntity<byte[]> exportMembers() throws IOException {
        log.info("Members data export requested");
        byte[] data = dataExportService.exportMembers();
        return fileResponse(data, "members-export.xlsx");
    }

    /**
     * Payments export — Payments + ContributionTypes sheets.
     * GET /admin/export/payments
     */
    @GetMapping("/payments")
    public ResponseEntity<byte[]> exportPayments() throws IOException {
        log.info("Payments data export requested");
        byte[] data = dataExportService.exportPayments();
        return fileResponse(data, "payments-export.xlsx");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private ResponseEntity<byte[]> fileResponse(byte[] data, String filename) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(XLSX_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .body(data);
    }
}
