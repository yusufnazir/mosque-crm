package com.mosque.crm.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;

/**
 * Request body for updating the permissions assigned to a role.
 */
public class RolePermissionUpdateRequest {

    @NotNull
    private List<String> permissionCodes;

    public RolePermissionUpdateRequest() {
    }

    public RolePermissionUpdateRequest(List<String> permissionCodes) {
        this.permissionCodes = permissionCodes;
    }

    public List<String> getPermissionCodes() {
        return permissionCodes;
    }

    public void setPermissionCodes(List<String> permissionCodes) {
        this.permissionCodes = permissionCodes;
    }
}
