package com.mosque.crm.entity;

import java.math.BigDecimal;
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

/**
 * ExchangeRate - Per-mosque exchange rates between currencies.
 *
 * Stores the conversion rate from one currency to another,
 * effective from a given date. Mosque-scoped for multi-tenancy.
 */
@Entity
@Table(name = "exchange_rates")
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
public class ExchangeRate implements MosqueAware {

    @Id
    @TableGenerator(name = "exchange_rates_seq", table = "sequences_",
            pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "exchange_rates_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "mosque_id")
    private Long mosqueId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "from_currency_id", nullable = false)
    private Currency fromCurrency;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "to_currency_id", nullable = false)
    private Currency toCurrency;

    @Column(name = "rate", nullable = false, precision = 18, scale = 8)
    private BigDecimal rate;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Constructors
    public ExchangeRate() {
    }

    public ExchangeRate(Currency fromCurrency, Currency toCurrency, BigDecimal rate, LocalDate effectiveDate) {
        this.fromCurrency = fromCurrency;
        this.toCurrency = toCurrency;
        this.rate = rate;
        this.effectiveDate = effectiveDate;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public Long getMosqueId() {
        return mosqueId;
    }

    @Override
    public void setMosqueId(Long mosqueId) {
        this.mosqueId = mosqueId;
    }

    public Currency getFromCurrency() {
        return fromCurrency;
    }

    public void setFromCurrency(Currency fromCurrency) {
        this.fromCurrency = fromCurrency;
    }

    public Currency getToCurrency() {
        return toCurrency;
    }

    public void setToCurrency(Currency toCurrency) {
        this.toCurrency = toCurrency;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public void setRate(BigDecimal rate) {
        this.rate = rate;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public void setEffectiveDate(LocalDate effectiveDate) {
        this.effectiveDate = effectiveDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
