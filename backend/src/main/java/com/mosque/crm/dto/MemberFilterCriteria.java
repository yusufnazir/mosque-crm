package com.mosque.crm.dto;

import java.util.List;

/**
 * Structured filter criteria for the members list.
 * All fields are optional; null values are ignored (no constraint applied).
 */
public class MemberFilterCriteria {

    private List<String> statuses;
    private String gender;
    private Integer minAge;
    private Integer maxAge;
    private Boolean hasEmail;
    private Boolean hasPhone;
    private List<Long> groupIds;
    private String joinedFrom; // ISO date yyyy-MM-dd
    private String joinedTo;   // ISO date yyyy-MM-dd

    public MemberFilterCriteria() {
    }

    public boolean isEmpty() {
        return (statuses == null || statuses.isEmpty())
                && gender == null
                && minAge == null
                && maxAge == null
                && hasEmail == null
                && hasPhone == null
                && (groupIds == null || groupIds.isEmpty())
                && joinedFrom == null
                && joinedTo == null;
    }

    public List<String> getStatuses() {
        return statuses;
    }

    public void setStatuses(List<String> statuses) {
        this.statuses = statuses;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public Integer getMinAge() {
        return minAge;
    }

    public void setMinAge(Integer minAge) {
        this.minAge = minAge;
    }

    public Integer getMaxAge() {
        return maxAge;
    }

    public void setMaxAge(Integer maxAge) {
        this.maxAge = maxAge;
    }

    public Boolean getHasEmail() {
        return hasEmail;
    }

    public void setHasEmail(Boolean hasEmail) {
        this.hasEmail = hasEmail;
    }

    public Boolean getHasPhone() {
        return hasPhone;
    }

    public void setHasPhone(Boolean hasPhone) {
        this.hasPhone = hasPhone;
    }

    public List<Long> getGroupIds() {
        return groupIds;
    }

    public void setGroupIds(List<Long> groupIds) {
        this.groupIds = groupIds;
    }

    public String getJoinedFrom() {
        return joinedFrom;
    }

    public void setJoinedFrom(String joinedFrom) {
        this.joinedFrom = joinedFrom;
    }

    public String getJoinedTo() {
        return joinedTo;
    }

    public void setJoinedTo(String joinedTo) {
        this.joinedTo = joinedTo;
    }
}
