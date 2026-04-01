package com.mosque.crm.dto;

public class DistributionSummaryDTO {

    private int totalParcels;
    private int distributedParcels;
    private int remainingParcels;
    private int totalMembers;
    private int totalNonMembers;
    private int collectedMembers;
    private int collectedNonMembers;
    private int nonMemberAllocation;

    public DistributionSummaryDTO() {
    }

    public int getTotalParcels() {
        return totalParcels;
    }

    public void setTotalParcels(int totalParcels) {
        this.totalParcels = totalParcels;
    }

    public int getDistributedParcels() {
        return distributedParcels;
    }

    public void setDistributedParcels(int distributedParcels) {
        this.distributedParcels = distributedParcels;
    }

    public int getRemainingParcels() {
        return remainingParcels;
    }

    public void setRemainingParcels(int remainingParcels) {
        this.remainingParcels = remainingParcels;
    }

    public int getTotalMembers() {
        return totalMembers;
    }

    public void setTotalMembers(int totalMembers) {
        this.totalMembers = totalMembers;
    }

    public int getTotalNonMembers() {
        return totalNonMembers;
    }

    public void setTotalNonMembers(int totalNonMembers) {
        this.totalNonMembers = totalNonMembers;
    }

    public int getCollectedMembers() {
        return collectedMembers;
    }

    public void setCollectedMembers(int collectedMembers) {
        this.collectedMembers = collectedMembers;
    }

    public int getCollectedNonMembers() {
        return collectedNonMembers;
    }

    public void setCollectedNonMembers(int collectedNonMembers) {
        this.collectedNonMembers = collectedNonMembers;
    }

    public int getNonMemberAllocation() {
        return nonMemberAllocation;
    }

    public void setNonMemberAllocation(int nonMemberAllocation) {
        this.nonMemberAllocation = nonMemberAllocation;
    }
}
