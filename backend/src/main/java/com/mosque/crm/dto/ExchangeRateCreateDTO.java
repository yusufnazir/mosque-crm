package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for creating/updating an exchange rate.
 */
public class ExchangeRateCreateDTO {

    private Long fromCurrencyId;
    private Long toCurrencyId;
    private BigDecimal rate;
    private LocalDate effectiveDate;

    public ExchangeRateCreateDTO() {
    }

    // Getters and Setters
    public Long getFromCurrencyId() { return fromCurrencyId; }
    public void setFromCurrencyId(Long fromCurrencyId) { this.fromCurrencyId = fromCurrencyId; }

    public Long getToCurrencyId() { return toCurrencyId; }
    public void setToCurrencyId(Long toCurrencyId) { this.toCurrencyId = toCurrencyId; }

    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }

    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
}
