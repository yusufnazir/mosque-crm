# Communication Tools — Feature Specification

Gated by plan entitlement `communication.tools`.  
Email only (no SMS). Mosque admins can compose and send emails to members directly from the CRM.

---

## Feature Set

### 1. Compose & Send
- Write a subject and HTML/plain-text email body (rich textarea, not full WYSIWYG)
- Choose recipient audience:
  - **All members** — every `Person` with a non-null email address in the mosque
  - **By group** — all members of a specific `Group` who have an email address
  - **Individual member** — pick a single person
- Preview recipient count before sending ("18 members will receive this email")
- Send is async — queued and dispatched in background; UI shows "Sending…" → "Sent"
- Emails with no valid recipients are rejected before sending
- Variable substitution: `{{firstName}}`, `{{lastName}}`, `{{organizationName}}` replaced per-recipient

### 2. Templates
- Save reusable message templates (name + subject + body)
- Built-in starter templates seeded in DB: Ramadan Greeting, Jumu'ah Newsletter, Payment Reminder
- Admins can create / edit / delete their own templates
- "Use template" button in the Compose view pre-fills subject + body

### 3. Send History
- Log of every sent communication: date/time, subject, sender name, recipient type, recipient count, status
- Statuses: `SENDING` → `SENT` | `FAILED` (if all recipients had no email address)
- Click a row to view the full message detail (subject, body preview, recipient info)
- No per-recipient delivery receipts (the mail relay does not provide them)

### 4. Dashboard Notifications Card
- A **"Recent Communications"** card on the dashboard, visible to all logged-in users
- Shows the last 3–5 messages that were sent to the current user's audience (all-member broadcasts, or group messages where the user is a member)
- Each row: date, subject, sender name — click to open a read-only modal with the full body
- Shown only when `communication.tools` is enabled for the plan; hidden otherwise
- **Unread badge**: messages received since last dashboard visit are highlighted (stored in `localStorage` as "last seen" timestamp — no DB column needed)
- Admins see all sent messages in this card (since they are always a potential recipient of all-member sends)

---

## Backend Implementation Plan

### New DB Tables

**`communication_messages`**
| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | |
| `mosque_id` | BIGINT FK | multi-tenancy |
| `subject` | VARCHAR(255) | |
| `body_html` | TEXT | |
| `recipient_type` | VARCHAR(20) | `ALL`, `GROUP`, `INDIVIDUAL` |
| `recipient_group_id` | BIGINT NULL FK → `groups.id` | set when type=GROUP |
| `recipient_person_id` | BIGINT NULL FK → `persons.id` | set when type=INDIVIDUAL |
| `sent_by_user_id` | BIGINT FK → `users.id` | who triggered the send |
| `status` | VARCHAR(10) | `SENDING`, `SENT`, `FAILED` |
| `sent_at` | DATETIME NULL | filled on completion |
| `sent_count` | INT DEFAULT 0 | number of addresses actually sent to |
| `created_at` | DATETIME | |

**`communication_templates`**
| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | |
| `mosque_id` | BIGINT FK | multi-tenancy |
| `name` | VARCHAR(100) | display name |
| `subject` | VARCHAR(255) | |
| `body_html` | TEXT | |
| `is_system` | BOOLEAN DEFAULT FALSE | system templates cannot be deleted |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### Entities
- `CommunicationMessage` — implements `MosqueAware`, `@FilterDef`/`@Filter` for multi-tenancy
- `CommunicationTemplate` — implements `MosqueAware`, `@FilterDef`/`@Filter` for multi-tenancy

### DTOs
- `SendCommunicationRequest` — subject, bodyHtml, recipientType, recipientGroupId?, recipientPersonId?
- `CommunicationMessageDTO` — id, subject, recipientType, recipientGroupName?, recipientPersonName?, sentByName, status, sentAt, sentCount
- `CommunicationTemplateDTO` / `CommunicationTemplateSaveRequest`

### Service: `CommunicationService`
- `buildRecipientList(mosqueId, recipientType, groupId?, personId?)` → `List<String>` (email addresses)
  - Queries `PersonRepository` filtered by mosque + non-null email
  - For GROUP: joins through `GroupMember`
- `send(mosqueId, userId, request)` — saves `CommunicationMessage` (status=SENDING), resolves recipients, iterates calling `EmailService.sendGenericEmail(...)`, updates status + sentCount
- `listMessages(mosqueId)` → paginated
- `getMessage(id)` → single with body
- `listTemplates(mosqueId)`, `saveTemplate(...)`, `deleteTemplate(...)`

### EmailService — new method
Add `sendGenericEmail(String toEmail, String subject, String bodyHtml)` to the existing `EmailService`. Uses same HTTP relay pattern as `sendPasswordResetEmail`.

### Controller: `CommunicationController`
`@PlanFeatureRequired("communication.tools")` at class level.  
Base path: `/communications`

| Method | Path | Description |
|---|---|---|
| `POST` | `/communications/send` | Compose and send |
| `GET` | `/communications/messages` | Send history (paginated) |
| `GET` | `/communications/messages/{id}` | Message detail |
| `GET` | `/communications/recipients/count` | Preview recipient count before sending |
| `GET` | `/communications/templates` | List templates |
| `POST` | `/communications/templates` | Create template |
| `PUT` | `/communications/templates/{id}` | Update template |
| `DELETE` | `/communications/templates/{id}` | Delete template (non-system only) |
| `GET` | `/communications/inbox` | Recent messages visible to the current user (for dashboard card) |

### FeatureKeys
Add `COMMUNICATION_TOOLS = "communication.tools"` to `FeatureKeys.java`.

### Permissions (new, starting at id=67)
Add to `030-data-permissions.xml`:
- **id=67** `communication.view` — View communication history and templates (category: `communication`)
- **id=68** `communication.manage` — Compose and send emails, manage templates (category: `communication`)

Assign both to ADMIN role in `031-data-role-permissions.xml`.

### Liquibase
- DDL: `backend/src/main/resources/db/changelog/changes/ddl/021-communication-messages.xml`
- DDL: `backend/src/main/resources/db/changelog/changes/ddl/022-communication-templates.xml`
- FK: add FK entries to `999-add-all-foreign-keys.xml`
- DML: seed 3 system templates in a new `039-data-communication-templates.xml`
- Add to `db.changelog-ddl.xml` and `db.changelog-dml.xml` consolidation files

---

## Frontend Implementation Plan

### Page: `app/(dashboard)/communications/page.tsx`
Three tabs (Compose, History, Templates) — see sections below.

### Dashboard Card (`app/(dashboard)/dashboard/page.tsx`)
- Import and render a `<RecentCommunicationsCard />` component below the stat cards, gated with `hasFeature('communication.tools')`
- Component fetches `GET /communications/inbox` (returns last 5 messages visible to the current user)
- Renders a `Card` with title "Recent Communications" and a list of rows (date, subject, sender)
- Click row → read-only modal showing full body
- Rows received after the stored `localStorage` key `comms_last_seen` are highlighted with a gold left border
- On mount, update `comms_last_seen` to `Date.now()` so highlights clear on next visit
- Empty state: "No recent communications" when list is empty

**Compose tab**
- Recipient type selector (radio: All Members / Group / Individual)
- Group dropdown (visible when GROUP selected, filtered by `member.grouping` availability)
- Member search/select (visible when INDIVIDUAL selected)
- Subject input
- Body textarea (plain-text, rendered as HTML `<p>` blocks on send — keep it simple)
- "Preview recipients" → shows count
- "Use template" button → opens template picker modal
- Send button → POST `/communications/send`

**History tab**
- Table: Date | Subject | Recipients | Sent to | Status
- Click row → side panel or modal with full message body

**Templates tab**
- List of templates (name, subject, last updated)
- Create / Edit / Delete (system templates: edit only)

### Sidebar Entry (`components/Sidebar.tsx`)
```ts
{ name: 'Communications', href: '/communications', icon: EnvelopeIcon, permission: 'communication.view', entitlement: 'communication.tools' }
```

### API Client (`lib/communicationApi.ts`)
Functions for all controller endpoints, using the existing `ApiClient` pattern.

### i18n
Add keys to `lib/i18n/locales/en.json` and `nl.json`:
- Sidebar: `sidebar.communications`
- Page sections: `communications.compose`, `communications.history`, `communications.templates`
- Labels, status strings, error messages

---

## Constraints & Notes

- **No per-recipient delivery tracking** — the mail relay has no callback/webhook
- **Members without email are silently skipped** — not an error, just excluded from `sentCount`
- **Async send is synchronous for now** — iterate recipients in the same request thread; add `@Async` later if volumes grow
- **Body is plain HTML** — no WYSIWYG editor needed in v1; a `<textarea>` is sufficient
- **System templates** — seeded via Liquibase, `is_system=true`, shown to all mosques, cannot be deleted via API
- **Variable substitution** — simple `String.replace("{{firstName}}", ...)` in the service; no template engine needed for user-authored bodies

---

## Implementation Order

1. Liquibase DDL migrations + FK
2. Entities + Repositories
3. `CommunicationService` + `sendGenericEmail` method in `EmailService`
4. `CommunicationController` with `@PlanFeatureRequired` (including `/inbox` endpoint)
5. Permission seed data + role assignments
6. `FeatureKeys.COMMUNICATION_TOOLS` constant
7. Frontend API client (including `getInbox()`)
8. `RecentCommunicationsCard` component + wire into dashboard page
9. Communications page (Compose → History → Templates)
10. Sidebar + i18n
11. Update `ENTITLEMENT-ENFORCEMENT-STATUS.md`
