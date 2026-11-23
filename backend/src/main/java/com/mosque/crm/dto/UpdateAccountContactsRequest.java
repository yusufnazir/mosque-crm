package com.mosque.crm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public class UpdateAccountContactsRequest {
    @Email
    @Size(max = 100)
    private String email;

    @Size(max = 50)
    private String phone;

    public UpdateAccountContactsRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
