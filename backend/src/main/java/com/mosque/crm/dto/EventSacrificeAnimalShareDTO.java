package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class EventSacrificeAnimalShareDTO {

    private Long id;
    private Long animalId;
    private Long personId;
    private String personName;
    private boolean member;
    private int shareCount;
    private BigDecimal meatEntitlementKg;
    private boolean entitlementReceived;
    private LocalDateTime entitlementReceivedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getAnimalId() { return animalId; }
    public void setAnimalId(Long animalId) { this.animalId = animalId; }

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }

    public boolean isMember() { return member; }
    public void setMember(boolean member) { this.member = member; }

    public int getShareCount() { return shareCount; }
    public void setShareCount(int shareCount) { this.shareCount = shareCount; }

    public BigDecimal getMeatEntitlementKg() { return meatEntitlementKg; }
    public void setMeatEntitlementKg(BigDecimal meatEntitlementKg) { this.meatEntitlementKg = meatEntitlementKg; }

    public boolean isEntitlementReceived() { return entitlementReceived; }
    public void setEntitlementReceived(boolean entitlementReceived) { this.entitlementReceived = entitlementReceived; }

    public LocalDateTime getEntitlementReceivedAt() { return entitlementReceivedAt; }
    public void setEntitlementReceivedAt(LocalDateTime entitlementReceivedAt) { this.entitlementReceivedAt = entitlementReceivedAt; }
}
