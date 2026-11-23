package com.mosque.crm.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class BulkMemberAccountRequest {

    @NotEmpty
    @Size(max = 10)
    private List<@NotNull @Positive Long> personIds;

    public BulkMemberAccountRequest() {
    }

    public List<Long> getPersonIds() {
        return personIds;
    }

    public void setPersonIds(List<Long> personIds) {
        this.personIds = personIds;
    }
}
