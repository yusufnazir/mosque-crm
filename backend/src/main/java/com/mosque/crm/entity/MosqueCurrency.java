package com.mosque.crm.entity;

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
 * MosqueCurrency - Per-mosque active currencies.
 *
 * Each mosque can select which currencies are active for their use.
 * Exactly one currency per mosque should be marked as primary (is_primary = true).
 */
@Entity
@Table(name = "mosque_currencies")
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
public class MosqueCurrency implements MosqueAware {

    @Id
    @TableGenerator(name = "mosque_currencies_seq", table = "sequences_",
            pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "mosque_currencies_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "mosque_id")
    private Long mosqueId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "currency_id", nullable = false)
    private Currency currency;

    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Constructors
    public MosqueCurrency() {
    }

    public MosqueCurrency(Currency currency, Boolean isPrimary) {
        this.currency = currency;
        this.isPrimary = isPrimary;
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

    public Currency getCurrency() {
        return currency;
    }

    public void setCurrency(Currency currency) {
        this.currency = currency;
    }

    public Boolean getIsPrimary() {
        return isPrimary;
    }

    public void setIsPrimary(Boolean isPrimary) {
        this.isPrimary = isPrimary;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
