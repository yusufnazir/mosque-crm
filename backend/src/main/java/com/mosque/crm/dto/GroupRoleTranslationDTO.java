package com.mosque.crm.dto;

/**
 * DTO for GroupRoleTranslation - used both for input and output.
 */
public class GroupRoleTranslationDTO {

    private Long id;
    private String locale;
    private String name;

    public GroupRoleTranslationDTO() {
    }

    public GroupRoleTranslationDTO(String locale, String name) {
        this.locale = locale;
        this.name = name;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
