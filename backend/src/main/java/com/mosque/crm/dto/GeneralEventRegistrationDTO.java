package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class GeneralEventRegistrationDTO {

    private Long id;
    private Long generalEventId;
    private String registrantType;
    private Long personId;
    private String name;
    private String email;
    private String phoneNumber;
    private int partySize;
    private String rsvpStatus;
    private String checkInStatus;
    private LocalDateTime checkedInAt;
    private String specialRequests;
    private BigDecimal amountPaid;
    private LocalDateTime registeredAt;
    private String source;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public GeneralEventRegistrationDTO() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getGeneralEventId() { return generalEventId; }
    public void setGeneralEventId(Long generalEventId) { this.generalEventId = generalEventId; }

    public String getRegistrantType() { return registrantType; }
    public void setRegistrantType(String registrantType) { this.registrantType = registrantType; }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public int getPartySize() { return partySize; }
    public void setPartySize(int partySize) { this.partySize = partySize; }

    public String getRsvpStatus() { return rsvpStatus; }
    public void setRsvpStatus(String rsvpStatus) { this.rsvpStatus = rsvpStatus; }

    public String getCheckInStatus() { return checkInStatus; }
    public void setCheckInStatus(String checkInStatus) { this.checkInStatus = checkInStatus; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
