package com.mosque.crm.dto;

import jakarta.validation.constraints.NotBlank;

public class EventResourceCreateDTO {
    @NotBlank
    private String name;
    private String description;
    private Boolean assignable;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Boolean getAssignable() { return assignable; }
    public void setAssignable(Boolean assignable) { this.assignable = assignable; }
}
