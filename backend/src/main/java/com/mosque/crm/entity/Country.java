package com.mosque.crm.entity;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

/**
 * Country - Global reference table of ISO 3166-1 countries.
 *
 * NOT organization-scoped. This is a system-wide reference table.
 */
@Entity
@Table(name = "countries")
public class Country {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    @Column(name = "iso_code", nullable = false, unique = true, length = 2)
    private String isoCode;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @OneToMany(mappedBy = "country", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<CountryTranslation> translations = new ArrayList<>();

    public Country() {
    }

    public Country(Long id, String isoCode, Integer sortOrder) {
        this.id = id;
        this.isoCode = isoCode;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIsoCode() { return isoCode; }
    public void setIsoCode(String isoCode) { this.isoCode = isoCode; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public List<CountryTranslation> getTranslations() { return translations; }
    public void setTranslations(List<CountryTranslation> translations) { this.translations = translations; }
}
