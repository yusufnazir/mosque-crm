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

@Entity
@Table(name = "business_listings")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class BusinessListing implements OrganizationAware {

    public enum Status {
        DRAFT, PENDING_APPROVAL, PUBLISHED, SUSPENDED
    }

    public enum Visibility {
        LOCAL_ONLY, SHARED_WITH_FEDERATION
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(name = "status", nullable = false, length = 30)
    private String status = Status.DRAFT.name();

    @Column(name = "visibility", nullable = false, length = 30)
    private String visibility = Visibility.LOCAL_ONLY.name();

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by_user_id")
    private Long reviewedByUserId;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "federation_hidden", nullable = false)
    private boolean federationHidden = false;

    @Column(name = "federation_hidden_at")
    private LocalDateTime federationHiddenAt;

    @Column(name = "federation_hidden_by_user_id")
    private Long federationHiddenByUserId;

    @Column(name = "federation_hidden_reason", length = 1000)
    private String federationHiddenReason;

    @Column(name = "public_visible", nullable = false)
    private boolean publicVisible = false;

    @Column(name = "suspension_reason", length = 1000)
    private String suspensionReason;

    @Column(name = "suspended_at")
    private LocalDateTime suspendedAt;

    @Column(name = "suspended_by_user_id")
    private Long suspendedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public BusinessListing() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public Long getBusinessId() { return businessId; }
    public void setBusinessId(Long businessId) { this.businessId = businessId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }

    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public Long getReviewedByUserId() { return reviewedByUserId; }
    public void setReviewedByUserId(Long reviewedByUserId) { this.reviewedByUserId = reviewedByUserId; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public boolean isFederationHidden() { return federationHidden; }
    public void setFederationHidden(boolean federationHidden) { this.federationHidden = federationHidden; }

    public LocalDateTime getFederationHiddenAt() { return federationHiddenAt; }
    public void setFederationHiddenAt(LocalDateTime federationHiddenAt) { this.federationHiddenAt = federationHiddenAt; }

    public Long getFederationHiddenByUserId() { return federationHiddenByUserId; }
    public void setFederationHiddenByUserId(Long federationHiddenByUserId) {
        this.federationHiddenByUserId = federationHiddenByUserId;
    }

    public String getFederationHiddenReason() { return federationHiddenReason; }
    public void setFederationHiddenReason(String federationHiddenReason) {
        this.federationHiddenReason = federationHiddenReason;
    }

    public boolean isPublicVisible() { return publicVisible; }
    public void setPublicVisible(boolean publicVisible) { this.publicVisible = publicVisible; }

    public String getSuspensionReason() { return suspensionReason; }
    public void setSuspensionReason(String suspensionReason) { this.suspensionReason = suspensionReason; }

    public LocalDateTime getSuspendedAt() { return suspendedAt; }
    public void setSuspendedAt(LocalDateTime suspendedAt) { this.suspendedAt = suspendedAt; }

    public Long getSuspendedByUserId() { return suspendedByUserId; }
    public void setSuspendedByUserId(Long suspendedByUserId) { this.suspendedByUserId = suspendedByUserId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
