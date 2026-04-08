package com.mosque.crm.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.enums.DistributionEventStatus;
import com.mosque.crm.enums.OrganizationEventType;
import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

@Entity
@Table(name = "distribution_events")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class DistributionEvent implements OrganizationAware {

    @Id
    @TableGenerator(name = "distribution_events_seq", table = "sequences_", pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "distribution_events_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "year", nullable = false)
    private int year;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(name = "location", length = 500)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DistributionEventStatus status = DistributionEventStatus.PLANNED;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private OrganizationEventType eventType = OrganizationEventType.EID_UL_ADHA_DISTRIBUTION;

    @Column(name = "member_capacity", nullable = false)
    private int memberCapacity = 0;

    @Column(name = "non_member_capacity", nullable = false)
    private int nonMemberCapacity = 0;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "organization_id")
    private Long organizationId;

    @OneToMany(mappedBy = "distributionEvent", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ParcelCategory> parcelCategories = new ArrayList<>();

    public DistributionEvent() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDate getEventDate() {
        return eventDate;
    }

    public void setEventDate(LocalDate eventDate) {
        this.eventDate = eventDate;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public DistributionEventStatus getStatus() {
        return status;
    }

    public void setStatus(DistributionEventStatus status) {
        this.status = status;
    }

    public OrganizationEventType getEventType() {
        return eventType;
    }

    public void setEventType(OrganizationEventType eventType) {
        this.eventType = eventType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public Long getOrganizationId() {
        return organizationId;
    }

    @Override
    public void setOrganizationId(Long organizationId) {
        this.organizationId = organizationId;
    }

    public int getMemberCapacity() {
        return memberCapacity;
    }

    public void setMemberCapacity(int memberCapacity) {
        this.memberCapacity = memberCapacity;
    }

    public int getNonMemberCapacity() {
        return nonMemberCapacity;
    }

    public void setNonMemberCapacity(int nonMemberCapacity) {
        this.nonMemberCapacity = nonMemberCapacity;
    }

    public List<ParcelCategory> getParcelCategories() {
        return parcelCategories;
    }

    public void setParcelCategories(List<ParcelCategory> parcelCategories) {
        this.parcelCategories = parcelCategories;
    }
}
