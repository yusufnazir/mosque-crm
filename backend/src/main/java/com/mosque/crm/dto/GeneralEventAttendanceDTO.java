package com.mosque.crm.dto;

import java.time.LocalDateTime;

public class GeneralEventAttendanceDTO {

    private Long id;
    private Long generalEventId;
    private Long sessionId;
    private String sessionName;
    private Long registrationId;
    private Long personId;
    private String personName;
    private String walkInName;
    private String status;
    private LocalDateTime checkedInAt;
    private Long checkedInByUserId;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public GeneralEventAttendanceDTO() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getGeneralEventId() { return generalEventId; }
    public void setGeneralEventId(Long generalEventId) { this.generalEventId = generalEventId; }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public String getSessionName() { return sessionName; }
    public void setSessionName(String sessionName) { this.sessionName = sessionName; }

    public Long getRegistrationId() { return registrationId; }
    public void setRegistrationId(Long registrationId) { this.registrationId = registrationId; }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }

    public String getWalkInName() { return walkInName; }
    public void setWalkInName(String walkInName) { this.walkInName = walkInName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }

    public Long getCheckedInByUserId() { return checkedInByUserId; }
    public void setCheckedInByUserId(Long checkedInByUserId) { this.checkedInByUserId = checkedInByUserId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
