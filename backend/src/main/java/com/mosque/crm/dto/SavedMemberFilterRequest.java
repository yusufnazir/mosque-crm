package com.mosque.crm.dto;

/**
 * Request DTO for creating or updating a saved member filter.
 */
public class SavedMemberFilterRequest {

    private String name;
    private String filterJson;

    public SavedMemberFilterRequest() {
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
}
