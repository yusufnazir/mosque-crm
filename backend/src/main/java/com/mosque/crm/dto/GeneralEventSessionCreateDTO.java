package com.mosque.crm.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class GeneralEventSessionCreateDTO {

    @NotBlank
    private String sessionName;

    @NotNull
    private LocalDate sessionDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private String location;

    private String description;

    private Integer capacity;

    private int sessionOrder = 1;

    public GeneralEventSessionCreateDTO() {
    }

    public String getSessionName() { return sessionName; }
    public void setSessionName(String sessionName) { this.sessionName = sessionName; }

    public LocalDate getSessionDate() { return sessionDate; }
    public void setSessionDate(LocalDate sessionDate) { this.sessionDate = sessionDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public int getSessionOrder() { return sessionOrder; }
    public void setSessionOrder(int sessionOrder) { this.sessionOrder = sessionOrder; }
}
