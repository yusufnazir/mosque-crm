package com.mosque.crm.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.mosque.crm.enums.ExemptionType;
import com.mosque.crm.multitenancy.MosqueAware;
import com.mosque.crm.multitenancy.MosqueEntityListener;

import org.hibernate.annotations.Filter;

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
import jakarta.validation.constraints.NotNull;

/**
 * MemberContributionExemption - Defines exemptions or discounts for specific
 * members on specific contribution types.
 *
 * Exemption types:
 * - FULL: Member is fully exempt (pays nothing)
 * - FIXED_AMOUNT: Member pays this fixed amount instead of the obligation amount
 * - DISCOUNT_AMOUNT: A fixed amount is subtracted from the obligation
 * - DISCOUNT_PERCENTAGE: A percentage discount off the obligation (0-100)
 */
@Entity
@Table(name = "member_contribution_exemptions")
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
public class MemberContributionExemption implements MosqueAware {

    @Id
    @TableGenerator(name = "member_contribution_exemptions_seq", table = "sequences_",
            pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "member_contribution_exemptions_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contribution_type_id", nullable = false)
    private ContributionType contributionType;

    @NotNull(message = "Exemption type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "exemption_type", nullable = false, length = 30)
    private ExemptionType exemptionType;

    @Column(name = "amount", precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "reason", length = 500)
    private String reason;

    @NotNull(message = "Start date is required")
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // Multi-tenancy
    @Column(name = "mosque_id")
    private Long mosqueId;

    // Constructors
    public MemberContributionExemption() {
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }

    public ContributionType getContributionType() { return contributionType; }
    public void setContributionType(ContributionType contributionType) { this.contributionType = contributionType; }

    public ExemptionType getExemptionType() { return exemptionType; }
    public void setExemptionType(ExemptionType exemptionType) { this.exemptionType = exemptionType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    @Override
    public Long getMosqueId() { return mosqueId; }
    @Override
    public void setMosqueId(Long mosqueId) { this.mosqueId = mosqueId; }

    /**
     * Check if this exemption is currently in effect.
     */
    public boolean isCurrentlyActive() {
        if (!Boolean.TRUE.equals(isActive)) return false;
        LocalDate now = LocalDate.now();
        if (now.isBefore(startDate)) return false;
        if (endDate != null && now.isAfter(endDate)) return false;
        return true;
    }
}
