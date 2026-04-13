package com.mosque.crm.entity;

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
@Table(name = "parcel_categories")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class ParcelCategory implements OrganizationAware {

    @Id
    @TableGenerator(name = "parcel_categories_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "parcel_categories_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "parcel_categories_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "distribution_event_id", nullable = false)
    private DistributionEvent distributionEvent;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "total_parcels", nullable = false)
    private int totalParcels;

    @Column(name = "distributed_parcels", nullable = false)
    private int distributedParcels;

    @Column(name = "non_member_allocation", nullable = false)
    private int nonMemberAllocation;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "organization_id")
    private Long organizationId;

    public ParcelCategory() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public DistributionEvent getDistributionEvent() {
        return distributionEvent;
    }

    public void setDistributionEvent(DistributionEvent distributionEvent) {
        this.distributionEvent = distributionEvent;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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

    public int getNonMemberAllocation() {
        return nonMemberAllocation;
    }

    public void setNonMemberAllocation(int nonMemberAllocation) {
        this.nonMemberAllocation = nonMemberAllocation;
    }

    public int getRemainingParcels() {
        return totalParcels - distributedParcels;
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
}
