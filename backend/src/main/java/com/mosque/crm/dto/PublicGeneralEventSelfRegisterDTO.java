package com.mosque.crm.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Self-registration payload for a public general event.
 * <p>
 * When {@code optIn} is true, the server uses the authenticated user's linked person
 * and ignores form fields. When false, the guest form fields are used and the
 * server may match an existing org member by email, phone, or unique first+last name.
 */
public class PublicGeneralEventSelfRegisterDTO {

    /** Logged-in member shortcut — register without filling the form. */
    private boolean optIn;

    private String firstName;
    private String lastName;
    /** @deprecated Prefer firstName + lastName; still accepted as a fallback. */
    private String name;
    private String email;
    private String phoneNumber;
    private int partySize = 1;
    private String specialRequests;

    /** Answers to the event's registration questions (optional). */
    private List<GeneralEventQuestionAnswerDTO> answers = new ArrayList<>();

    public PublicGeneralEventSelfRegisterDTO() {
    }

    public boolean isOptIn() { return optIn; }
    public void setOptIn(boolean optIn) { this.optIn = optIn; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

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

    public List<GeneralEventQuestionAnswerDTO> getAnswers() { return answers; }
    public void setAnswers(List<GeneralEventQuestionAnswerDTO> answers) {
        this.answers = answers != null ? answers : new ArrayList<>();
    }
}
