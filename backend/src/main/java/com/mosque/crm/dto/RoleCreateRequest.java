package com.mosque.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for creating a new role.
 */
public class RoleCreateRequest {

    @NotBlank
    @Size(min = 2, max = 50)
    private String name;

    @Size(max = 255)
    private String description;

    public RoleCreateRequest() {
    }

    public RoleCreateRequest(String name, String description) {
        this.name = name;
        this.description = description;
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
}
