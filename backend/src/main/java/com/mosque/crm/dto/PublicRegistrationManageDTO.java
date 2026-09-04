package com.mosque.crm.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Data shown on the public "manage my registration" page reached via the
 * per-registration bearer link (edit token). No admin-only fields are exposed.
 */
public class PublicRegistrationManageDTO {

    private PublicGeneralEventDTO event;
    private Long registrationId;
    private String name;
    private String email;
    private String phoneNumber;
    private int partySize;
    private String specialRequests;
    /** Current answers (with option ids/text) so the form can be prefilled. */
    private List<GeneralEventRegistrationAnswerDTO> answers = new ArrayList<>();
    /** False when the event is CLOSED/CANCELLED — registrant can only view. */
    private boolean canEdit;

    public PublicRegistrationManageDTO() {
    }

    public PublicGeneralEventDTO getEvent() { return event; }
    public void setEvent(PublicGeneralEventDTO event) { this.event = event; }

    public Long getRegistrationId() { return registrationId; }
    public void setRegistrationId(Long registrationId) { this.registrationId = registrationId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public int getPartySize() { return partySize; }
    public void setPartySize(int partySize) { this.partySize = partySize; }

    public String getSpecialRequests() { return specialRequests; }
    public void setSpecialRequests(String specialRequests) { this.specialRequests = specialRequests; }

    public List<GeneralEventRegistrationAnswerDTO> getAnswers() { return answers; }
    public void setAnswers(List<GeneralEventRegistrationAnswerDTO> answers) {
        this.answers = answers != null ? answers : new ArrayList<>();
    }

    public boolean isCanEdit() { return canEdit; }
    public void setCanEdit(boolean canEdit) { this.canEdit = canEdit; }
}
