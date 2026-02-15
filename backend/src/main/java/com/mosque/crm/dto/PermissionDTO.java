package com.mosque.crm.dto;

/**
 * DTO for reading a permission entry.
 */
public class PermissionDTO {

    private Long id;
    private String code;
    private String description;
    private String category;

    public PermissionDTO() {
    }

    public PermissionDTO(Long id, String code, String description, String category) {
        this.id = id;
        this.code = code;
        this.description = description;
        this.category = category;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
