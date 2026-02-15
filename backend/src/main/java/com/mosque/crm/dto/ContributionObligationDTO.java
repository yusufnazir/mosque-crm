package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for ContributionObligation - response object.
 */
public class ContributionObligationDTO {

    private Long id;
    private Long contributionTypeId;
    private String contributionTypeCode;
    private BigDecimal amount;
    private String frequency;
    private LocalDate startDate;
    private Long currencyId;
    private String currencyCode;
    private String currencySymbol;

    public ContributionObligationDTO() {
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getFrequency() {
        return frequency;
    }

    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public Long getCurrencyId() {
        return currencyId;
    }

    public void setCurrencyId(Long currencyId) {
        this.currencyId = currencyId;
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
}
