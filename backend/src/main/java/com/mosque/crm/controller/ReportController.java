package com.mosque.crm.controller;

import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.i18n.LocaleContextHolder;
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
     * Locale is determined from Accept-Language header (set by LocaleInterceptor).
     */
    @GetMapping("/payment-summary")
    public ResponseEntity<PaymentSummaryReportDTO> getPaymentSummary(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (year <= 0) {
            year = LocalDate.now().getYear();
        }
        // Cap size to prevent abuse; 0 = return all (used by exports) 
        if (size > 200) size = 200;

        // Get locale from LocaleContextHolder (set by LocaleInterceptor from Accept-Language header)
        String locale = LocaleContextHolder.getLocale().getLanguage();
        log.info("GET /reports/payment-summary?year={}&page={}&size={} (locale={})", year, page, size, locale);
        PaymentSummaryReportDTO report = reportService.generatePaymentSummary(year, locale, page, size);
        return ResponseEntity.ok(report);
    }

    /**
     * Locale is determined from Accept-Language header (set by LocaleInterceptor).
     */
    @GetMapping("/contribution-totals")
    public ResponseEntity<ContributionTotalReportDTO> getContributionTotals(
            @RequestParam(defaultValue = "0") int year) {

        if (year <= 0) {
            year = LocalDate.now().getYear();
        }

        // Get locale from LocaleContextHolder (set by LocaleInterceptor from Accept-Language header)
        String locale = LocaleContextHolder.getLocale().getLanguage();
        log.info("GET /reports/contribution-totals?year={} (locale={})", year, locale);
        ContributionTotalReportDTO report = reportService.generateContributionTotals(year, locale);
        return ResponseEntity.ok(report);
    }
}
