package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

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
 * CommunicationTemplate - Reusable email template for sending communications.
 */
@Entity
@Table(name = "communication_templates")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class CommunicationTemplate implements OrganizationAware {

    @Id
    @TableGenerator(name = "communication_templates_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "communication_templates_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "communication_templates_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Column(name = "body_html", nullable = false, columnDefinition = "LONGTEXT")
    private String bodyHtml;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "created_by")
    private Long createdBy;

    // Multi-tenancy
    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    public CommunicationTemplate() {
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

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getBodyHtml() {
        return bodyHtml;
    }

    public void setBodyHtml(String bodyHtml) {
        this.bodyHtml = bodyHtml;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Boolean getIsDefault() {
        return isDefault;
    }

    public void setIsDefault(Boolean isDefault) {
        this.isDefault = isDefault;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
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

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
