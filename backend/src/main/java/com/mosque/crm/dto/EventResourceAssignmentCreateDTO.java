package com.mosque.crm.dto;

import jakarta.validation.constraints.NotNull;

public class EventResourceAssignmentCreateDTO {
    @NotNull
    private Long personId;
    private String notes;

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
