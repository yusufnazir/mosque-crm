package com.mosque.crm.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class OrganizationPartnershipDTO {

    private Long id;
    private Long parentOrganizationId;
    private String parentOrganizationName;
    private String parentOrganizationHandle;
    private Long memberOrganizationId;
    private String memberOrganizationName;
    private String memberOrganizationHandle;
    private String status;
    private String initiatedBy;
    private String message;
    private String endedReason;
    private LocalDateTime initiatedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime endedAt;
    private List<OrganizationShareSettingDTO> shareSettings = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getParentOrganizationId() { return parentOrganizationId; }
    public void setParentOrganizationId(Long parentOrganizationId) { this.parentOrganizationId = parentOrganizationId; }

    public String getParentOrganizationName() { return parentOrganizationName; }
    public void setParentOrganizationName(String parentOrganizationName) { this.parentOrganizationName = parentOrganizationName; }

    public String getParentOrganizationHandle() { return parentOrganizationHandle; }
    public void setParentOrganizationHandle(String parentOrganizationHandle) { this.parentOrganizationHandle = parentOrganizationHandle; }

    public Long getMemberOrganizationId() { return memberOrganizationId; }
    public void setMemberOrganizationId(Long memberOrganizationId) { this.memberOrganizationId = memberOrganizationId; }

    public String getMemberOrganizationName() { return memberOrganizationName; }
    public void setMemberOrganizationName(String memberOrganizationName) { this.memberOrganizationName = memberOrganizationName; }

    public String getMemberOrganizationHandle() { return memberOrganizationHandle; }
    public void setMemberOrganizationHandle(String memberOrganizationHandle) { this.memberOrganizationHandle = memberOrganizationHandle; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getInitiatedBy() { return initiatedBy; }
    public void setInitiatedBy(String initiatedBy) { this.initiatedBy = initiatedBy; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getEndedReason() { return endedReason; }
    public void setEndedReason(String endedReason) { this.endedReason = endedReason; }

    public LocalDateTime getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(LocalDateTime initiatedAt) { this.initiatedAt = initiatedAt; }

    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }

    public LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }

    public List<OrganizationShareSettingDTO> getShareSettings() { return shareSettings; }
    public void setShareSettings(List<OrganizationShareSettingDTO> shareSettings) { this.shareSettings = shareSettings; }
}
