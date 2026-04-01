# Two-Tier Security Model Template

## Purpose
This document is project-agnostic and can be reused across applications that implement role-based access control with delegation.

It defines a two-tier model:
1. Assignable permission pool per role.
2. Effective permissions per role.

Optional extension:
1. Assignable role pool per role.

## Core Concepts

### Tier 1: Assignable Permission Pool
This pool controls what a role is allowed to grant or revoke on other roles.

This is governance logic, not runtime authorization.

### Tier 2: Effective Role Permissions
This defines what a role can actually do at runtime.

Authorization checks should read only from effective permissions.

### Optional: Assignable Role Pool
This controls which target roles a source role is allowed to assign or remove from users.

## Recommended Tables
Use equivalent entities/tables in your stack:

1. users
2. roles
3. permissions
4. user_roles
5. role_permissions
6. role_assignable_permissions
7. role_assignable_roles (optional but recommended)

## Runtime Authorization Flow
1. Authenticate user.
2. Resolve user roles.
3. Resolve effective permissions from role_permissions.
4. Authorize endpoint or action based on required permission codes.

## Governance Flows

### A. Modify role effective permissions
When actor A grants or revokes permission P for role R:
1. Verify actor has governance permission to manage role permissions.
2. Verify actor is allowed to manage target role R.
3. Verify permission P is inside actor assignable permission pool.
4. Apply change to role_permissions.

### B. Modify assignable permission pool
When actor A updates role R assignable pool:
1. Verify actor has governance permission to manage permission pools.
2. Verify actor is allowed to manage role R.
3. Enforce anti-escalation: actor may only delegate permissions actor can delegate.
4. Apply change to role_assignable_permissions.

### C. Assign or remove user roles
When actor A assigns role T to user U:
1. Verify actor has governance permission to manage user-role assignments.
2. Verify target role T is inside actor assignable role pool.
3. Optionally verify actor can manage existing target user roles.
4. Apply change to user_roles.

### D. Modify assignable role pool
When actor A updates assignable roles for role R:
1. Verify actor has governance permission to manage role pools.
2. Verify actor is allowed to manage role R.
3. Enforce anti-escalation: actor may only delegate roles actor can delegate.
4. Apply change to role_assignable_roles.

## Server-Side Enforcement Rules
Always enforce governance and authorization on the backend.

Do not rely on frontend visibility, disabled controls, or hidden routes.

Minimum rules:
1. Every mutation endpoint must check effective permissions.
2. Pool-based checks must run server-side.
3. Reject unauthorized mutations with explicit forbidden errors.
4. Keep auditability for who changed roles and permissions.

## Suggested Permission Codes
Use your naming convention, but keep intent clear:

1. security.role_permissions.view
2. security.role_permissions.manage
3. security.pool.view
4. security.pool.manage
5. security.role_pool.view
6. security.role_pool.manage
7. security.user_roles.view
8. security.user_roles.manage

## Superadmin Pattern
Common strategy:
1. Superadmin bypasses most governance restrictions.
2. Superadmin can view or operate globally.
3. Optionally support tenant scoping header or context for superadmin.

Document your exact bypass boundaries to avoid ambiguity.

## Tenant-Aware Pattern (Optional)
For multi-tenant systems:
1. Resolve current tenant context per request.
2. Scope role links and permission queries by tenant.
3. Define behavior when tenant context is missing.
4. Treat superadmin behavior explicitly (global or scoped).

## API Contract Template

### Self context
1. GET /me/permissions
2. GET /me/assignablePermissions
3. GET /me/assignableRoleIds

### Role effective permissions
1. GET /rolePermissions/byRole/{roleId}
2. PUT /rolePermissions/grant/{roleId}/{permissionId}
3. DELETE /rolePermissions/revoke/{roleId}/{permissionId}
4. PUT /rolePermissions/setPermissions/{roleId}

### Assignable permission pool
1. GET /roleAssignablePermissions/byRole/{roleId}
2. PUT /roleAssignablePermissions/add/{roleId}/{permissionId}
3. DELETE /roleAssignablePermissions/remove/{roleId}/{permissionId}
4. PUT /roleAssignablePermissions/setPool/{roleId}

### Assignable role pool
1. GET /roleAssignableRoles/byRole/{roleId}
2. PUT /roleAssignableRoles/add/{roleId}/{assignableRoleId}
3. DELETE /roleAssignableRoles/remove/{roleId}/{assignableRoleId}
4. PUT /roleAssignableRoles/setPool/{roleId}

### User-role assignment
1. PUT /userRoles/add
2. PUT /userRoles/remove
3. GET /userRoles/byUser/{userId}

## Error Contract Template
Use structured errors for policy violations.

Example:

```json
{
  "code": "ROLE_POOL_VIOLATION",
  "message": "One or more requested role changes are not allowed.",
  "blockedRoleIds": [1001, 1005]
}
```

## Implementation Checklist

### Data
- [ ] Create role and permission link tables.
- [ ] Add uniqueness constraints on join combinations.
- [ ] Add indexes for role and permission foreign keys.

### Authorization
- [ ] Build effective permission resolver.
- [ ] Use effective permissions for runtime authorization.

### Governance
- [ ] Enforce assignable permission pool on permission delegation.
- [ ] Enforce assignable role pool on role assignment.
- [ ] Add anti-escalation checks for pool modifications.

### API
- [ ] Provide self-context endpoints for frontend gating.
- [ ] Provide role/pool mutation endpoints with strict backend checks.

### Seed Data
- [ ] Seed baseline governance permissions.
- [ ] Seed superadmin role and baseline capabilities.
- [ ] Seed default role templates if your product needs tenant bootstrap.

## Common Pitfalls
1. Using assignable pool for runtime checks.
2. Missing anti-escalation checks.
3. Frontend-only enforcement.
4. Silent filtering of unauthorized mutations without explicit error reporting.
5. Inconsistent permission code naming between seed data and controller checks.

## Reuse Guidance
To reuse this document in any project:
1. Keep this file as a canonical template.
2. Create a separate implementation-status document for project-specific mappings.
3. Link template section names to concrete files, endpoints, and seed scripts in that separate document.

This keeps architecture guidance stable while allowing each project to track its own implementation details independently.