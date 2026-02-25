package com.mosque.crm.controller;

import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.report.ContributionTotalReportDTO;
import com.mosque.crm.dto.report.PaymentSummaryReportDTO;
import com.mosque.crm.service.ReportService;

@RestController
@RequestMapping("/reports")
public class ReportController {

    private static final Logger log = LoggerFactory.getLogger(ReportController.class);

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    /**
     * Generate the payment summary report for a given year.
     * Returns persons and their total payments per contribution type, grouped by currency.
     */
    @GetMapping("/payment-summary")
    public ResponseEntity<PaymentSummaryReportDTO> getPaymentSummary(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "en") String locale,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (year <= 0) {
            year = LocalDate.now().getYear();
        }
        // Cap size to prevent abuse; 0 = return all (used by exports) 
        if (size > 200) size = 200;

        log.info("GET /reports/payment-summary?year={}&locale={}&page={}&size={}", year, locale, page, size);
        PaymentSummaryReportDTO report = reportService.generatePaymentSummary(year, locale, page, size);
        return ResponseEntity.ok(report);
    }

    /**
     * Generate the contribution totals report for a given year.
     * Returns total amounts per contribution type per currency.
     */
    @GetMapping("/contribution-totals")
    public ResponseEntity<ContributionTotalReportDTO> getContributionTotals(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "en") String locale) {

        if (year <= 0) {
            year = LocalDate.now().getYear();
        }

        log.info("GET /reports/contribution-totals?year={}&locale={}", year, locale);
        ContributionTotalReportDTO report = reportService.generateContributionTotals(year, locale);
        return ResponseEntity.ok(report);
    }
}
