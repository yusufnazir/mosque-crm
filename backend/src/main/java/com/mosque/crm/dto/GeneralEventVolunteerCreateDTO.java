package com.mosque.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class GeneralEventVolunteerCreateDTO {

    @NotNull
    private Long generalEventId;

    @NotNull
    private Long personId;

    @NotBlank
    private String role;

    private String roleDescription;

    private String status = "INVITED";

    public GeneralEventVolunteerCreateDTO() {
    }

    public Long getGeneralEventId() { return generalEventId; }
    public void setGeneralEventId(Long generalEventId) { this.generalEventId = generalEventId; }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getRoleDescription() { return roleDescription; }
    public void setRoleDescription(String roleDescription) { this.roleDescription = roleDescription; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
