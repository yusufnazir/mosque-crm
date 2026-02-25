package com.mosque.crm.dto.report;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * DTO for the payment summary report.
 * Groups payments by person across contribution types for a selected year.
 */
public class PaymentSummaryReportDTO {

    private int year;
    private List<ContributionTypeColumn> contributionTypes;
    private List<PersonPaymentRow> rows;

    // Pagination metadata
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    public PaymentSummaryReportDTO() {
    }

    public PaymentSummaryReportDTO(int year, List<ContributionTypeColumn> contributionTypes, List<PersonPaymentRow> rows) {
        this.year = year;
        this.contributionTypes = contributionTypes;
        this.rows = rows;
        this.totalElements = rows.size();
        this.totalPages = 1;
        this.page = 0;
        this.size = rows.size();
    }

    public PaymentSummaryReportDTO(int year, List<ContributionTypeColumn> contributionTypes,
                                    List<PersonPaymentRow> rows, int page, int size, long totalElements) {
        this.year = year;
        this.contributionTypes = contributionTypes;
        this.rows = rows;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = size > 0 ? (int) Math.ceil((double) totalElements / size) : 0;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public List<ContributionTypeColumn> getContributionTypes() {
        return contributionTypes;
    }

    public void setContributionTypes(List<ContributionTypeColumn> contributionTypes) {
        this.contributionTypes = contributionTypes;
    }

    public List<PersonPaymentRow> getRows() {
        return rows;
    }

    public void setRows(List<PersonPaymentRow> rows) {
        this.rows = rows;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    /**
     * Represents a contribution type column header.
     */
    public static class ContributionTypeColumn {
        private Long id;
        private String code;
        private String name;

        public ContributionTypeColumn() {
        }

        public ContributionTypeColumn(Long id, String code, String name) {
            this.id = id;
            this.code = code;
            this.name = name;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    /**
     * One row per person showing their total paid per contribution type.
     * Each entry in the amounts map is keyed by contributionTypeId.
     * The value represents the amount with its currency.
     */
    public static class PersonPaymentRow {
        private Long personId;
        private String lastName;
        private String firstName;
        /** Map of contributionTypeId → list of amounts (one per currency) */
        private Map<Long, List<CurrencyAmount>> amounts;
        private List<CurrencyAmount> totals;

        public PersonPaymentRow() {
        }

        public PersonPaymentRow(Long personId, String lastName, String firstName,
                                Map<Long, List<CurrencyAmount>> amounts, List<CurrencyAmount> totals) {
            this.personId = personId;
            this.lastName = lastName;
            this.firstName = firstName;
            this.amounts = amounts;
            this.totals = totals;
        }

        public Long getPersonId() {
            return personId;
        }

        public void setPersonId(Long personId) {
            this.personId = personId;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public Map<Long, List<CurrencyAmount>> getAmounts() {
            return amounts;
        }

        public void setAmounts(Map<Long, List<CurrencyAmount>> amounts) {
            this.amounts = amounts;
        }

        public List<CurrencyAmount> getTotals() {
            return totals;
        }

        public void setTotals(List<CurrencyAmount> totals) {
            this.totals = totals;
        }
    }

    /**
     * An amount in a specific currency.
     */
    public static class CurrencyAmount {
        private String currencyCode;
        private String currencySymbol;
        private BigDecimal amount;

        public CurrencyAmount() {
        }

        public CurrencyAmount(String currencyCode, String currencySymbol, BigDecimal amount) {
            this.currencyCode = currencyCode;
            this.currencySymbol = currencySymbol;
            this.amount = amount;
        }

        public String getCurrencyCode() {
            return currencyCode;
        }

        public void setCurrencyCode(String currencyCode) {
            this.currencyCode = currencyCode;
        }

        public String getCurrencySymbol() {
            return currencySymbol;
        }

        public void setCurrencySymbol(String currencySymbol) {
            this.currencySymbol = currencySymbol;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
    }
}
