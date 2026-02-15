package com.mosque.crm.dto;

/**
 * DTO for creating/updating a mosque currency assignment.
 */
public class MosqueCurrencyCreateDTO {

    private Long currencyId;
    private Boolean isPrimary;
    private Boolean isActive;

    public MosqueCurrencyCreateDTO() {
    }

    // Getters and Setters
    public Long getCurrencyId() { return currencyId; }
    public void setCurrencyId(Long currencyId) { this.currencyId = currencyId; }

    public Boolean getIsPrimary() { return isPrimary; }
    public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
