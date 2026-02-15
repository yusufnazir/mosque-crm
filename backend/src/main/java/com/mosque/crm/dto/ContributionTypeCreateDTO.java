package com.mosque.crm.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * DTO for creating a new ContributionType.
 */
public class ContributionTypeCreateDTO {

    @NotBlank(message = "Code is required")
    private String code;

    @NotNull(message = "isRequired flag is required")
    private Boolean isRequired;

    private Boolean isActive = true;

    private List<ContributionTypeTranslationDTO> translations;

    public ContributionTypeCreateDTO() {
    }

    // Getters and Setters
    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Boolean getIsRequired() {
        return isRequired;
    }

    public void setIsRequired(Boolean isRequired) {
        this.isRequired = isRequired;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public List<ContributionTypeTranslationDTO> getTranslations() {
        return translations;
    }

    public void setTranslations(List<ContributionTypeTranslationDTO> translations) {
        this.translations = translations;
    }
}
