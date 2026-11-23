package com.mosque.crm.dto;

public class MemberAccountResultDTO {

    public enum Status {
        ELIGIBLE_EMAIL, ELIGIBLE_WHATSAPP,
        ALREADY_HAS_ACCOUNT, INACTIVE, NO_VALID_CONTACT, CONTACT_IN_USE, NOT_FOUND,
        CREATED_EMAIL, CREATED_WHATSAPP, CREATED_NO_NOTIFICATION,
        PLAN_LIMIT_REACHED, FAILED
    }

    private Long personId;
    private String name;
    private String username;
    private Status status;

    public MemberAccountResultDTO() {
    }

    public MemberAccountResultDTO(Long personId, String name, String username, Status status) {
        this.personId = personId;
        this.name = name;
        this.username = username;
        this.status = status;
    }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}
