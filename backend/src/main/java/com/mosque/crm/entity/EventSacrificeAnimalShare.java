package com.mosque.crm.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

@Entity
@Table(name = "org_event_sacrifice_animal_shares")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class EventSacrificeAnimalShare implements OrganizationAware {

    @Id
    @TableGenerator(name = "event_sacrifice_animal_shares_seq", table = "sequences_",
            pkColumnName = "PK_NAME", pkColumnValue = "event_sacrifice_animal_shares_seq", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "event_sacrifice_animal_shares_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "animal_id", nullable = false)
    private EventSacrificeAnimal animal;

    @Column(name = "person_id")
    private Long personId;

    @Column(name = "person_name", nullable = false, length = 255)
    private String personName;

    @Column(name = "is_member", nullable = false)
    private boolean member;

    @Column(name = "share_count", nullable = false)
    private int shareCount;

    @Column(name = "meat_entitlement_kg", precision = 10, scale = 2)
    private BigDecimal meatEntitlementKg;

    @Column(name = "entitlement_received", nullable = false)
    private boolean entitlementReceived;

    @Column(name = "entitlement_received_at")
    private LocalDateTime entitlementReceivedAt;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public EventSacrificeAnimal getAnimal() { return animal; }
    public void setAnimal(EventSacrificeAnimal animal) { this.animal = animal; }

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

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
