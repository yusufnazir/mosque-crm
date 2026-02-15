package com.mosque.crm.dto;

import java.time.LocalDateTime;

/**
 * DTO for MosqueCurrency - response object for per-mosque active currencies.
 */
public class MosqueCurrencyDTO {

    private Long id;
    private Long currencyId;
    private String currencyCode;
    private String currencyName;
    private String currencySymbol;
    private Integer decimalPlaces;
    private Boolean isPrimary;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public MosqueCurrencyDTO() {
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCurrencyId() { return currencyId; }
    public void setCurrencyId(Long currencyId) { this.currencyId = currencyId; }

    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }

    public String getCurrencyName() { return currencyName; }
    public void setCurrencyName(String currencyName) { this.currencyName = currencyName; }

    public String getCurrencySymbol() { return currencySymbol; }
    public void setCurrencySymbol(String currencySymbol) { this.currencySymbol = currencySymbol; }

    public Integer getDecimalPlaces() { return decimalPlaces; }
    public void setDecimalPlaces(Integer decimalPlaces) { this.decimalPlaces = decimalPlaces; }

    public Boolean getIsPrimary() { return isPrimary; }
    public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
