package com.mosque.crm.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class EventSacrificeAnimalShareCreateDTO {

    private Long personId;

    @NotBlank
    @Size(max = 255)
    private String personName;

    @NotNull
    private Boolean member;

    @NotNull
    @Min(1)
    private Integer shareCount;

    @PositiveOrZero
    private BigDecimal meatEntitlementKg;

    public Long getPersonId() { return personId; }
    public void setPersonId(Long personId) { this.personId = personId; }

    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }

    public Boolean getMember() { return member; }
    public void setMember(Boolean member) { this.member = member; }

    public Integer getShareCount() { return shareCount; }
    public void setShareCount(Integer shareCount) { this.shareCount = shareCount; }

    public BigDecimal getMeatEntitlementKg() { return meatEntitlementKg; }
    public void setMeatEntitlementKg(BigDecimal meatEntitlementKg) { this.meatEntitlementKg = meatEntitlementKg; }
}
