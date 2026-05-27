package com.mosque.crm.dto;

import java.time.LocalDateTime;

public class DistributionRegistrationDTO {

    private Long id;
    private Long distributionEventId;
    private Long registrationTypeId;
    private String registrationTypeName;
    private Long personId;
    private String displayName;
    private boolean member;
    private String distributionNumber;
    private int plannedParcelCount;
    private int distributedParcelCount;
    private String idNumber;
    private String phoneNumber;
    private boolean adHoc;
    private String status;
    private LocalDateTime registeredAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDistributionEventId() { return distributionEventId; }
    public void setDistributionEventId(Long distributionEventId) { this.distributionEventId = distributionEventId; }

    public Long getRegistrationTypeId() { return registrationTypeId; }
    public void setRegistrationTypeId(Long registrationTypeId) { this.registrationTypeId = registrationTypeId; }

    public String getRegistrationTypeName() { return registrationTypeName; }
    public void setRegistrationTypeName(String registrationTypeName) { this.registrationTypeName = registrationTypeName; }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public boolean isMember() { return member; }
    public void setMember(boolean member) { this.member = member; }

    public String getDistributionNumber() { return distributionNumber; }
    public void setDistributionNumber(String distributionNumber) { this.distributionNumber = distributionNumber; }

    public int getPlannedParcelCount() { return plannedParcelCount; }
    public void setPlannedParcelCount(int plannedParcelCount) { this.plannedParcelCount = plannedParcelCount; }

    public int getDistributedParcelCount() { return distributedParcelCount; }
    public void setDistributedParcelCount(int distributedParcelCount) { this.distributedParcelCount = distributedParcelCount; }

    public String getIdNumber() { return idNumber; }
    public void setIdNumber(String idNumber) { this.idNumber = idNumber; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public boolean isAdHoc() { return adHoc; }
    public void setAdHoc(boolean adHoc) { this.adHoc = adHoc; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
