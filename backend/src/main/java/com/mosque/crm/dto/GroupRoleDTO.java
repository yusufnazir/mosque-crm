package com.mosque.crm.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for GroupRole - a predefined, translatable role within a group.
 */
public class GroupRoleDTO {

    private Long id;
    private Long groupId;
    private String name;
    private Integer sortOrder;
    private Integer maxMembers;
    private Boolean isActive;
    private Long organizationId;
    private LocalDateTime createdAt;
    private List<GroupRoleTranslationDTO> translations;

    public GroupRoleDTO() {
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getGroupId() {
        return groupId;
    }

    public void setGroupId(Long groupId) {
        this.groupId = groupId;
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

    public Long getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(Long organizationId) {
        this.organizationId = organizationId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<GroupRoleTranslationDTO> getTranslations() {
        return translations;
    }

    public void setTranslations(List<GroupRoleTranslationDTO> translations) {
        this.translations = translations;
    }
}
