package com.mosque.crm.dto;

import com.mosque.crm.enums.OrganizationSubscriptionStatus;

import jakarta.validation.constraints.NotNull;

public class UpdateSubscriptionStatusRequest {

    @NotNull(message = "status is required")
    private OrganizationSubscriptionStatus status;

    public UpdateSubscriptionStatusRequest() {
    }

    public OrganizationSubscriptionStatus getStatus() {
        return status;
    }

    public void setStatus(OrganizationSubscriptionStatus status) {
        this.status = status;
    }
}
