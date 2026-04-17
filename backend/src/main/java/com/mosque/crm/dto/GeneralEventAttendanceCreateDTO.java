package com.mosque.crm.dto;

import java.time.LocalDateTime;

public class GeneralEventAttendanceCreateDTO {

    // For pre-populated rows: link to an existing registration
    private Long registrationId;

    // For walk-ins: no registration
    private Long personId;
    private String walkInName;

    private String status; // AttendanceStatus enum name

    private String notes;

    private LocalDateTime checkedInAt; // optional override; defaults to now() if not provided

    public GeneralEventAttendanceCreateDTO() {
    }

    public Long getRegistrationId() { return registrationId; }
    public void setRegistrationId(Long registrationId) { this.registrationId = registrationId; }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getWalkInName() { return walkInName; }
    public void setWalkInName(String walkInName) { this.walkInName = walkInName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }
}
