package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * DTO for creating/updating a MemberContributionExemption.
 */
public class MemberContributionExemptionCreateDTO {

    @NotNull(message = "Person ID is required")
    private Long personId;

    @NotNull(message = "Contribution type ID is required")
    private Long contributionTypeId;

    @NotBlank(message = "Exemption type is required")
    private String exemptionType;

    private BigDecimal amount;

    private String reason;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate endDate;

    private Boolean isActive;

    public MemberContributionExemptionCreateDTO() {
    }

    // Getters and Setters
    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public Long getContributionTypeId() { return contributionTypeId; }
    public void setContributionTypeId(Long contributionTypeId) { this.contributionTypeId = contributionTypeId; }

    public String getExemptionType() { return exemptionType; }
    public void setExemptionType(String exemptionType) { this.exemptionType = exemptionType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
