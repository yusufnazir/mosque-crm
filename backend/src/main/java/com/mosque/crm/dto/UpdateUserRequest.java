package com.mosque.crm.dto;

import java.util.List;

import jakarta.validation.constraints.Size;

public class UpdateUserRequest {

    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    private Boolean accountEnabled;

    private Boolean accountLocked;

    private Long mosqueId;

    private List<String> roles;

    @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
    private String password;

    public UpdateUserRequest() {
    }

    // Getters and Setters
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Boolean getAccountEnabled() {
        return accountEnabled;
    }

    public void setAccountEnabled(Boolean accountEnabled) {
        this.accountEnabled = accountEnabled;
    }

    public Boolean getAccountLocked() {
        return accountLocked;
    }

    public void setAccountLocked(Boolean accountLocked) {
        this.accountLocked = accountLocked;
    }

    public Long getMosqueId() {
        return mosqueId;
    }

    public void setMosqueId(Long mosqueId) {
        this.mosqueId = mosqueId;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
