package com.mosque.crm.dto;

import java.time.LocalDate;

/**
 * Represents a node in the genealogy graph.
 * Can be either a PERSON or FAMILY node.
 */
public class GenealogyNodeDTO {
    private String id;
    private String type; // "PERSON" or "FAMILY"
    private String label; // Full name for PERSON, null for FAMILY
    private String gender; // "M" or "F" for PERSON, null for FAMILY
    private LocalDate birthDate; // Birth date for PERSON, null for FAMILY

    public GenealogyNodeDTO() {
    }

    public GenealogyNodeDTO(String id, String type) {
        this.id = id;
        this.type = type;
    }

    public GenealogyNodeDTO(String id, String type, String label, String gender) {
        this.id = id;
        this.type = type;
        this.label = label;
        this.gender = gender;
    }

    public GenealogyNodeDTO(String id, String type, String label, String gender, LocalDate birthDate) {
        this.id = id;
        this.type = type;
        this.label = label;
        this.gender = gender;
        this.birthDate = birthDate;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }
}
