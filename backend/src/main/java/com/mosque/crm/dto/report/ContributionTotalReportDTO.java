package com.mosque.crm.dto.report;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for the contribution totals report.
 * Shows total amounts per contribution type per currency for a given year.
 */
public class ContributionTotalReportDTO {

    private int year;
    private List<String> currencies;
    private List<ContributionTotalRow> rows;
    private List<CurrencyTotal> grandTotals;

    public ContributionTotalReportDTO() {
    }

    public ContributionTotalReportDTO(int year, List<String> currencies,
                                       List<ContributionTotalRow> rows, List<CurrencyTotal> grandTotals) {
        this.year = year;
        this.currencies = currencies;
        this.rows = rows;
        this.grandTotals = grandTotals;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public List<String> getCurrencies() {
        return currencies;
    }

    public void setCurrencies(List<String> currencies) {
        this.currencies = currencies;
    }

    public List<ContributionTotalRow> getRows() {
        return rows;
    }

    public void setRows(List<ContributionTotalRow> rows) {
        this.rows = rows;
    }

    public List<CurrencyTotal> getGrandTotals() {
        return grandTotals;
    }

    public void setGrandTotals(List<CurrencyTotal> grandTotals) {
        this.grandTotals = grandTotals;
    }

    /**
     * One row per contribution type with totals per currency.
     */
    public static class ContributionTotalRow {
        private Long contributionTypeId;
        private String contributionTypeCode;
        private String contributionTypeName;
        private List<CurrencyTotal> totals;

        public ContributionTotalRow() {
        }

        public ContributionTotalRow(Long contributionTypeId, String contributionTypeCode,
                                     String contributionTypeName, List<CurrencyTotal> totals) {
            this.contributionTypeId = contributionTypeId;
            this.contributionTypeCode = contributionTypeCode;
            this.contributionTypeName = contributionTypeName;
            this.totals = totals;
        }

        public Long getContributionTypeId() {
            return contributionTypeId;
        }

        public void setContributionTypeId(Long contributionTypeId) {
            this.contributionTypeId = contributionTypeId;
        }

        public String getContributionTypeCode() {
            return contributionTypeCode;
        }

        public void setContributionTypeCode(String contributionTypeCode) {
            this.contributionTypeCode = contributionTypeCode;
        }

        public String getContributionTypeName() {
            return contributionTypeName;
        }

        public void setContributionTypeName(String contributionTypeName) {
            this.contributionTypeName = contributionTypeName;
        }

        public List<CurrencyTotal> getTotals() {
            return totals;
        }

        public void setTotals(List<CurrencyTotal> totals) {
            this.totals = totals;
        }
    }

    /**
     * Amount total for a specific currency.
     */
    public static class CurrencyTotal {
        private String currencyCode;
        private BigDecimal amount;

        public CurrencyTotal() {
        }

        public CurrencyTotal(String currencyCode, BigDecimal amount) {
            this.currencyCode = currencyCode;
            this.amount = amount;
        }

        public String getCurrencyCode() {
            return currencyCode;
        }

        public void setCurrencyCode(String currencyCode) {
            this.currencyCode = currencyCode;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
    }
}
