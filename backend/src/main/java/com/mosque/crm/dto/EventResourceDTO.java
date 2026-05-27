package com.mosque.crm.dto;

public class EventResourceDTO {
    private Long id;
    private Long resourceTypeId;
    private String name;
    private String description;
    private boolean assignable;
    private String activeAssignmentStatus;
    private Long activeAssignmentId;
    private Long assignedPersonId;
    private String assignedPersonName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getResourceTypeId() { return resourceTypeId; }
    public void setResourceTypeId(Long resourceTypeId) { this.resourceTypeId = resourceTypeId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isAssignable() { return assignable; }
    public void setAssignable(boolean assignable) { this.assignable = assignable; }
    public String getActiveAssignmentStatus() { return activeAssignmentStatus; }
    public void setActiveAssignmentStatus(String activeAssignmentStatus) { this.activeAssignmentStatus = activeAssignmentStatus; }
    public Long getActiveAssignmentId() { return activeAssignmentId; }
    public void setActiveAssignmentId(Long activeAssignmentId) { this.activeAssignmentId = activeAssignmentId; }
    public Long getAssignedPersonId() { return assignedPersonId; }
    public void setAssignedPersonId(Long assignedPersonId) { this.assignedPersonId = assignedPersonId; }
    public String getAssignedPersonName() { return assignedPersonName; }
    public void setAssignedPersonName(String assignedPersonName) { this.assignedPersonName = assignedPersonName; }
}
