package com.mosque.crm.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import com.mosque.crm.multitenancy.MosqueAware;
import com.mosque.crm.multitenancy.MosqueEntityListener;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

/**
 * ContributionType - Defines a category of financial contribution.
 *
 * Examples: Monthly membership fee, Annual building fund, Zakat collection.
 * Each type can be required or optional, and active or inactive.
 * Translations are stored separately in ContributionTypeTranslation.
 */
@Entity
@Table(name = "contribution_types")
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
public class ContributionType implements MosqueAware {

    @Id
    @TableGenerator(name = "contribution_types_seq", table = "sequences_",
            pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "contribution_types_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "is_required", nullable = false)
    private Boolean isRequired = false;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @OneToMany(mappedBy = "contributionType", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ContributionTypeTranslation> translations = new ArrayList<>();

    @OneToMany(mappedBy = "contributionType", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<ContributionObligation> obligations = new HashSet<>();

    // Multi-tenancy
    @Column(name = "mosque_id")
    private Long mosqueId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    // Constructors
    public ContributionType() {
    }

    public ContributionType(String code, Boolean isRequired) {
        this.code = code;
        this.isRequired = isRequired;
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

    public List<ContributionTypeTranslation> getTranslations() {
        return translations;
    }

    public void setTranslations(List<ContributionTypeTranslation> translations) {
        this.translations = translations;
    }

    public Set<ContributionObligation> getObligations() {
        return obligations;
    }

    public void setObligations(Set<ContributionObligation> obligations) {
        this.obligations = obligations;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public Long getMosqueId() {
        return mosqueId;
    }

    @Override
    public void setMosqueId(Long mosqueId) {
        this.mosqueId = mosqueId;
    }

    // Helper methods
    public void addTranslation(ContributionTypeTranslation translation) {
        translations.add(translation);
        translation.setContributionType(this);
    }

    public void removeTranslation(ContributionTypeTranslation translation) {
        translations.remove(translation);
        translation.setContributionType(null);
    }

    /**
     * Get the translation for a given locale, falling back to "en" if not found.
     */
    public ContributionTypeTranslation getTranslation(String locale) {
        return translations.stream()
                .filter(t -> t.getLocale().equals(locale))
                .findFirst()
                .orElseGet(() -> translations.stream()
                        .filter(t -> t.getLocale().equals("en"))
                        .findFirst()
                        .orElse(null));
    }
}
