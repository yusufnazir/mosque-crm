package com.mosque.crm.dto;

public class AuthResponse {
    private String token;
    private String username;
    private String role;
    private Long memberId;
    private String personId;
    private UserPreferencesDTO preferences;

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
}
