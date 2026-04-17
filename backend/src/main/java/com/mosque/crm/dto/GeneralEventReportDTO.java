package com.mosque.crm.dto;

import java.math.BigDecimal;

public class GeneralEventReportDTO {

    private Long eventId;
    private String eventName;
    private int totalRegistrations;
    private int confirmedRegistrations;
    private int declinedRegistrations;
    private int waitlistRegistrations;
    private int checkedInCount;
    private int absentCount;
    private int memberRegistrations;
    private int nonMemberRegistrations;
    private int totalPartySize;
    private BigDecimal totalRevenue;
    private int volunteerCount;

    public GeneralEventReportDTO() {
    }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public int getTotalRegistrations() { return totalRegistrations; }
    public void setTotalRegistrations(int totalRegistrations) { this.totalRegistrations = totalRegistrations; }

    public int getConfirmedRegistrations() { return confirmedRegistrations; }
    public void setConfirmedRegistrations(int confirmedRegistrations) { this.confirmedRegistrations = confirmedRegistrations; }

    public int getDeclinedRegistrations() { return declinedRegistrations; }
    public void setDeclinedRegistrations(int declinedRegistrations) { this.declinedRegistrations = declinedRegistrations; }

    public int getWaitlistRegistrations() { return waitlistRegistrations; }
    public void setWaitlistRegistrations(int waitlistRegistrations) { this.waitlistRegistrations = waitlistRegistrations; }

    public int getCheckedInCount() { return checkedInCount; }
    public void setCheckedInCount(int checkedInCount) { this.checkedInCount = checkedInCount; }

    public int getAbsentCount() { return absentCount; }
    public void setAbsentCount(int absentCount) { this.absentCount = absentCount; }

    public int getMemberRegistrations() { return memberRegistrations; }
    public void setMemberRegistrations(int memberRegistrations) { this.memberRegistrations = memberRegistrations; }

    public int getNonMemberRegistrations() { return nonMemberRegistrations; }
    public void setNonMemberRegistrations(int nonMemberRegistrations) { this.nonMemberRegistrations = nonMemberRegistrations; }

    public int getTotalPartySize() { return totalPartySize; }
    public void setTotalPartySize(int totalPartySize) { this.totalPartySize = totalPartySize; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public int getVolunteerCount() { return volunteerCount; }
    public void setVolunteerCount(int volunteerCount) { this.volunteerCount = volunteerCount; }
}
