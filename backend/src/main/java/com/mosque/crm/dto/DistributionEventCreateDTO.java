package com.mosque.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class DistributionEventCreateDTO {

    @NotNull(message = "Year is required")
    private Integer year;

    @NotBlank(message = "Name is required")
    private String name;

    private LocalDate eventDate;

    private String location;

    private String eventType;

    private Integer memberCapacity;

    private Integer nonMemberCapacity;

    public DistributionEventCreateDTO() {
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDate getEventDate() {
        return eventDate;
    }

    public void setEventDate(LocalDate eventDate) {
        this.eventDate = eventDate;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Integer getMemberCapacity() {
        return memberCapacity;
    }

    public void setMemberCapacity(Integer memberCapacity) {
        this.memberCapacity = memberCapacity;
    }

    public Integer getNonMemberCapacity() {
        return nonMemberCapacity;
    }

    public void setNonMemberCapacity(Integer nonMemberCapacity) {
        this.nonMemberCapacity = nonMemberCapacity;
    }
}
