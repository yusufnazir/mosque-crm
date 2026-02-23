package com.mosque.crm.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import com.mosque.crm.multitenancy.MosqueAware;
import com.mosque.crm.multitenancy.MosqueEntityListener;

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
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;

/**
 * MemberContributionAssignment - Links a member (person) to a required
 * contribution type, indicating they are obligated to pay it.
 *
 * Only required contribution types should have assignments.
 * A person can be assigned to multiple required types.
 * The combination of person_id + contribution_type_id must be unique.
 */
@Entity
@Table(name = "member_contribution_assignments",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_member_contribution_assignment",
           columnNames = {"person_id", "contribution_type_id"}))
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
public class MemberContributionAssignment implements MosqueAware {

    @Id
    @TableGenerator(name = "member_contribution_assignments_seq", table = "sequences_",
            pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "member_contribution_assignments_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @NotNull(message = "Person is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @NotNull(message = "Contribution type is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contribution_type_id", nullable = false)
    private ContributionType contributionType;

    @NotNull(message = "Start date is required")
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "mosque_id")
    private Long mosqueId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    // Constructors
    public MemberContributionAssignment() {
    }

    public MemberContributionAssignment(Person person, ContributionType contributionType,
                                         LocalDate startDate) {
        this.person = person;
        this.contributionType = contributionType;
        this.startDate = startDate;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Person getPerson() {
        return person;
    }

    public void setPerson(Person person) {
        this.person = person;
    }

    public ContributionType getContributionType() {
        return contributionType;
    }

    public void setContributionType(ContributionType contributionType) {
        this.contributionType = contributionType;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    @Override
    public Long getMosqueId() {
        return mosqueId;
    }

    @Override
    public void setMosqueId(Long mosqueId) {
        this.mosqueId = mosqueId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
