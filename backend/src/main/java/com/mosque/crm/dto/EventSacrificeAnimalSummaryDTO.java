package com.mosque.crm.dto;

import java.math.BigDecimal;

public class EventSacrificeAnimalSummaryDTO {

    private BigDecimal totalMeatKg;
    private BigDecimal totalShareEntitlementKg;
    private BigDecimal totalReceivedEntitlementKg;
    private BigDecimal availableMeatKg;
    private int totalDistributedParcels;
    private BigDecimal totalDistributedWeightKg;

    public BigDecimal getTotalMeatKg() {
        return totalMeatKg;
    }

    public void setTotalMeatKg(BigDecimal totalMeatKg) {
        this.totalMeatKg = totalMeatKg;
    }

    public BigDecimal getTotalShareEntitlementKg() {
        return totalShareEntitlementKg;
    }

    public void setTotalShareEntitlementKg(BigDecimal totalShareEntitlementKg) {
        this.totalShareEntitlementKg = totalShareEntitlementKg;
    }

    public BigDecimal getTotalReceivedEntitlementKg() {
        return totalReceivedEntitlementKg;
    }

    public void setTotalReceivedEntitlementKg(BigDecimal totalReceivedEntitlementKg) {
        this.totalReceivedEntitlementKg = totalReceivedEntitlementKg;
    }

    public BigDecimal getAvailableMeatKg() {
        return availableMeatKg;
    }

    public void setAvailableMeatKg(BigDecimal availableMeatKg) {
        this.availableMeatKg = availableMeatKg;
    }

    public int getTotalDistributedParcels() {
        return totalDistributedParcels;
    }

    public void setTotalDistributedParcels(int totalDistributedParcels) {
        this.totalDistributedParcels = totalDistributedParcels;
    }

    public BigDecimal getTotalDistributedWeightKg() {
        return totalDistributedWeightKg;
    }

    public void setTotalDistributedWeightKg(BigDecimal totalDistributedWeightKg) {
        this.totalDistributedWeightKg = totalDistributedWeightKg;
    }
}
