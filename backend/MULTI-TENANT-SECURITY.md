# Gold Standard Multi-Tenant Authorization Model

### (RBAC + Delegated Administration + Capability Safety)

---

# 1. Purpose

This document defines a **production-grade, reusable authorization model** for multi-tenant applications.

It combines:

* RBAC (Role-Based Access Control)
* Delegated Administration (role & permission governance)
* Capability-based anti-escalation (no role levels)

This design ensures:

* No privilege escalation
* Safe delegation
* Multi-tenant isolation
* Flexibility without hierarchy constraints

---

# 2. Core Principles

## 2.1 Separation of Concerns

| Concern               | Table                         |
| --------------------- | ----------------------------- |
| Runtime authorization | `role_permissions`            |
| Permission governance | `role_assignable_permissions` |
| Role governance       | `role_assignable_roles`       |

---

## 2.2 No Hierarchy (No Levels)

Authority is defined by:

* What roles you can assign
* What privileges you can grant

NOT by rank.

---

## 2.3 Capability Safety Rule (CRITICAL)

> A role can only grant roles and permissions that are fully contained within its own assignable privilege pool.

---

# 3. Database Schema (Multi-Tenant)

---

## 3.1 Tenant

```sql
Tenant (
    id              BIGINT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL
);
```

---

## 3.2 User

```sql
User (
    id              BIGINT PRIMARY KEY,
    username        VARCHAR(255) UNIQUE NOT NULL,
    active          BOOLEAN NOT NULL
);
```

---

## 3.3 UserTenant

```sql
UserTenant (
    user_id         BIGINT,
    tenant_id       BIGINT,
    PRIMARY KEY (user_id, tenant_id)
);
```

---

## 3.4 Role (Tenant Scoped)

```sql
Role (
    id              BIGINT PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    name            VARCHAR(100) NOT NULL
);
```

---

## 3.5 Permission

```sql
Permission (
    id              BIGINT PRIMARY KEY,
    code            VARCHAR(150) UNIQUE NOT NULL,
    description     VARCHAR(255)
);
```

---

## 3.6 User Roles

```sql
UserRole (
    user_id         BIGINT,
    tenant_id       BIGINT,
    role_id         BIGINT,
    PRIMARY KEY (user_id, tenant_id, role_id)
);
```

---

## 3.7 Effective Permissions

```sql
RolePermission (
    role_id         BIGINT,
    permission_id   BIGINT,
    PRIMARY KEY (role_id, permission_id)
);
```

---

## 3.8 Assignable Permission Pool

```sql
RoleAssignablePermission (
    role_id         BIGINT,
    permission_id   BIGINT,
    PRIMARY KEY (role_id, permission_id)
);
```

---

## 3.9 Assignable Role Pool

```sql
RoleAssignableRole (
    role_id                BIGINT,
    assignable_role_id     BIGINT,
    PRIMARY KEY (role_id, assignable_role_id)
);
```

---

# 4. Runtime Authorization

## 4.1 Flow

1. Get user roles (`UserRole`)
2. Get permissions (`RolePermission`)
3. Union all permissions
4. Check required permission

---

# 5. Governance Rules (MANDATORY)

---

## Rule A: Tenant Isolation

```text
All operations must be scoped by tenant_id
```

---

## Rule B: Permission Assignment

```text
New role permissions ⊆ actor.assignable_permissions
```

---

## Rule C: Role Assignment (CRITICAL)

```text
Actor can assign role R ONLY IF:

1. R ∈ actor.assignable_roles
AND
2. permissions(R) ⊆ actor.assignable_permissions
```

---

## Rule D: User Modification

```text
Actor can modify target user ONLY IF:

ALL roles of target user ∈ actor.assignable_roles
```

---

## Rule E: Role Removal Safety

```text
Actor cannot remove a role unless it is in assignable_roles
```

---

## Rule F: Pool Management Anti-Escalation

```text
Actor can modify assignable pools ONLY IF:

Changes ⊆ actor.assignable_permissions
AND
Roles affected ⊆ actor.assignable_roles
```

---

# 6. Java Service Layer (Reference)

---

## 6.1 Helper Methods

```java
Set<Role> getUserRoles(User user, Long tenantId);
Set<Role> getUserAssignableRoles(User user, Long tenantId);
Set<Permission> getUserAssignablePermissions(User user, Long tenantId);
Set<Permission> getRolePermissions(Role role);
```

---

## 6.2 canAssignRole

```java
public boolean canAssignRole(User actor, Role targetRole, Long tenantId) {

    if (!targetRole.getTenantId().equals(tenantId)) return false;

    Set<Role> assignableRoles = getUserAssignableRoles(actor, tenantId);
    if (!assignableRoles.contains(targetRole)) return false;

    Set<Permission> assignablePerms = getUserAssignablePermissions(actor, tenantId);
    Set<Permission> targetPerms = getRolePermissions(targetRole);

    return assignablePerms.containsAll(targetPerms);
}
```

---

## 6.3 canModifyUser

```java
public boolean canModifyUser(User actor, User target, Long tenantId) {

    Set<Role> assignableRoles = getUserAssignableRoles(actor, tenantId);
    Set<Role> targetRoles = getUserRoles(target, tenantId);

    for (Role role : targetRoles) {
        if (!assignableRoles.contains(role)) {
            return false;
        }
    }
    return true;
}
```

---

## 6.4 canRemoveRole

```java
public boolean canRemoveRole(User actor, Role role, Long tenantId) {

    Set<Role> assignableRoles = getUserAssignableRoles(actor, tenantId);
    return assignableRoles.contains(role);
}
```

---

## 6.5 canCreateOrUpdateRole

```java
public boolean canCreateOrUpdateRole(User actor,
                                     Set<Permission> newPermissions,
                                     Long tenantId) {

    Set<Permission> assignablePerms = getUserAssignablePermissions(actor, tenantId);
    return assignablePerms.containsAll(newPermissions);
}
```

---

# 7. Governance Permissions (Recommended)

Define permissions like:

```text
security.user_roles.manage
security.role_permissions.manage
security.role_pool.manage
security.permission_pool.manage
```

These control access to governance APIs.

---

# 8. API Pattern

## Read

```
GET /tenants/{tenantId}/users/{id}/roles
```

## Write

```
PUT /tenants/{tenantId}/users/{id}/roles
```

### Validation:

* Must have `security.user_roles.manage`
* Each role must pass `canAssignRole`

---

# 9. Audit (Strongly Recommended)

Log all:

* Role assignments
* Permission changes
* Pool changes

Fields:

* actor
* target
* action
* timestamp
* before/after

---

# 10. Common Pitfalls

❌ Using assignable permissions for runtime checks
❌ Skipping subset validation
❌ Allowing pool changes without validation
❌ Not enforcing tenant boundaries
❌ Trusting frontend

---

# 11. Final Summary

This model provides:

✅ Multi-tenant isolation
✅ Delegated administration
✅ No artificial hierarchy
✅ Strong anti-escalation guarantees

---

## Core Rule (The Heart of the System)

> A user can only assign roles and permissions that are fully contained within their assignable privilege scope.

---

This makes the system:

* Flexible like modern SaaS platforms
* Safe against misconfiguration
* Easy to extend and reuse

---
