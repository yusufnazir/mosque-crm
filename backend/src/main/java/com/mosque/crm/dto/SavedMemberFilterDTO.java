package com.mosque.crm.dto;

import java.time.LocalDateTime;

/**
 * DTO for returning a saved member filter to the frontend.
 */
public class SavedMemberFilterDTO {

    private Long id;
    private String name;
    private String filterJson;
    private boolean isDefault;
    private LocalDateTime createdAt;

    public SavedMemberFilterDTO() {
    }

    public SavedMemberFilterDTO(Long id, String name, String filterJson, boolean isDefault, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.filterJson = filterJson;
        this.isDefault = isDefault;
        this.createdAt = createdAt;
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

    public String getFilterJson() {
        return filterJson;
    }

    public void setFilterJson(String filterJson) {
        this.filterJson = filterJson;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public void setDefault(boolean isDefault) {
        this.isDefault = isDefault;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
