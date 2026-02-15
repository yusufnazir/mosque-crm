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
    private Long mosqueId;
    private String mosqueName;
    private boolean superAdmin;
    private String personId;
    private List<String> permissions;
    private List<String> roles;
    private UserPreferencesDTO preferences;
    private Long selectedMosqueId;
    private String selectedMosqueName;

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

    public Long getMosqueId() {
        return mosqueId;
    }

    public void setMosqueId(Long mosqueId) {
        this.mosqueId = mosqueId;
    }

    public String getMosqueName() {
        return mosqueName;
    }

    public void setMosqueName(String mosqueName) {
        this.mosqueName = mosqueName;
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

    public Long getSelectedMosqueId() {
        return selectedMosqueId;
    }

    public void setSelectedMosqueId(Long selectedMosqueId) {
        this.selectedMosqueId = selectedMosqueId;
    }

    public String getSelectedMosqueName() {
        return selectedMosqueName;
    }

    public void setSelectedMosqueName(String selectedMosqueName) {
        this.selectedMosqueName = selectedMosqueName;
    }
}
