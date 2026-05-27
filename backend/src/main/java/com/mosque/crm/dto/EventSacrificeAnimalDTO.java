package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import com.mosque.crm.enums.SacrificeAnimalSize;

public class EventSacrificeAnimalDTO {

    private Long id;
    private String eventKind;
    private Long eventId;
    private String animalNumber;
    private SacrificeAnimalSize size;
    private int maxShares;
    private int allocatedShares;
    private int remainingShares;
    private BigDecimal weightKg;
    private BigDecimal meatKg;
    private BigDecimal totalMeatEntitlementKg;
    private List<EventSacrificeAnimalShareDTO> shares = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEventKind() { return eventKind; }
    public void setEventKind(String eventKind) { this.eventKind = eventKind; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getAnimalNumber() { return animalNumber; }
    public void setAnimalNumber(String animalNumber) { this.animalNumber = animalNumber; }

    public SacrificeAnimalSize getSize() { return size; }
    public void setSize(SacrificeAnimalSize size) { this.size = size; }

    public int getMaxShares() { return maxShares; }
    public void setMaxShares(int maxShares) { this.maxShares = maxShares; }

    public int getAllocatedShares() { return allocatedShares; }
    public void setAllocatedShares(int allocatedShares) { this.allocatedShares = allocatedShares; }

    public int getRemainingShares() { return remainingShares; }
    public void setRemainingShares(int remainingShares) { this.remainingShares = remainingShares; }

    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }

    public BigDecimal getMeatKg() { return meatKg; }
    public void setMeatKg(BigDecimal meatKg) { this.meatKg = meatKg; }

    public BigDecimal getTotalMeatEntitlementKg() { return totalMeatEntitlementKg; }
    public void setTotalMeatEntitlementKg(BigDecimal totalMeatEntitlementKg) {
        this.totalMeatEntitlementKg = totalMeatEntitlementKg;
    }

    public List<EventSacrificeAnimalShareDTO> getShares() { return shares; }
    public void setShares(List<EventSacrificeAnimalShareDTO> shares) { this.shares = shares; }
}
