package com.mosque.crm.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO for ContributionType - response object with translations and obligation.
 */
public class ContributionTypeDTO {

    private Long id;
    private String code;
    private Boolean isRequired;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private List<ContributionTypeTranslationDTO> translations;
    private List<ContributionObligationDTO> obligations = new ArrayList<>();

    public ContributionTypeDTO() {
    }

    // Getters and Setters
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<ContributionTypeTranslationDTO> getTranslations() {
        return translations;
    }

    public void setTranslations(List<ContributionTypeTranslationDTO> translations) {
        this.translations = translations;
    }

    public List<ContributionObligationDTO> getObligations() {
        return obligations;
    }

    public void setObligations(List<ContributionObligationDTO> obligations) {
        this.obligations = obligations;
    }
}
