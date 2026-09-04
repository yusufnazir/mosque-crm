package com.mosque.crm.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Payload a registrant submits from the public "manage my registration" page
 * to adjust their contact details, special requests and question answers.
 */
public class PublicRegistrationUpdateDTO {

    private String name;
    private String email;
    private String phoneNumber;
    private int partySize = 1;
    private String specialRequests;
    private List<GeneralEventQuestionAnswerDTO> answers = new ArrayList<>();

    public PublicRegistrationUpdateDTO() {
    }

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
