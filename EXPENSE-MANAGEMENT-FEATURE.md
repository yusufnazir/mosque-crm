# Expense Management — Design Specification

## Overview

The Expense Management module lets mosque administrators record, track, and audit organisational
expenditures. Users can create expense records, attach receipt files via the existing
document-management system, tag expenses with shared reusable labels, filter the list by date and
tag, soft-delete records with a mandatory reason, restore deleted records, and inspect a full audit
trail for every CRUD action.

The module follows every existing entity / Liquibase / API / permission convention in the project
and reuses the `org_document_links` infrastructure for file attachments.

---

## Scope

### In Scope (v1)

| Feature | Included |
|---|:---:|
| Create / edit expense records | ✅ |
| Fields: date, amount, currency (FK), title, notes | ✅ |
| Shared per-organisation tags with inline create | ✅ |
| Multiple file attachments via existing document-link system | ✅ |
| Soft delete with mandatory deletion reason | ✅ |
| Restore soft-deleted records | ✅ |
| Audit log: create, update, delete, restore, detail view, file linked/unlinked | ✅ |
| Date filter and tag filter on list view | ✅ |
| Mobile-first responsive list and edit views | ✅ |
| Dedicated `expense.view` and `expense.manage` permissions | ✅ |
| English and Dutch i18n | ✅ |

### Out of Scope (v1)

| Feature | Reason |
|---|---|
| Approval / rejection workflow | Phase 2 |
| Budget tracking and alerts | Phase 2 |
| Reimbursements | Phase 2 |
| Recurring expenses | Phase 2 |
| Bulk actions | Phase 2 |
| Saved expense filters | Phase 2 |
| Hard delete | Never — records are only soft-deleted |

---

## Data Model

### Entity: `Expense`

**Table:** `org_expenses`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | sequence `expense_seq` |
| `organization_id` | BIGINT NOT NULL | FK → `organizations` |
| `expense_date` | DATE NOT NULL | Date the expenditure occurred |
| `amount` | DECIMAL(12,2) NOT NULL | |
| `currency_id` | BIGINT NOT NULL | FK → `currencies` |
| `title` | VARCHAR(500) NOT NULL | Short description |
| `notes` | TEXT | Long notes |
| `is_deleted` | BOOLEAN NOT NULL DEFAULT false | Soft-delete flag |
| `deletion_reason` | VARCHAR(1000) | Required when `is_deleted = true` |
| `deleted_at` | DATETIME | Set on soft delete |
| `deleted_by` | BIGINT | FK → `users` |
| `created_by` | BIGINT | FK → `users` |
| `created_at` | DATETIME NOT NULL | Auto-set on INSERT |
| `updated_by` | BIGINT | FK → `users` |
| `updated_at` | DATETIME | Auto-updated on change |

---

### Entity: `ExpenseTag`

**Table:** `org_expense_tags`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | sequence `expense_tag_seq` |
| `organization_id` | BIGINT NOT NULL | FK → `organizations` |
| `name` | VARCHAR(100) NOT NULL | Unique per organisation |
| `created_at` | DATETIME NOT NULL | Auto-set on INSERT |
| `created_by` | BIGINT | FK → `users` |

**Unique constraint:** `(organization_id, name)`

---

### Join Table: `org_expense_tag_mappings`

| Column | Type | Notes |
|---|---|---|
| `expense_id` | BIGINT NOT NULL | FK → `org_expenses` |
| `tag_id` | BIGINT NOT NULL | FK → `org_expense_tags` |

**Primary key:** `(expense_id, tag_id)`

---

### Entity: `ExpenseAuditEvent`

**Table:** `org_expense_audit_events`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | autoIncrement |
| `expense_id` | BIGINT NOT NULL | FK → `org_expenses` |
| `organization_id` | BIGINT NOT NULL | FK → `organizations` |
| `event_type` | VARCHAR(50) NOT NULL | `ExpenseAuditEventType` enum value |
| `user_id` | BIGINT | FK → `users` |
| `detail` | VARCHAR(1000) | Human-readable summary |
| `occurred_at` | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |

---

## Audit Event Types

```java
public enum ExpenseAuditEventType {
    CREATED,
    UPDATED,
    DELETED,
    RESTORED,
    VIEWED,
    FILE_LINKED,
    FILE_UNLINKED
}
```

---

## REST API Endpoints

**Base path:** `/api/expenses`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/expenses` | `expense.view` | List (supports `dateFrom`, `dateTo`, `tagIds`, `includeDeleted`) |
| `GET` | `/expenses/{id}` | `expense.view` | Get detail (logs VIEWED) |
| `POST` | `/expenses` | `expense.manage` | Create |
| `PUT` | `/expenses/{id}` | `expense.manage` | Update |
| `POST` | `/expenses/{id}/delete` | `expense.manage` | Soft-delete with mandatory reason |
| `POST` | `/expenses/{id}/restore` | `expense.manage` | Restore soft-deleted record |
| `GET` | `/expenses/tags` | `expense.view` | List all org tags |
| `POST` | `/expenses/tags` | `expense.manage` | Create new tag |
| `GET` | `/expenses/{id}/audit` | `expense.view` | Get audit log for expense |

**Filter params on `GET /expenses`:**

| Param | Type | Notes |
|---|---|---|
| `dateFrom` | ISO date string | Inclusive lower bound on `expense_date` |
| `dateTo` | ISO date string | Inclusive upper bound on `expense_date` |
| `tagIds` | Comma-separated longs | Expenses that carry at least one of these tags |
| `includeDeleted` | Boolean (default `false`) | When `true`, include soft-deleted records |

---

## Permissions

Two new permissions added to `030-data-permissions.xml`:

| ID | Code | Category | Description |
|---|---|---|---|
| 77 | `expense.view` | `expense` | View the expense list and detail |
| 78 | `expense.manage` | `expense` | Create, edit, delete, and restore expenses |

Both are assigned to ADMIN (role_id = 1) in `031-data-role-permissions.xml`.

---

## Liquibase Migration Files

| File | Purpose |
|---|---|
| `158-create-org-expenses-table.xml` | `org_expenses` table + `org_expense_tag_mappings` join table |
| `159-create-org-expense-tags-table.xml` | `org_expense_tags` table |
| `160-create-org-expense-audit-events-table.xml` | `org_expense_audit_events` table |
| `db.changelog-ddl.xml` | Include files 158, 159, 160 |
| `999-add-all-foreign-keys.xml` | New changeSet with expense FKs and indexes |
| `030-data-permissions.xml` | Add permission IDs 77 and 78 |
| `031-data-role-permissions.xml` | Assign 77 and 78 to ADMIN |

---

## Backend Java Files

| File | Package | Notes |
|---|---|---|
| `Expense.java` | `entity` | Multi-tenant, ManyToMany tags, soft-delete fields |
| `ExpenseTag.java` | `entity` | Per-org reusable tag |
| `ExpenseAuditEvent.java` | `entity` | Append-only audit record |
| `ExpenseAuditEventType.java` | `enums` | CREATED / UPDATED / DELETED / RESTORED / VIEWED / FILE_LINKED / FILE_UNLINKED |
| `ExpenseDTO.java` | `dto` | Response DTO (includes tag list, currency info) |
| `ExpenseCreateDTO.java` | `dto` | Create / update request DTO |
| `ExpenseDeleteDTO.java` | `dto` | Delete request (contains mandatory reason) |
| `ExpenseTagDTO.java` | `dto` | Tag response DTO |
| `ExpenseTagCreateDTO.java` | `dto` | Tag create request DTO |
| `ExpenseAuditEventDTO.java` | `dto` | Audit event response DTO |
| `ExpenseRepository.java` | `repository` | JpaRepository with custom query |
| `ExpenseTagRepository.java` | `repository` | JpaRepository |
| `ExpenseAuditEventRepository.java` | `repository` | JpaRepository |
| `ExpenseService.java` | `service` | CRUD, soft-delete, restore, tag management |
| `ExpenseAuditService.java` | `service` | Isolated audit writes (`REQUIRES_NEW`) |
| `ExpenseController.java` | `controller` | REST endpoints, no security annotations |

---

## Frontend Files

| File | Purpose |
|---|---|
| `lib/expenseApi.ts` | TypeScript types + `expenseApi` client |
| `app/(dashboard)/expenses/page.tsx` | Mobile-first list + date/tag filters |
| `app/(dashboard)/expenses/new/page.tsx` | Create expense form |
| `app/(dashboard)/expenses/[id]/page.tsx` | Edit / detail + attachments + audit log |

**Modified files:**

| File | Change |
|---|---|
| `components/Sidebar.tsx` | Add Expenses nav item (`permission: 'expense.view'`) |
| `lib/i18n/locales/en.json` | Add nav key and full `expenses` section |
| `lib/i18n/locales/nl.json` | Add nav key and full `expenses` section (Dutch) |

---

## Frontend UX

### List Page (`/expenses`)

- **Mobile:** card stack showing date, title, amount/currency, tag chips, deleted badge
- **Desktop:** table with same columns
- **Filters:** date-from / date-to inputs, multi-select tag dropdown, show-deleted toggle (visible to `expense.manage` users only)
- **Actions:** "New Expense" button (requires `expense.manage`), row click → edit/detail page

### Create Page (`/expenses/new`)

- Fields: expense date, amount, currency dropdown, title, notes, tag multi-select (with inline create)
- Save / Cancel buttons
- ToastNotification on success

### Edit / Detail Page (`/expenses/[id]`)

- Same form fields as create, pre-populated
- Attachments tab: `RecordAttachmentsPanel` with `entityType="EXPENSE"` and `entityId`
- Audit log tab: reverse-chronological list of audit events
- **Delete** button (manage only): `ConfirmDialog variant="danger"` with a required reason text area
- **Restore** button when `isDeleted = true` (manage only): `ConfirmDialog variant="warning"`
- ToastNotification on each action

---

## Design Decisions

- Tags are shared reusable records per organisation, not freeform strings.
- Attachments reuse `org_document_links` (`entityType = "EXPENSE"`) — no new storage infrastructure.
- Read auditing covers detail views and file access but not list/filter requests to avoid log noise.
- Soft-deleted records are restorable. Hard deletes are never performed.
- `expense.view` and `expense.manage` are dedicated permissions, not under the existing `finance.*` category.
