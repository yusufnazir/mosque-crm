package com.mosque.crm.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class DistributionRegistrationCreateDTO {

    @NotNull
    private Long distributionEventId;

    @NotNull
    private Long registrationTypeId;

    private Long personId;

    @NotBlank
    @Size(max = 255)
    private String displayName;

    @NotNull
    private Boolean member;

    @Min(1)
    private Integer plannedParcelCount;

    @Size(max = 50)
    private String idNumber;

    @Size(max = 100)
    private String phoneNumber;

    private Boolean adHoc;

    public Long getDistributionEventId() { return distributionEventId; }
    public void setDistributionEventId(Long distributionEventId) { this.distributionEventId = distributionEventId; }

    public Long getRegistrationTypeId() { return registrationTypeId; }
    public void setRegistrationTypeId(Long registrationTypeId) { this.registrationTypeId = registrationTypeId; }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public Boolean getMember() { return member; }
    public void setMember(Boolean member) { this.member = member; }

    public Integer getPlannedParcelCount() { return plannedParcelCount; }
    public void setPlannedParcelCount(Integer plannedParcelCount) { this.plannedParcelCount = plannedParcelCount; }

    public String getIdNumber() { return idNumber; }
    public void setIdNumber(String idNumber) { this.idNumber = idNumber; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public Boolean getAdHoc() { return adHoc; }
    public void setAdHoc(Boolean adHoc) { this.adHoc = adHoc; }
}
