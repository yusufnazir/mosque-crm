package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * DTO for creating/updating a ContributionObligation.
 */
public class ContributionObligationCreateDTO {

    @NotNull(message = "Contribution type ID is required")
    private Long contributionTypeId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotBlank(message = "Frequency is required")
    private String frequency;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private Long currencyId;

    public ContributionObligationCreateDTO() {
    }

    // Getters and Setters
    public Long getContributionTypeId() {
        return contributionTypeId;
    }

    public void setContributionTypeId(Long contributionTypeId) {
        this.contributionTypeId = contributionTypeId;
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
}
