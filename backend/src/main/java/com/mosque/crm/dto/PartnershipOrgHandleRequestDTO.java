package com.mosque.crm.dto;

public class PartnershipOrgHandleRequestDTO {

    private String orgHandle;
    private String inviteCode;
    private String message;

    public String getOrgHandle() { return orgHandle; }
    public void setOrgHandle(String orgHandle) { this.orgHandle = orgHandle; }

    public String getInviteCode() { return inviteCode; }
    public void setInviteCode(String inviteCode) { this.inviteCode = inviteCode; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
