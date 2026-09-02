package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class GeneralEventRegistrationCreateDTO {

    private Long generalEventId;

    @NotNull
    private String registrantType;

    private Long personId;

    @NotBlank
    private String name;

    private String email;

    private String phoneNumber;

    private int partySize = 1;

    private String rsvpStatus = "CONFIRMED";

    private String specialRequests;

    private BigDecimal amountPaid;

    private String source = "ADMIN_MANUAL";

    /** Answers to the event's registration questions (optional). */
    private List<GeneralEventQuestionAnswerDTO> answers = new ArrayList<>();

    public GeneralEventRegistrationCreateDTO() {
    }

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

    public String getSpecialRequests() { return specialRequests; }
    public void setSpecialRequests(String specialRequests) { this.specialRequests = specialRequests; }

    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public List<GeneralEventQuestionAnswerDTO> getAnswers() { return answers; }
    public void setAnswers(List<GeneralEventQuestionAnswerDTO> answers) {
        this.answers = answers != null ? answers : new ArrayList<>();
    }
}
