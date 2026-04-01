package com.mosque.crm.dto;

import java.util.List;

/**
 * DTO for reading a role together with its assigned permission codes.
 */
public class RoleDTO {

    private Long id;
    private String name;
    private String description;
    private List<String> permissionCodes;
    private List<String> assignablePermissionCodes;
    private List<String> assignableRoleNames;
    private boolean template;

    public RoleDTO() {
    }

    public RoleDTO(Long id, String name, String description,
                   List<String> permissionCodes, List<String> assignablePermissionCodes,
                   List<String> assignableRoleNames, boolean template) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.permissionCodes = permissionCodes;
        this.assignablePermissionCodes = assignablePermissionCodes;
        this.assignableRoleNames = assignableRoleNames;
        this.template = template;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getPermissionCodes() {
        return permissionCodes;
    }

    public void setPermissionCodes(List<String> permissionCodes) {
        this.permissionCodes = permissionCodes;
    }

    public List<String> getAssignablePermissionCodes() {
        return assignablePermissionCodes;
    }

    public void setAssignablePermissionCodes(List<String> assignablePermissionCodes) {
        this.assignablePermissionCodes = assignablePermissionCodes;
    }

    public List<String> getAssignableRoleNames() {
        return assignableRoleNames;
    }

    public void setAssignableRoleNames(List<String> assignableRoleNames) {
        this.assignableRoleNames = assignableRoleNames;
    }

    public boolean isTemplate() {
        return template;
    }

    public void setTemplate(boolean template) {
        this.template = template;
    }
}
