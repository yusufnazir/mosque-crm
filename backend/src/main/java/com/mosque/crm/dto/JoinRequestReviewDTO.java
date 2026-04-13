package com.mosque.crm.dto;

public class JoinRequestReviewDTO {

    private String action; // "approve" or "reject"
    private String rejectionReason;

    public JoinRequestReviewDTO() {}

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
}
