package com.mosque.crm.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.enums.CheckInStatus;
import com.mosque.crm.enums.RegistrantType;
import com.mosque.crm.enums.RsvpStatus;
import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

@Entity
@Table(name = "org_general_event_registrations")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class GeneralEventRegistration implements OrganizationAware {

    @Id
    @TableGenerator(name = "general_event_reg_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "general_event_reg_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "general_event_reg_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "general_event_id", nullable = false)
    private GeneralEvent generalEvent;

    @Enumerated(EnumType.STRING)
    @Column(name = "registrant_type", nullable = false, length = 20)
    private RegistrantType registrantType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id")
    private Person person;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "party_size", nullable = false)
    private int partySize = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "rsvp_status", nullable = false, length = 20)
    private RsvpStatus rsvpStatus = RsvpStatus.CONFIRMED;

    @Enumerated(EnumType.STRING)
    @Column(name = "check_in_status", nullable = false, length = 20)
    private CheckInStatus checkInStatus = CheckInStatus.NOT_CHECKED_IN;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "special_requests", length = 500)
    private String specialRequests;

    @Column(name = "amount_paid", precision = 10, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "registered_at", nullable = false)
    private LocalDateTime registeredAt;

    @Column(name = "source", nullable = false, length = 30)
    private String source = "ADMIN_MANUAL";

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public GeneralEventRegistration() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public GeneralEvent getGeneralEvent() { return generalEvent; }
    public void setGeneralEvent(GeneralEvent generalEvent) { this.generalEvent = generalEvent; }

    public RegistrantType getRegistrantType() { return registrantType; }
    public void setRegistrantType(RegistrantType registrantType) { this.registrantType = registrantType; }

    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public int getPartySize() { return partySize; }
    public void setPartySize(int partySize) { this.partySize = partySize; }

    public RsvpStatus getRsvpStatus() { return rsvpStatus; }
    public void setRsvpStatus(RsvpStatus rsvpStatus) { this.rsvpStatus = rsvpStatus; }

    public CheckInStatus getCheckInStatus() { return checkInStatus; }
    public void setCheckInStatus(CheckInStatus checkInStatus) { this.checkInStatus = checkInStatus; }

    public LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }

    public String getSpecialRequests() { return specialRequests; }
    public void setSpecialRequests(String specialRequests) { this.specialRequests = specialRequests; }

    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
