package com.mosque.crm.dto;

import jakarta.validation.constraints.NotBlank;

public class NonMemberRecipientUpdateDTO {

    @NotBlank(message = "Name is required")
    private String name;

    private String idNumber;

    private String phoneNumber;

    public NonMemberRecipientUpdateDTO() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIdNumber() {
        return idNumber;
    }

    public void setIdNumber(String idNumber) {
        this.idNumber = idNumber;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
}
