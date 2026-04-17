package com.mosque.crm.dto;

import java.time.LocalDateTime;

public class GeneralEventVolunteerDTO {

    private Long id;
    private Long generalEventId;
    private Long personId;
    private String personName;
    private String role;
    private String roleDescription;
    private String status;
    private boolean checkedIn;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public GeneralEventVolunteerDTO() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getGeneralEventId() { return generalEventId; }
    public void setGeneralEventId(Long generalEventId) { this.generalEventId = generalEventId; }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getRoleDescription() { return roleDescription; }
    public void setRoleDescription(String roleDescription) { this.roleDescription = roleDescription; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isCheckedIn() { return checkedIn; }
    public void setCheckedIn(boolean checkedIn) { this.checkedIn = checkedIn; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
