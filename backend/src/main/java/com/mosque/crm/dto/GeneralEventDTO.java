package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class GeneralEventDTO {

    private Long id;
    private String name;
    private String description;
    private String generalEventType;
    private String customTypeLabel;
    private String location;
    private boolean isOnline;
    private String meetingUrl;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private boolean requiresRegistration;
    private LocalDateTime registrationOpenDate;
    private LocalDateTime registrationCloseDate;
    private Integer memberCapacity;
    private Integer nonMemberCapacity;
    private boolean acceptNonMembers;
    private boolean waitlistEnabled;
    private String ticketingType;
    private BigDecimal ticketPrice;
    private String currency;
    private String status;
    private String visibility;
    private boolean featured;
    private boolean requiresCheckIn;
    private String checkInCode;
    private int totalRegistrations;
    private int totalVolunteers;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public GeneralEventDTO() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getGeneralEventType() { return generalEventType; }
    public void setGeneralEventType(String generalEventType) { this.generalEventType = generalEventType; }

    public String getCustomTypeLabel() { return customTypeLabel; }
    public void setCustomTypeLabel(String customTypeLabel) { this.customTypeLabel = customTypeLabel; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public boolean isOnline() { return isOnline; }
    public void setOnline(boolean online) { isOnline = online; }

    public String getMeetingUrl() { return meetingUrl; }
    public void setMeetingUrl(String meetingUrl) { this.meetingUrl = meetingUrl; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public boolean isRequiresRegistration() { return requiresRegistration; }
    public void setRequiresRegistration(boolean requiresRegistration) { this.requiresRegistration = requiresRegistration; }

    public LocalDateTime getRegistrationOpenDate() { return registrationOpenDate; }
    public void setRegistrationOpenDate(LocalDateTime registrationOpenDate) { this.registrationOpenDate = registrationOpenDate; }

    public LocalDateTime getRegistrationCloseDate() { return registrationCloseDate; }
    public void setRegistrationCloseDate(LocalDateTime registrationCloseDate) { this.registrationCloseDate = registrationCloseDate; }

    public Integer getMemberCapacity() { return memberCapacity; }
    public void setMemberCapacity(Integer memberCapacity) { this.memberCapacity = memberCapacity; }

    public Integer getNonMemberCapacity() { return nonMemberCapacity; }
    public void setNonMemberCapacity(Integer nonMemberCapacity) { this.nonMemberCapacity = nonMemberCapacity; }

    public boolean isAcceptNonMembers() { return acceptNonMembers; }
    public void setAcceptNonMembers(boolean acceptNonMembers) { this.acceptNonMembers = acceptNonMembers; }

    public boolean isWaitlistEnabled() { return waitlistEnabled; }
    public void setWaitlistEnabled(boolean waitlistEnabled) { this.waitlistEnabled = waitlistEnabled; }

    public String getTicketingType() { return ticketingType; }
    public void setTicketingType(String ticketingType) { this.ticketingType = ticketingType; }

    public BigDecimal getTicketPrice() { return ticketPrice; }
    public void setTicketPrice(BigDecimal ticketPrice) { this.ticketPrice = ticketPrice; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }

    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }

    public boolean isRequiresCheckIn() { return requiresCheckIn; }
    public void setRequiresCheckIn(boolean requiresCheckIn) { this.requiresCheckIn = requiresCheckIn; }

    public String getCheckInCode() { return checkInCode; }
    public void setCheckInCode(String checkInCode) { this.checkInCode = checkInCode; }

    public int getTotalRegistrations() { return totalRegistrations; }
    public void setTotalRegistrations(int totalRegistrations) { this.totalRegistrations = totalRegistrations; }

    public int getTotalVolunteers() { return totalVolunteers; }
    public void setTotalVolunteers(int totalVolunteers) { this.totalVolunteers = totalVolunteers; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
