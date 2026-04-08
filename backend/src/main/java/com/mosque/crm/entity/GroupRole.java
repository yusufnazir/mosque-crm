package com.mosque.crm.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

/**
 * GroupRole - Represents a predefined role within a group (e.g., Chairman, Secretary).
 * Roles have translatable names (via GroupRoleTranslation).
 */
@Entity
@Table(name = "group_roles")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class GroupRole implements OrganizationAware {

    @Id
    @TableGenerator(name = "group_roles_seq", table = "sequences_",
            pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "group_roles_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(name = "max_members")
    private Integer maxMembers;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "groupRole", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<GroupRoleTranslation> translations = new ArrayList<>();

    // Constructors
    public GroupRole() {
    }

    public GroupRole(String name) {
        this.name = name;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Group getGroup() {
        return group;
    }

    public void setGroup(Group group) {
        this.group = group;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Integer getMaxMembers() {
        return maxMembers;
    }

    public void setMaxMembers(Integer maxMembers) {
        this.maxMembers = maxMembers;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
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

    public List<GroupRoleTranslation> getTranslations() {
        return translations;
    }

    public void setTranslations(List<GroupRoleTranslation> translations) {
        this.translations = translations;
    }

    // Helper methods
    public void addTranslation(GroupRoleTranslation translation) {
        translations.add(translation);
        translation.setGroupRole(this);
    }

    public void removeTranslation(GroupRoleTranslation translation) {
        translations.remove(translation);
        translation.setGroupRole(null);
    }

    /**
     * Get the translation for a given locale, falling back to "en" if not found.
     */
    public GroupRoleTranslation getTranslation(String locale) {
        return translations.stream()
                .filter(t -> t.getLocale().equals(locale))
                .findFirst()
                .orElseGet(() -> translations.stream()
                        .filter(t -> t.getLocale().equals("en"))
                        .findFirst()
                        .orElse(null));
    }
}
