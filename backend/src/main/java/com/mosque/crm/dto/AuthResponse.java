package com.mosque.crm.dto;

import java.util.List;

public class AuthResponse {
    private String token;
    private String username;
    private String role;
    private Long memberId;
    private String personId;
    private Long mosqueId;
    private String mosqueName;
    private boolean superAdmin;
    private List<String> permissions;
    private UserPreferencesDTO preferences;
    private Long selectedMosqueId;
    private String selectedMosqueName;

    public AuthResponse() {
    }

    public AuthResponse(String token, String username, String role, Long memberId) {
        this.token = token;
        this.username = username;
        this.role = role;
        this.memberId = memberId;
    }

    public AuthResponse(String token, String username, String role, Long memberId, UserPreferencesDTO preferences) {
        this.token = token;
        this.username = username;
        this.role = role;
        this.memberId = memberId;
        this.preferences = preferences;
    }

    public AuthResponse(String token, String username, String role, Long memberId, String personId, UserPreferencesDTO preferences) {
        this.token = token;
        this.username = username;
        this.role = role;
        this.memberId = memberId;
        this.personId = personId;
        this.preferences = preferences;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Long getMemberId() {
        return memberId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public String getPersonId() {
        return personId;
    }

    public void setPersonId(String personId) {
        this.personId = personId;
    }

    public UserPreferencesDTO getPreferences() {
        return preferences;
    }

    public void setPreferences(UserPreferencesDTO preferences) {
        this.preferences = preferences;
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

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
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
