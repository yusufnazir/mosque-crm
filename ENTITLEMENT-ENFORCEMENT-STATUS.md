# Entitlement Enforcement Status

Tracks which plan feature keys are enforced in the backend and/or hidden in the frontend.
Check off items as enforcement is implemented.

## Infrastructure

- **Backend**: `@PlanFeatureRequired("key")` AOP annotation (method or class-level) → HTTP 403 if disabled.
  Manual limit checks via `organizationSubscriptionService.getFeatureLimit()` for count-based limits.
- **Frontend**: `hasFeature("key")` from `SubscriptionContext` — used to hide Sidebar nav items and gate UI actions.

---

## Existing Feature Keys

| Feature key | Backend enforced | Frontend gated | Notes |
|---|:---:|:---:|---|
| `admin.users.max` | ✅ | ✅ | Checked in `UserManagementService.createUser()` + `PlanUsageBar` on users page |
| `members.max` | ✅ | ✅ | Checked in `PersonService.createPerson()` + `PlanUsageBar` on members page |
| `member.portal` | ✅ | ✅ | `@PlanFeatureRequired` on `MemberPortalController` + `My Profile` sidebar nav hidden with `entitlement: 'member.portal'` |
| `import.excel` | ✅ | ✅ | `@PlanFeatureRequired` on `ExcelImportController` + sidebar hidden |
| `finance.multi_currency` | ✅ | ✅ | `@PlanFeatureRequired` on exchange rate endpoints + sidebar hidden |
| `family.tree` | ✅ | ✅ | `@PlanFeatureRequired` on `GenealogyGraphController` + sidebar nav entry enabled with `entitlement: 'family.tree'` |
| `reports.advanced` | ✅ | ✅ | `@PlanFeatureRequired` on `ReportController` (class-level) + sidebar hidden |
| `events.max` | ✅ | ✅ | Limit check in `DistributionService.createEvent()` + sidebar Events hidden with `entitlement: 'events.max'` + `PlanUsageBar` on distribution page |

### Gaps to fix (existing keys)

- [x] **`reports.advanced`** — Add `@PlanFeatureRequired("reports.advanced")` to the reports controller
- [x] **`family.tree`** — Uncomment the sidebar Family Tree nav entry and add `entitlement: 'family.tree'`
- [x] **`member.portal`** — Add `entitlement: 'member.portal'` hiding in the sidebar / portal entry point
- [x] **`admin.users.max` / `members.max`** — Show usage-vs-limit indicator in the frontend (billing page / dashboard); backend already enforces hard limit

---

## New Feature Keys (data seeded, features not yet built)

These keys exist in `plan_entitlements` but the application features they guard have no enforcement yet.
Enforcement should be added when each feature module is built.

| Feature key | Backend enforced | Frontend gated | Notes |
|---|:---:|:---:|---|
| `member.search` | N/A | N/A | Removed — basic search is always available to all plans |
| `member.saved_filters` | ✅ | ✅ | `SavedMemberFilterService.assertFeatureEnabled()` on write ops; `FilterPanel` shows Save/Load UI only when `hasFeature('member.saved_filters')` |
| `member.grouping` | ✅ | ✅ | `@PlanFeatureRequired` on `GroupController` (class-level) + sidebar `Groups` hidden with `entitlement: 'member.grouping'` |
| `communication.tools` | ✅ | ✅ | Full communications module: compose, history, templates |
| `payment.tracking` | ✅ | ✅ | `@PlanFeatureRequired` on `MemberPaymentController` (class-level) + `payments` tab on contributions page hidden when feature disabled |
| `document.management` | ✅ | ✅ | `@PlanFeatureRequired` on `DocumentFolderController`, `DocumentController`, `RecordAttachmentController` (class-level) + sidebar `Documents` hidden with `entitlement: 'document.management'` |
| `roles.permissions` | ✅ | ✅ | `@PlanFeatureRequired` on write ops + permissions/pool GET endpoints in `RoleManagementController`; `GET /` and `GET /assignable` remain open (needed for user management role picker). Sidebar `Roles` and `Privileges` hidden with `entitlement: 'roles.permissions'`. Enabled on Pro plan only. |
| `data.export` | ✅ | ✅ | `@PlanFeatureRequired` class-level on `DataExportController`; sidebar `Export` entry hidden with `entitlement: 'data.export'`. Enabled on Pro plan only. Canonical round-trip Excel format (Members, Memberships, Payments, ContributionTypes sheets). Permissions 75/76 (`export.view`, `export.execute`). |

### To do when each feature is built

1. Add the feature key constant to `FeatureKeys.java`
2. Add `@PlanFeatureRequired("key")` to the relevant controller (or service method)
3. Add `entitlement: 'key'` to the sidebar nav item (if applicable)
4. Add `hasFeature("key")` guards to any UI actions that trigger the feature

---

## How Enforcement Works

### Backend — boolean feature gate
```java
@PlanFeatureRequired("reports.advanced")
@GetMapping("/reports/advanced")
public ResponseEntity<?> getAdvancedReport(...) { ... }
```
Returns HTTP 403 `PLAN_ENTITLEMENT_REQUIRED` if the organization's active plan has `enabled=false` for that key.

### Backend — numeric limit gate
```java
Integer limit = organizationSubscriptionService.getFeatureLimit(orgId, FeatureKeys.MEMBERS_MAX);
if (limit != null && currentCount >= limit) {
    throw new PlanLimitExceededException(FeatureKeys.MEMBERS_MAX, limit, currentCount);
}
```
Returns HTTP 403 `PLAN_LIMIT_EXCEEDED`.

### Frontend — nav hiding
```ts
{ name: 'Reports', entitlement: 'reports.advanced', ... }
```
`Sidebar.tsx` calls `hasFeature(item.entitlement)` and removes the item if `false`.

### Frontend — inline gating
```tsx
const { hasFeature } = useSubscription();
if (!hasFeature('reports.advanced')) return <UpgradeBanner />;
```
