package com.mosque.crm.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.enums.EventKind;
import com.mosque.crm.enums.SacrificeAnimalSize;
import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "org_event_sacrifice_animals",
       uniqueConstraints = @UniqueConstraint(
               name = "uq_sacrifice_animal_number",
               columnNames = {"event_kind", "event_id", "animal_number"}))
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class EventSacrificeAnimal implements OrganizationAware {

    @Id
    @TableGenerator(name = "event_sacrifice_animals_seq", table = "sequences_",
            pkColumnName = "PK_NAME", pkColumnValue = "event_sacrifice_animals_seq", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "event_sacrifice_animals_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_kind", nullable = false, length = 20)
    private EventKind eventKind;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "animal_number", nullable = false, length = 50)
    private String animalNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "size", nullable = false, length = 10)
    private SacrificeAnimalSize size;

    @Column(name = "weight_kg", precision = 10, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "meat_kg", precision = 10, scale = 2)
    private BigDecimal meatKg;

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

    public EventKind getEventKind() { return eventKind; }
    public void setEventKind(EventKind eventKind) { this.eventKind = eventKind; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getAnimalNumber() { return animalNumber; }
    public void setAnimalNumber(String animalNumber) { this.animalNumber = animalNumber; }

    public SacrificeAnimalSize getSize() { return size; }
    public void setSize(SacrificeAnimalSize size) { this.size = size; }

    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }

    public BigDecimal getMeatKg() { return meatKg; }
    public void setMeatKg(BigDecimal meatKg) { this.meatKg = meatKg; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public int getMaxShares() {
        return size != null ? size.getMaxShares() : 0;
    }
}
