package com.mosque.crm.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class DistributionRegistrationUpdateDTO {

    @Min(1)
    private Integer plannedParcelCount;

    @Size(max = 50)
    private String idNumber;

    @Size(max = 100)
    private String phoneNumber;

    public Integer getPlannedParcelCount() { return plannedParcelCount; }
    public void setPlannedParcelCount(Integer plannedParcelCount) { this.plannedParcelCount = plannedParcelCount; }

    public String getIdNumber() { return idNumber; }
    public void setIdNumber(String idNumber) { this.idNumber = idNumber; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
