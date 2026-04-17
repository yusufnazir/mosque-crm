package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class GeneralEventCreateDTO {

    @NotBlank
    private String name;

    private String description;

    @NotNull
    private String generalEventType;

    private String customTypeLabel;

    private String location;

    private boolean isOnline = false;

    private String meetingUrl;

    @NotNull
    private LocalDate startDate;

    private LocalDate endDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private boolean requiresRegistration = true;

    private LocalDateTime registrationOpenDate;

    private LocalDateTime registrationCloseDate;

    private Integer memberCapacity;

    private Integer nonMemberCapacity;

    private boolean acceptNonMembers = false;

    private boolean waitlistEnabled = false;

    private String ticketingType = "NONE";

    private BigDecimal ticketPrice;

    private String currency;

    private String status = "DRAFT";

    private String visibility = "MEMBERS_ONLY";

    private boolean featured = false;

    private boolean requiresCheckIn = false;

    public GeneralEventCreateDTO() {
    }

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
}
