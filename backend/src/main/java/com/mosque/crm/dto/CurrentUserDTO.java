package com.mosque.crm.dto;

import java.util.List;

/**
 * Response for GET /api/me — provides the frontend with current user context
 * including permission codes for UI visibility decisions.
 * <p>
 * The frontend must NEVER enforce security based on this data.
 * The backend always re-validates permissions on every request.
 */
public class CurrentUserDTO {

    private Long id;
    private String username;
    private String email;
    private Long organizationId;
    private String organizationName;
    private boolean superAdmin;
    private String personId;
    private List<String> permissions;
    private List<String> roles;
    private UserPreferencesDTO preferences;
    private Long selectedOrganizationId;
    private String selectedOrganizationName;
    private boolean mustChangePassword;

    public CurrentUserDTO() {
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Long getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(Long organizationId) {
        this.organizationId = organizationId;
    }

    public String getOrganizationName() {
        return organizationName;
    }

    public void setOrganizationName(String organizationName) {
        this.organizationName = organizationName;
    }

    public boolean isSuperAdmin() {
        return superAdmin;
    }

    public void setSuperAdmin(boolean superAdmin) {
        this.superAdmin = superAdmin;
    }

    public String getPersonId() {
        return personId;
    }

    public void setPersonId(String personId) {
        this.personId = personId;
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public UserPreferencesDTO getPreferences() {
        return preferences;
    }

    public void setPreferences(UserPreferencesDTO preferences) {
        this.preferences = preferences;
    }

    public Long getSelectedOrganizationId() {
        return selectedOrganizationId;
    }

    public void setSelectedOrganizationId(Long selectedOrganizationId) {
        this.selectedOrganizationId = selectedOrganizationId;
    }

    public String getSelectedOrganizationName() {
        return selectedOrganizationName;
    }

    public void setSelectedOrganizationName(String selectedOrganizationName) {
        this.selectedOrganizationName = selectedOrganizationName;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }
}
