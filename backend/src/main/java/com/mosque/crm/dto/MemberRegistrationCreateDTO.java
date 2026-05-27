package com.mosque.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class MemberRegistrationCreateDTO {

    @NotNull(message = "Distribution event ID is required")
    private Long distributionEventId;

    private Long personId;

    @NotBlank(message = "Worker name is required")
    @Size(max = 255)
    private String personName;

    @NotNull
    private Boolean member;

    public MemberRegistrationCreateDTO() {
    }

    public Long getDistributionEventId() {
        return distributionEventId;
    }

    public void setDistributionEventId(Long distributionEventId) {
        this.distributionEventId = distributionEventId;
    }

    public Long getPersonId() {
        return personId;
    }

    public void setPersonId(Long personId) {
        this.personId = personId;
    }

    public String getPersonName() {
        return personName;
    }

    public void setPersonName(String personName) {
        this.personName = personName;
    }

    public Boolean getMember() {
        return member;
    }

    public void setMember(Boolean member) {
        this.member = member;
    }
}
