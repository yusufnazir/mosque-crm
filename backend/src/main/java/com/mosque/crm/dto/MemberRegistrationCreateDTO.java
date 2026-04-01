package com.mosque.crm.dto;

import jakarta.validation.constraints.NotNull;

public class MemberRegistrationCreateDTO {

    @NotNull(message = "Distribution event ID is required")
    private Long distributionEventId;

    @NotNull(message = "Person ID is required")
    private Long personId;

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
}
