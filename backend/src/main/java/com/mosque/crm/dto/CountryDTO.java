package com.mosque.crm.dto;

/**
 * DTO for Country response data.
 */
public class CountryDTO {

    private Long id;
    private String isoCode;
    private String name;

    public CountryDTO() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIsoCode() { return isoCode; }
    public void setIsoCode(String isoCode) { this.isoCode = isoCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
