package com.mosque.crm.dto;

public class UserPreferencesDTO {
    private String language;
    private String theme;
    private String timezone;
    private String calendar;

    // Constructors
    public UserPreferencesDTO() {
    }

    public UserPreferencesDTO(String language, String theme, String timezone, String calendar) {
        this.language = language;
        this.theme = theme;
        this.timezone = timezone;
        this.calendar = calendar;
    }

    // Getters and Setters
    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getCalendar() {
        return calendar;
    }

    public void setCalendar(String calendar) {
        this.calendar = calendar;
    }
}
