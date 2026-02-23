package com.mosque.crm.dto;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.NotNull;

/**
 * DTO for creating/updating member contribution assignments.
 */
public class MemberContributionAssignmentCreateDTO {

    @NotNull(message = "Contribution type ID is required")
    private Long contributionTypeId;

    /**
     * Single person ID — used for individual assignment.
     * Either personId or personIds should be provided (not both).
     */
    private Long personId;

    /**
     * List of person IDs — used for bulk assignment.
     */
    private List<Long> personIds;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate endDate;

    private String notes;

    public MemberContributionAssignmentCreateDTO() {
    }

    // Getters and Setters
    public Long getContributionTypeId() {
        return contributionTypeId;
    }

    public void setContributionTypeId(Long contributionTypeId) {
        this.contributionTypeId = contributionTypeId;
    }

    public Long getPersonId() {
        return personId;
    }

    public void setPersonId(Long personId) {
        this.personId = personId;
    }

    public List<Long> getPersonIds() {
        return personIds;
    }

    public void setPersonIds(List<Long> personIds) {
        this.personIds = personIds;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
