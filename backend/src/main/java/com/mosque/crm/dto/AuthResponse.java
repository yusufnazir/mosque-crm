package com.mosque.crm.dto;

import java.util.List;

public class AuthResponse {
    private String token;
    private String username;
    private String role;
    private Long memberId;
    private String personId;
    private Long organizationId;
    private String organizationName;
    private String organizationHandle;
    private boolean superAdmin;
    private List<String> permissions;
    private UserPreferencesDTO preferences;
    private Long selectedOrganizationId;
    private String selectedOrganizationName;
    private boolean mustChangePassword;

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

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
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

    public String getOrganizationHandle() {
        return organizationHandle;
    }

    public void setOrganizationHandle(String organizationHandle) {
        this.organizationHandle = organizationHandle;
    }
}
