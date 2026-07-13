package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_notifications")
public class UserNotification {

    public static final class Types {
        public static final String PARTNERSHIP_INVITE = "PARTNERSHIP_INVITE";
        public static final String PARTNERSHIP_REQUEST = "PARTNERSHIP_REQUEST";
        public static final String PARTNERSHIP_ACTIVE = "PARTNERSHIP_ACTIVE";
        public static final String PARTNERSHIP_REJECTED = "PARTNERSHIP_REJECTED";
        public static final String PARTNERSHIP_SUSPENDED = "PARTNERSHIP_SUSPENDED";
        public static final String PARTNERSHIP_REACTIVATED = "PARTNERSHIP_REACTIVATED";
        public static final String PARTNERSHIP_ENDED = "PARTNERSHIP_ENDED";
        public static final String BUSINESS_PENDING = "BUSINESS_PENDING";
        public static final String BUSINESS_APPROVED = "BUSINESS_APPROVED";
        public static final String BUSINESS_REJECTED = "BUSINESS_REJECTED";
        public static final String BUSINESS_SUSPENDED = "BUSINESS_SUSPENDED";

        private Types() {
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "organization_id")
    private Long organizationId;

    @Column(name = "type", nullable = false, length = 80)
    private String type;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "body", length = 1000)
    private String body;

    @Column(name = "link_path", length = 500)
    private String linkPath;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getLinkPath() { return linkPath; }
    public void setLinkPath(String linkPath) { this.linkPath = linkPath; }

    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public boolean isRead() {
        return readAt != null;
    }
}
