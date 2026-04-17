package com.mosque.crm.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.enums.GeneralEventStatus;
import com.mosque.crm.enums.GeneralEventType;
import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

@Entity
@Table(name = "org_general_events")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class GeneralEvent implements OrganizationAware {

    @Id
    @TableGenerator(name = "general_events_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "general_events_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "general_events_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "general_event_type", nullable = false, length = 50)
    private GeneralEventType generalEventType;

    @Column(name = "custom_type_label", length = 100)
    private String customTypeLabel;

    @Column(name = "location", length = 500)
    private String location;

    @Column(name = "is_online", nullable = false)
    private boolean isOnline = false;

    @Column(name = "meeting_url", length = 255)
    private String meetingUrl;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "requires_registration", nullable = false)
    private boolean requiresRegistration = true;

    @Column(name = "registration_open_date")
    private LocalDateTime registrationOpenDate;

    @Column(name = "registration_close_date")
    private LocalDateTime registrationCloseDate;

    @Column(name = "member_capacity")
    private Integer memberCapacity;

    @Column(name = "non_member_capacity")
    private Integer nonMemberCapacity;

    @Column(name = "accept_non_members", nullable = false)
    private boolean acceptNonMembers = false;

    @Column(name = "waitlist_enabled", nullable = false)
    private boolean waitlistEnabled = false;

    @Column(name = "ticketing_type", nullable = false, length = 20)
    private String ticketingType = "NONE";

    @Column(name = "ticket_price", precision = 10, scale = 2)
    private BigDecimal ticketPrice;

    @Column(name = "currency", length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GeneralEventStatus status = GeneralEventStatus.DRAFT;

    @Column(name = "visibility", nullable = false, length = 20)
    private String visibility = "MEMBERS_ONLY";

    @Column(name = "featured", nullable = false)
    private boolean featured = false;

    @Column(name = "requires_check_in", nullable = false)
    private boolean requiresCheckIn = false;

    @Column(name = "check_in_code", length = 20)
    private String checkInCode;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "generalEvent", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<GeneralEventRegistration> registrations = new ArrayList<>();

    @OneToMany(mappedBy = "generalEvent", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<GeneralEventVolunteer> volunteers = new ArrayList<>();

    @OneToMany(mappedBy = "generalEvent", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<GeneralEventSession> sessions = new ArrayList<>();

    public GeneralEvent() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public GeneralEventType getGeneralEventType() { return generalEventType; }
    public void setGeneralEventType(GeneralEventType generalEventType) { this.generalEventType = generalEventType; }

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

    public GeneralEventStatus getStatus() { return status; }
    public void setStatus(GeneralEventStatus status) { this.status = status; }

    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }

    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }

    public boolean isRequiresCheckIn() { return requiresCheckIn; }
    public void setRequiresCheckIn(boolean requiresCheckIn) { this.requiresCheckIn = requiresCheckIn; }

    public String getCheckInCode() { return checkInCode; }
    public void setCheckInCode(String checkInCode) { this.checkInCode = checkInCode; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<GeneralEventRegistration> getRegistrations() { return registrations; }
    public void setRegistrations(List<GeneralEventRegistration> registrations) { this.registrations = registrations; }

    public List<GeneralEventVolunteer> getVolunteers() { return volunteers; }
    public void setVolunteers(List<GeneralEventVolunteer> volunteers) { this.volunteers = volunteers; }

    public List<GeneralEventSession> getSessions() { return sessions; }
    public void setSessions(List<GeneralEventSession> sessions) { this.sessions = sessions; }
}
