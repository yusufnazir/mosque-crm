package com.mosque.crm.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

/**
 * Entity representing the user_roles junction table.
 * Links users to their assigned roles in a many-to-many relationship.
 *
 * Note: This entity is optional - User and Role entities already handle
 * the relationship via @ManyToMany with @JoinTable. Use this entity only
 * if you need to query the junction table directly or add additional metadata.
 */
@Entity
@Table(name = "user_roles")
public class UserRole {

    @EmbeddedId
    private UserRoleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roleId")
    @JoinColumn(name = "role_id")
    private Role role;

    // Constructors
    public UserRole() {
    }

    public UserRole(Long userId, Long roleId) {
        this.id = new UserRoleId(userId, roleId);
    }

    public UserRole(User user, Role role) {
        this.id = new UserRoleId(user.getId(), role.getId());
        this.user = user;
        this.role = role;
    }

    // Getters and Setters
    public UserRoleId getId() {
        return id;
    }

    public void setId(UserRoleId id) {
        this.id = id;
    }

    public Long getUserId() {
        return id != null ? id.getUserId() : null;
    }

    public Long getRoleId() {
        return id != null ? id.getRoleId() : null;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
