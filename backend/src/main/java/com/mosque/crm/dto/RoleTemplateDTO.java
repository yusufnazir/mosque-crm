package com.mosque.crm.dto;

import java.util.List;

public class RoleTemplateDTO {

    private Long id;
    private String name;
    private String description;
    private boolean active;
    private int sortOrder;
    private List<String> permissionCodes;
    private List<String> assignablePermissionCodes;

    public RoleTemplateDTO() {
    }

    public RoleTemplateDTO(Long id, String name, String description, boolean active, int sortOrder,
                           List<String> permissionCodes, List<String> assignablePermissionCodes) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.active = active;
        this.sortOrder = sortOrder;
        this.permissionCodes = permissionCodes;
        this.assignablePermissionCodes = assignablePermissionCodes;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public List<String> getPermissionCodes() { return permissionCodes; }
    public void setPermissionCodes(List<String> permissionCodes) { this.permissionCodes = permissionCodes; }

    public List<String> getAssignablePermissionCodes() { return assignablePermissionCodes; }
    public void setAssignablePermissionCodes(List<String> assignablePermissionCodes) {
        this.assignablePermissionCodes = assignablePermissionCodes;
    }
}
