package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Public-safe view of a general event for anonymous / self-registration pages.
 * Omits internal fields (check-in codes, volunteer counts, etc.).
 */
public class PublicGeneralEventDTO {

    private Long id;
    private String name;
    private String description;
    private String generalEventType;
    private String customTypeLabel;
    private String location;
    private boolean online;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private boolean requiresRegistration;
    private LocalDateTime registrationOpenDate;
    private LocalDateTime registrationCloseDate;
    private boolean acceptNonMembers;
    private boolean waitlistEnabled;
    private boolean publicFormShowPhone;
    private boolean publicFormShowPartySize;
    private boolean publicFormShowSpecialRequests;
    private String ticketingType;
    private BigDecimal ticketPrice;
    private String currency;
    private String status;
    private String organizationName;
    private String organizationHandle;

    /** True when status, visibility, and registration window allow self-registration. */
    private boolean registrationOpen;
    /** True when the current authenticated person is already registered. */
    private boolean alreadyRegistered;
    /** True when the current user is logged in with a linked person in this org. */
    private boolean canOptIn;
    private String optInDisplayName;
    private String optInEmail;
    /** Null means unlimited. */
    private Integer spotsRemaining;

    /** Questions the registrant must answer on the public self-registration form. */
    private List<GeneralEventQuestionDTO> registrationQuestions = new ArrayList<>();

    public PublicGeneralEventDTO() {
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

    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }

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

    public boolean isAcceptNonMembers() { return acceptNonMembers; }
    public void setAcceptNonMembers(boolean acceptNonMembers) { this.acceptNonMembers = acceptNonMembers; }

    public boolean isWaitlistEnabled() { return waitlistEnabled; }
    public void setWaitlistEnabled(boolean waitlistEnabled) { this.waitlistEnabled = waitlistEnabled; }

    public boolean isPublicFormShowPhone() { return publicFormShowPhone; }
    public void setPublicFormShowPhone(boolean publicFormShowPhone) { this.publicFormShowPhone = publicFormShowPhone; }

    public boolean isPublicFormShowPartySize() { return publicFormShowPartySize; }
    public void setPublicFormShowPartySize(boolean publicFormShowPartySize) {
        this.publicFormShowPartySize = publicFormShowPartySize;
    }

    public boolean isPublicFormShowSpecialRequests() { return publicFormShowSpecialRequests; }
    public void setPublicFormShowSpecialRequests(boolean publicFormShowSpecialRequests) {
        this.publicFormShowSpecialRequests = publicFormShowSpecialRequests;
    }

    public String getTicketingType() { return ticketingType; }
    public void setTicketingType(String ticketingType) { this.ticketingType = ticketingType; }

    public BigDecimal getTicketPrice() { return ticketPrice; }
    public void setTicketPrice(BigDecimal ticketPrice) { this.ticketPrice = ticketPrice; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }

    public String getOrganizationHandle() { return organizationHandle; }
    public void setOrganizationHandle(String organizationHandle) { this.organizationHandle = organizationHandle; }

    public boolean isRegistrationOpen() { return registrationOpen; }
    public void setRegistrationOpen(boolean registrationOpen) { this.registrationOpen = registrationOpen; }

    public boolean isAlreadyRegistered() { return alreadyRegistered; }
    public void setAlreadyRegistered(boolean alreadyRegistered) { this.alreadyRegistered = alreadyRegistered; }

    public boolean isCanOptIn() { return canOptIn; }
    public void setCanOptIn(boolean canOptIn) { this.canOptIn = canOptIn; }

    public String getOptInDisplayName() { return optInDisplayName; }
    public void setOptInDisplayName(String optInDisplayName) { this.optInDisplayName = optInDisplayName; }

    public String getOptInEmail() { return optInEmail; }
    public void setOptInEmail(String optInEmail) { this.optInEmail = optInEmail; }

    public Integer getSpotsRemaining() { return spotsRemaining; }
    public void setSpotsRemaining(Integer spotsRemaining) { this.spotsRemaining = spotsRemaining; }

    public List<GeneralEventQuestionDTO> getRegistrationQuestions() { return registrationQuestions; }
    public void setRegistrationQuestions(List<GeneralEventQuestionDTO> registrationQuestions) {
        this.registrationQuestions = registrationQuestions != null ? registrationQuestions : new ArrayList<>();
    }
}
