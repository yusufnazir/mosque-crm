package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.enums.RegistrationFulfillmentMode;
import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

@Entity
@Table(name = "org_distribution_registration_types")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class DistributionRegistrationType implements OrganizationAware {

    @Id
    @TableGenerator(name = "distribution_registration_types_seq", table = "sequences_",
            pkColumnName = "PK_NAME", pkColumnValue = "distribution_registration_types_seq",
            valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "distribution_registration_types_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private DistributionEvent distributionEvent;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_mode", nullable = false, length = 20)
    private RegistrationFulfillmentMode fulfillmentMode = RegistrationFulfillmentMode.QUEUE;

    @Column(name = "default_planned_parcels", nullable = false)
    private int defaultPlannedParcels = 1;

    @Column(name = "soft_limit")
    private Integer softLimit;

    @Column(name = "assign_distribution_number", nullable = false)
    private boolean assignDistributionNumber;

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

    public DistributionEvent getDistributionEvent() { return distributionEvent; }
    public void setDistributionEvent(DistributionEvent distributionEvent) { this.distributionEvent = distributionEvent; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public RegistrationFulfillmentMode getFulfillmentMode() { return fulfillmentMode; }
    public void setFulfillmentMode(RegistrationFulfillmentMode fulfillmentMode) { this.fulfillmentMode = fulfillmentMode; }

    public int getDefaultPlannedParcels() { return defaultPlannedParcels; }
    public void setDefaultPlannedParcels(int defaultPlannedParcels) { this.defaultPlannedParcels = defaultPlannedParcels; }

    public Integer getSoftLimit() { return softLimit; }
    public void setSoftLimit(Integer softLimit) { this.softLimit = softLimit; }

    public boolean isAssignDistributionNumber() { return assignDistributionNumber; }
    public void setAssignDistributionNumber(boolean assignDistributionNumber) {
        this.assignDistributionNumber = assignDistributionNumber;
    }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
