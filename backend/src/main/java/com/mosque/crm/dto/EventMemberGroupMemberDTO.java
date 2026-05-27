package com.mosque.crm.dto;

public class EventMemberGroupMemberDTO {
    private Long id;
    private Long groupId;
    private Long personId;
    private String personName;
    private Long eventRoleId;
    private String eventRoleName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }
    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }
    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }
    public Long getEventRoleId() { return eventRoleId; }
    public void setEventRoleId(Long eventRoleId) { this.eventRoleId = eventRoleId; }
    public String getEventRoleName() { return eventRoleName; }
    public void setEventRoleName(String eventRoleName) { this.eventRoleName = eventRoleName; }
}
