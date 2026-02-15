package com.mosque.crm.dto;

/**
 * DTO for ContributionTypeTranslation - used both for input and output.
 */
public class ContributionTypeTranslationDTO {

    private Long id;
    private String locale;
    private String name;
    private String description;

    public ContributionTypeTranslationDTO() {
    }

    public ContributionTypeTranslationDTO(String locale, String name, String description) {
        this.locale = locale;
        this.name = name;
        this.description = description;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
