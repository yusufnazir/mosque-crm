package com.mosque.crm.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.mosque.crm.enums.ContributionFrequency;
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
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/**
 * ContributionObligation - Defines the required amount and frequency
 * for a required ContributionType.
 *
 * Only required contribution types should have an obligation.
 * Optional types must NOT have obligations.
 * A required type can have multiple obligations over time (for history tracking).
 */
@Entity
@Table(name = "contribution_obligations")
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
public class ContributionObligation implements MosqueAware {

    @Id
    @TableGenerator(name = "contribution_obligations_seq", table = "sequences_",
            pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "contribution_obligations_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contribution_type_id", nullable = false)
    private ContributionType contributionType;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than 0")
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @NotNull(message = "Frequency is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 20)
    private ContributionFrequency frequency;

    @NotNull(message = "Start date is required")
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "currency_id")
    private Currency currency;

    // Multi-tenancy
    @Column(name = "mosque_id")
    private Long mosqueId;

    // Constructors
    public ContributionObligation() {
    }

    public ContributionObligation(ContributionType contributionType, BigDecimal amount,
                                   ContributionFrequency frequency, LocalDate startDate) {
        this.contributionType = contributionType;
        this.amount = amount;
        this.frequency = frequency;
        this.startDate = startDate;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ContributionType getContributionType() {
        return contributionType;
    }

    public void setContributionType(ContributionType contributionType) {
        this.contributionType = contributionType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public ContributionFrequency getFrequency() {
        return frequency;
    }

    public void setFrequency(ContributionFrequency frequency) {
        this.frequency = frequency;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public Currency getCurrency() {
        return currency;
    }

    public void setCurrency(Currency currency) {
        this.currency = currency;
    }

    @Override
    public Long getMosqueId() {
        return mosqueId;
    }

    @Override
    public void setMosqueId(Long mosqueId) {
        this.mosqueId = mosqueId;
    }

    // Utility methods
    public boolean isCurrentlyActive() {
        LocalDate now = LocalDate.now();
        return !now.isBefore(startDate);
    }
}
