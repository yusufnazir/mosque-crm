package com.mosque.crm.entity;

import java.math.BigDecimal;
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

/**
 * A registrant's answer to a {@link GeneralEventQuestion}.
 * <ul>
 *   <li>SINGLE_CHOICE → one row with {@code option}</li>
 *   <li>MULTI_CHOICE → one row per selected {@code option}</li>
 *   <li>FREE_TEXT → one row with {@code freeText}</li>
 * </ul>
 * Optional questions answered blank have no rows at all.
 */
@Entity
@Table(name = "org_general_event_registration_answers")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class GeneralEventRegistrationAnswer implements OrganizationAware {

    @Id
    @TableGenerator(name = "general_event_reg_answers_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "general_event_reg_answers_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "general_event_reg_answers_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registration_id", nullable = false)
    private GeneralEventRegistration registration;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private GeneralEventQuestion question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id")
    private GeneralEventQuestionOption option;

    @Column(name = "free_text", length = 1000)
    private String freeText;

    /** Numeric value for {@code NUMBER} questions (e.g. party size). */
    @Column(name = "numeric_value", precision = 12, scale = 2)
    private BigDecimal numericValue;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public GeneralEventRegistrationAnswer() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public GeneralEventRegistration getRegistration() { return registration; }
    public void setRegistration(GeneralEventRegistration registration) { this.registration = registration; }

    public GeneralEventQuestion getQuestion() { return question; }
    public void setQuestion(GeneralEventQuestion question) { this.question = question; }

    public GeneralEventQuestionOption getOption() { return option; }
    public void setOption(GeneralEventQuestionOption option) { this.option = option; }

    public String getFreeText() { return freeText; }
    public void setFreeText(String freeText) { this.freeText = freeText; }

    public BigDecimal getNumericValue() { return numericValue; }
    public void setNumericValue(BigDecimal numericValue) { this.numericValue = numericValue; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
