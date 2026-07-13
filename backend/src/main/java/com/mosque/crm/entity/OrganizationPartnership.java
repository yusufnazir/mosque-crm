package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Explicit partnership between a parent (federation) organization and a member organization.
 * Not tenant-filtered — access is enforced in the service layer by org role in the partnership.
 */
@Entity
@Table(name = "organization_partnerships")
public class OrganizationPartnership {

    public enum Status {
        PENDING_INVITE, PENDING_REQUEST, ACTIVE, SUSPENDED, ENDED
    }

    public enum InitiatedBy {
        PARENT, MEMBER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "parent_organization_id", nullable = false)
    private Long parentOrganizationId;

    @Column(name = "member_organization_id", nullable = false)
    private Long memberOrganizationId;

    @Column(name = "status", nullable = false, length = 30)
    private String status = Status.PENDING_INVITE.name();

    @Column(name = "initiated_by", nullable = false, length = 20)
    private String initiatedBy;

    @Column(name = "message", length = 1000)
    private String message;

    @Column(name = "ended_reason", length = 500)
    private String endedReason;

    @Column(name = "initiated_at", nullable = false)
    private LocalDateTime initiatedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "ended_by_user_id")
    private Long endedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public OrganizationPartnership() {
        this.initiatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getParentOrganizationId() { return parentOrganizationId; }
    public void setParentOrganizationId(Long parentOrganizationId) { this.parentOrganizationId = parentOrganizationId; }

    public Long getMemberOrganizationId() { return memberOrganizationId; }
    public void setMemberOrganizationId(Long memberOrganizationId) { this.memberOrganizationId = memberOrganizationId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getInitiatedBy() { return initiatedBy; }
    public void setInitiatedBy(String initiatedBy) { this.initiatedBy = initiatedBy; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getEndedReason() { return endedReason; }
    public void setEndedReason(String endedReason) { this.endedReason = endedReason; }

    public LocalDateTime getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(LocalDateTime initiatedAt) { this.initiatedAt = initiatedAt; }

    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }

    public LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }

    public Long getEndedByUserId() { return endedByUserId; }
    public void setEndedByUserId(Long endedByUserId) { this.endedByUserId = endedByUserId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
