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
 * CommunicationMessage - Represents a sent or draft email communication from the organization to members.
 */
@Entity
@Table(name = "communication_messages")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class CommunicationMessage implements OrganizationAware {

    @Id
    @TableGenerator(name = "communication_messages_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "communication_messages_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "communication_messages_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Column(name = "body_html", nullable = false, columnDefinition = "LONGTEXT")
    private String bodyHtml;

    /**
     * Recipient type: ALL_MEMBERS, ACTIVE_MEMBERS, GROUP, CUSTOM
     */
    @Column(name = "recipient_type", nullable = false, length = 50)
    private String recipientType;

    /**
     * JSON string with additional filter criteria (e.g. group IDs for GROUP type)
     */
    @Column(name = "recipient_filter_json", length = 2000)
    private String recipientFilterJson;

    @Column(name = "total_recipients", nullable = false)
    private Integer totalRecipients = 0;

    /**
     * Status: DRAFT, SENT, FAILED
     */
    @Column(name = "status", nullable = false, length = 30)
    private String status = "DRAFT";

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "template_id")
    private Long templateId;

    @Column(name = "created_by")
    private Long createdBy;

    // Multi-tenancy
    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    public CommunicationMessage() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getRecipientType() {
        return recipientType;
    }

    public void setRecipientType(String recipientType) {
        this.recipientType = recipientType;
    }

    public String getRecipientFilterJson() {
        return recipientFilterJson;
    }

    public void setRecipientFilterJson(String recipientFilterJson) {
        this.recipientFilterJson = recipientFilterJson;
    }

    public Integer getTotalRecipients() {
        return totalRecipients;
    }

    public void setTotalRecipients(Integer totalRecipients) {
        this.totalRecipients = totalRecipients;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public Long getTemplateId() {
        return templateId;
    }

    public void setTemplateId(Long templateId) {
        this.templateId = templateId;
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
