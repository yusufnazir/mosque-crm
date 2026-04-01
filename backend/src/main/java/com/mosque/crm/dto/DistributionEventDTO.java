package com.mosque.crm.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class DistributionEventDTO {

    private Long id;
    private int year;
    private String name;
    private LocalDate eventDate;
    private String location;
    private String status;
    private String eventType;
    private int memberCapacity;
    private int nonMemberCapacity;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ParcelCategoryDTO> parcelCategories;

    public DistributionEventDTO() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<ParcelCategoryDTO> getParcelCategories() {
        return parcelCategories;
    }

    public void setParcelCategories(List<ParcelCategoryDTO> parcelCategories) {
        this.parcelCategories = parcelCategories;
    }

    public int getMemberCapacity() {
        return memberCapacity;
    }

    public void setMemberCapacity(int memberCapacity) {
        this.memberCapacity = memberCapacity;
    }

    public int getNonMemberCapacity() {
        return nonMemberCapacity;
    }

    public void setNonMemberCapacity(int nonMemberCapacity) {
        this.nonMemberCapacity = nonMemberCapacity;
    }
}
