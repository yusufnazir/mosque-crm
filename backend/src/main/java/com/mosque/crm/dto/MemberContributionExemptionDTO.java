package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for MemberContributionExemption - response object.
 */
public class MemberContributionExemptionDTO {

    private Long id;
    private Long personId;
    private String personName;
    private Long contributionTypeId;
    private String contributionTypeCode;
    private String exemptionType;
    private BigDecimal amount;
    private String reason;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isActive;

    public MemberContributionExemptionDTO() {
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }

    public Long getContributionTypeId() { return contributionTypeId; }
    public void setContributionTypeId(Long contributionTypeId) { this.contributionTypeId = contributionTypeId; }

    public String getContributionTypeCode() { return contributionTypeCode; }
    public void setContributionTypeCode(String contributionTypeCode) { this.contributionTypeCode = contributionTypeCode; }

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
