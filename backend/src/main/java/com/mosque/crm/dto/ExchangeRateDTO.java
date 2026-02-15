package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for ExchangeRate - response object for per-mosque exchange rates.
 */
public class ExchangeRateDTO {

    private Long id;
    private Long fromCurrencyId;
    private String fromCurrencyCode;
    private String fromCurrencyName;
    private Long toCurrencyId;
    private String toCurrencyCode;
    private String toCurrencyName;
    private BigDecimal rate;
    private LocalDate effectiveDate;
    private LocalDateTime createdAt;

    public ExchangeRateDTO() {
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFromCurrencyId() { return fromCurrencyId; }
    public void setFromCurrencyId(Long fromCurrencyId) { this.fromCurrencyId = fromCurrencyId; }

    public String getFromCurrencyCode() { return fromCurrencyCode; }
    public void setFromCurrencyCode(String fromCurrencyCode) { this.fromCurrencyCode = fromCurrencyCode; }

    public String getFromCurrencyName() { return fromCurrencyName; }
    public void setFromCurrencyName(String fromCurrencyName) { this.fromCurrencyName = fromCurrencyName; }

    public Long getToCurrencyId() { return toCurrencyId; }
    public void setToCurrencyId(Long toCurrencyId) { this.toCurrencyId = toCurrencyId; }

    public String getToCurrencyCode() { return toCurrencyCode; }
    public void setToCurrencyCode(String toCurrencyCode) { this.toCurrencyCode = toCurrencyCode; }

    public String getToCurrencyName() { return toCurrencyName; }
    public void setToCurrencyName(String toCurrencyName) { this.toCurrencyName = toCurrencyName; }

    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }

    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
