package com.mosque.crm.dto;

public class RegistrationRequest {
    private String organizationName;
    private String handle;
    private String username;
    private String email;
    private String password;

    public RegistrationRequest() {
    }

    public RegistrationRequest(String organizationName, String handle, String username, String email, String password) {
        this.organizationName = organizationName;
        this.handle = handle;
        this.username = username;
        this.email = email;
        this.password = password;
    }

    public String getOrganizationName() {
        return organizationName;
    }

    public void setOrganizationName(String organizationName) {
        this.organizationName = organizationName;
    }

    public String getHandle() {
        return handle;
    }

    public void setHandle(String handle) {
        this.handle = handle;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
