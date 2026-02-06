package com.mosque.crm.dto;

public class ConfigurationDTO {
    private String name;
    private String value;

    public ConfigurationDTO() {
    }

    public ConfigurationDTO(String name, String value) {
        this.name = name;
        this.value = value;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
