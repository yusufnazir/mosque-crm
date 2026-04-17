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
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

/**
 * SavedMemberFilter - A user-saved set of filter criteria for the members list.
 * Scoped per user + organization. Gated by the member.saved_filters plan entitlement.
 */
@Entity
@Table(name = "saved_member_filters")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class SavedMemberFilter implements OrganizationAware {

    @Id
    @TableGenerator(name = "saved_member_filters_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "saved_member_filters_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "saved_member_filters_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "filter_json", nullable = false, columnDefinition = "TEXT")
    private String filterJson;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public SavedMemberFilter() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFilterJson() {
        return filterJson;
    }

    public void setFilterJson(String filterJson) {
        this.filterJson = filterJson;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public void setDefault(boolean isDefault) {
        this.isDefault = isDefault;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(Long createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    @Override
    public Long getOrganizationId() {
        return organizationId;
    }

    @Override
    public void setOrganizationId(Long organizationId) {
        this.organizationId = organizationId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
