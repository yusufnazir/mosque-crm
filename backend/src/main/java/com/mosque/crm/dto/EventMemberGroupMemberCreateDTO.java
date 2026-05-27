package com.mosque.crm.dto;

import jakarta.validation.constraints.NotNull;

public class EventMemberGroupMemberCreateDTO {
    @NotNull
    private Long personId;
    @NotNull
    private Long eventRoleId;

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }
    public Long getEventRoleId() { return eventRoleId; }
    public void setEventRoleId(Long eventRoleId) { this.eventRoleId = eventRoleId; }
}
