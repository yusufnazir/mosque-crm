package com.mosque.crm.dto;

import jakarta.validation.constraints.NotBlank;

public class ChangeSubscriptionPlanRequest {

    @NotBlank(message = "planCode is required")
    private String planCode;

    public ChangeSubscriptionPlanRequest() {
    }

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }
}
