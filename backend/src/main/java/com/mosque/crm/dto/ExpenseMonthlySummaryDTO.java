package com.mosque.crm.dto;

import java.math.BigDecimal;

/**
 * Aggregated expense totals grouped by calendar month and currency.
 * Used for dashboard expense charts.
 */
public class ExpenseMonthlySummaryDTO {

    /** Calendar month in "yyyy-MM" format, e.g. "2026-01". */
    private String month;

    /** ISO 4217 currency code, e.g. "SRD" or "USD". */
    private String currencyCode;

    /** Sum of all non-deleted expense amounts for the month and currency. */
    private BigDecimal total;

    public ExpenseMonthlySummaryDTO() {}

    public ExpenseMonthlySummaryDTO(String month, String currencyCode, BigDecimal total) {
        this.month = month;
        this.currencyCode = currencyCode;
        this.total = total;
    }

    /** Constructor used by JPQL FUNCTION() which returns Object for computed string columns. */
    public ExpenseMonthlySummaryDTO(Object month, String currencyCode, BigDecimal total) {
        this.month = month != null ? month.toString() : null;
        this.currencyCode = currencyCode;
        this.total = total;
    }

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }
}
