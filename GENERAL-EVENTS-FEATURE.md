# General Event Feature — Design Specification

## Overview

The mosque CRM already has a dedicated **Eid ul Adha Distribution** event type for managing annual parcel distribution. The `OrganizationEventType.GENERAL` enum value exists but has no implementation. This document defines the full feature for **General Events** — a flexible, reusable event module that covers community gatherings, lectures, fundraisers, iftars, workshops, ceremonies, and anything else that isn't a distribution.

## Research Basis

This spec is informed by how comparable community platforms handle events:

- **Church management software** (Planning Center, ChurchSuite, Breeze): Flexible event types, self-registration, attendance check-in, post-event reporting
- **Membership platforms** (Wild Apricot, Glue Up): RSVP tracking, capacity tiers, waitlists, announcement emails
- **Islamic center practice**: Events often have mixed member/non-member audiences, volunteer coordination needs, and may range from free lectures to paid fundraising dinners; financial tracking and attendance history are valued by mosque boards

---

## Scope

### What This Module Covers

- Creating and managing general community events (lectures, iftars, fundraisers, nikah, youth programs, sports days, Quran competitions, graduations, custom)
- Member and non-member registration with RSVP status
- Capacity management (unlimited, single limit, or waitlist)
- Attendance check-in on the day
- Optional ticketed events with a single price (e.g., fundraising dinner at €25/person)
- Volunteer role assignment
- Announcements and email broadcasts to registered attendees
- Post-event summary report

### What This Module Does NOT Cover (Out of Scope)

| Excluded Feature | Reason |
|---|---|
| Parcel/item distribution tracking | That belongs to `EID_UL_ADHA_DISTRIBUTION` type |
| QR code scanning for check-in | Phase 2 — use manual check-in at MVP |
| SMS notifications | Requires third-party integration |
| Payment processing / online payments | Payments tracked manually; no gateway at MVP |
| Recurring event series management | Phase 2 |
| Tiered ticket pricing | Phase 2; single price covers most mosque events |
| Seating assignments | Too complex; not useful at MVP scale |
| Livestream / hybrid attendee tracking | Out of scope |

---

## Event Types

Replace the current `OrganizationEventType` enum. The Eid distribution is its own branch; general events use a sub-type via a separate `GeneralEventType` enum:

```java
public enum GeneralEventType {
    LECTURE,             // Islamic talks, khutba recordings, seminars
    FUNDRAISER,          // Fundraising dinners, charity galas
    IFTAR,               // Ramadan community iftars
    NIKAH,               // Marriage ceremonies
    YOUTH_PROGRAM,       // Youth workshops, camps, Islamic school events
    SPORTS_DAY,          // Community sports & recreation
    QURAN_COMPETITION,   // Quran recitation / memorization events
    GRADUATION,          // Islamic school or certificate graduations
    OTHER                // Anything not covered above — admin enters custom label
}
```

The `org_events` table keeps `event_type = 'GENERAL'` from `OrganizationEventType` to distinguish it from distribution events at the top level. The `GeneralEventType` gives the specific sub-type.

---

## Status Lifecycle

```
DRAFT ──► PUBLISHED ──► ACTIVE ──► CLOSED
                │                    │
                └──────► CANCELLED ◄─┘
```

| Status | Meaning |
|---|---|
| `DRAFT` | Created but not visible to members yet |
| `PUBLISHED` | Visible to members; registration open if configured |
| `ACTIVE` | Event is happening (day-of) — check-in enabled |
| `CLOSED` | Event finished; reports available |
| `CANCELLED` | Event called off; registrants should be notified |

---

## Data Model

### Core Entity: `GeneralEvent`

**Table: `org_general_events`**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | BIGINT | NO | PK, TableGenerator pattern |
| `organization_id` | BIGINT | NO | Multi-tenancy FK |
| `name` | VARCHAR(255) | NO | Event title |
| `description` | TEXT | YES | Rich text, agenda, details |
| `general_event_type` | VARCHAR(50) | NO | `GeneralEventType` enum value |
| `custom_type_label` | VARCHAR(100) | YES | Used when type = `OTHER` |
| `location` | VARCHAR(500) | YES | Venue name or address |
| `is_online` | TINYINT(1) | NO | Default 0 |
| `meeting_url` | VARCHAR(255) | YES | Zoom/Teams link if online |
| `start_date` | DATE | NO | Event date |
| `start_time` | TIME | YES | Start time (null = all-day) |
| `end_time` | TIME | YES | End time |
| `requires_registration` | TINYINT(1) | NO | Default 1; 0 = drop-in only |
| `registration_open_date` | DATETIME | YES | When registration opens (null = immediately) |
| `registration_close_date` | DATETIME | YES | When registration closes (null = at event start) |
| `member_capacity` | INT | YES | NULL = unlimited |
| `non_member_capacity` | INT | YES | NULL = unlimited; 0 = members only |
| `accept_non_members` | TINYINT(1) | NO | Default 0 |
| `waitlist_enabled` | TINYINT(1) | NO | Default 0 |
| `ticketing_type` | VARCHAR(20) | NO | `NONE` or `SINGLE_PRICE` |
| `ticket_price` | DECIMAL(10,2) | YES | NULL when ticketing_type = NONE |
| `currency` | VARCHAR(3) | YES | ISO currency (e.g., EUR) |
| `status` | VARCHAR(20) | NO | `GeneralEventStatus` enum |
| `visibility` | VARCHAR(20) | NO | `PUBLIC`, `MEMBERS_ONLY`, `INTERNAL_ONLY` |
| `featured` | TINYINT(1) | NO | Default 0; pinned on dashboard |
| `requires_check_in` | TINYINT(1) | NO | Default 0 |
| `check_in_code` | VARCHAR(20) | YES | Auto-generated short code for check-in |
| `created_at` | TIMESTAMP | NO | Auto |
| `updated_at` | TIMESTAMP | NO | Auto |

**FK constraints:** `organization_id` → `organizations.id`

---

### Registration Entity: `GeneralEventRegistration`

Covers both member and non-member registrations in one table (unlike distribution which had separate tables).

**Table: `org_general_event_registrations`**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | BIGINT | NO | PK, TableGenerator |
| `organization_id` | BIGINT | NO | Multi-tenancy FK |
| `general_event_id` | BIGINT | NO | FK to `org_general_events` |
| `registrant_type` | VARCHAR(20) | NO | `MEMBER` or `NON_MEMBER` |
| `person_id` | BIGINT | YES | FK to `persons`; NULL for non-members |
| `name` | VARCHAR(255) | NO | Full name (auto-filled for members) |
| `email` | VARCHAR(255) | YES | Contact email |
| `phone_number` | VARCHAR(20) | YES | Contact phone |
| `party_size` | INT | NO | Default 1; family/group size |
| `rsvp_status` | VARCHAR(20) | NO | `CONFIRMED`, `DECLINED`, `WAITLIST` |
| `check_in_status` | VARCHAR(20) | NO | `NOT_CHECKED_IN`, `CHECKED_IN`, `ABSENT` |
| `checked_in_at` | DATETIME | YES | Timestamp of check-in |
| `special_requests` | VARCHAR(500) | YES | Dietary, accessibility notes |
| `amount_paid` | DECIMAL(10,2) | YES | For ticketed events — manually entered |
| `registered_at` | DATETIME | NO | Registration timestamp |
| `source` | VARCHAR(30) | NO | `SELF`, `ADMIN_MANUAL`, `ADMIN_IMPORT` |
| `created_at` | TIMESTAMP | NO | Auto |
| `updated_at` | TIMESTAMP | NO | Auto |

**FK constraints:**
- `general_event_id` → `org_general_events.id`
- `person_id` → `persons.id` (nullable)
- `organization_id` → `organizations.id`

---

### Volunteer Entity: `GeneralEventVolunteer`

**Table: `org_general_event_volunteers`**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | BIGINT | NO | PK, TableGenerator |
| `organization_id` | BIGINT | NO | Multi-tenancy FK |
| `general_event_id` | BIGINT | NO | FK to `org_general_events` |
| `person_id` | BIGINT | NO | FK to `persons` (must be member) |
| `role` | VARCHAR(100) | NO | e.g., `GREETER`, `KITCHEN`, `SETUP`, `TEARDOWN`, `COORDINATOR`, `OTHER` |
| `role_description` | VARCHAR(255) | YES | Extra detail about role |
| `status` | VARCHAR(20) | NO | `INVITED`, `ACCEPTED`, `DECLINED`, `COMPLETED`, `NO_SHOW` |
| `checked_in` | TINYINT(1) | NO | Default 0 |
| `created_at` | TIMESTAMP | NO | Auto |
| `updated_at` | TIMESTAMP | NO | Auto |

**FK constraints:**
- `general_event_id` → `org_general_events.id`
- `person_id` → `persons.id`
- `organization_id` → `organizations.id`

---

## API Design

All endpoints live under `/general-events` (separate from `/events` which handles distribution).

### Events

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/general-events` | `event.view` | List all general events for the org |
| `GET` | `/general-events/{id}` | `event.view` | Get single event with summary |
| `POST` | `/general-events` | `event.manage` | Create new general event |
| `PUT` | `/general-events/{id}` | `event.manage` | Update event details |
| `PUT` | `/general-events/{id}/status` | `event.manage` | Change event status |
| `DELETE` | `/general-events/{id}` | `event.delete` | Delete event and all registrations |
| `GET` | `/general-events/{id}/report` | `event.view` | Post-event summary report |

### Registrations

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/general-events/{id}/registrations` | `event.view` | All registrations for an event |
| `POST` | `/general-events/{id}/registrations` | `event.manage` | Register a member or non-member (admin) |
| `PUT` | `/general-events/{id}/registrations/{regId}` | `event.manage` | Update registration (status, amount paid) |
| `PUT` | `/general-events/{id}/registrations/{regId}/check-in` | `event.distribute` | Mark attendee as checked in |
| `DELETE` | `/general-events/{id}/registrations/{regId}` | `event.manage` | Remove a registration |

### Volunteers

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/general-events/{id}/volunteers` | `event.view` | List assigned volunteers |
| `POST` | `/general-events/{id}/volunteers` | `event.manage` | Assign volunteer |
| `PUT` | `/general-events/{id}/volunteers/{volId}` | `event.manage` | Update volunteer status/role |
| `DELETE` | `/general-events/{id}/volunteers/{volId}` | `event.manage` | Remove volunteer |

> **Note:** Permissions reuse the existing `event.*` permission set (IDs 55–58). No new permissions required.

---

## Frontend Pages

### 1. Events List Page — `/events` (extend existing)

The existing `/events` page currently shows distribution events only. Extend it with a tab or toggle:

- **Tab: Distribution Events** — existing Eid ul Adha events
- **Tab: General Events** — the new module

Alternatively, add a separate sidebar item `General Events` pointing to `/general-events`.

**List view columns:** Name, Type, Date, Location, Registered / Capacity, Status, Actions

### 2. General Event Detail Page — `/general-events/[id]`

Tabs:
- **Overview** — event info, quick stats (registered, attended, capacity)
- **Registrations** — table with member/non-member list, RSVP status, check-in status; buttons to add/remove/check-in
- **Volunteers** — assign members to roles, track acceptance
- **Report** — post-event summary (only visible after event is CLOSED)

### 3. Create / Edit Event Form

Fields: Name, Type (dropdown), Custom label (if OTHER), Description (textarea), Location, Online toggle + URL, Date, Start time, End time, Registration settings (open?, capacity, non-member toggle, waitlist toggle), Ticketing (NONE or SINGLE_PRICE + price), Status, Visibility, Featured toggle, Requires check-in toggle.

---

## Liquibase Migration Files

Create in order, follow existing naming convention:

| File | Table |
|---|---|
| `090-create-org-general-events-table.xml` | `org_general_events` |
| `091-create-org-general-event-registrations-table.xml` | `org_general_event_registrations` |
| `092-create-org-general-event-volunteers-table.xml` | `org_general_event_volunteers` |

Add includes to `db.changelog-ddl.xml` under a new `<!-- GENERAL EVENTS -->` section.

Add FK constraints to a new changeset in `999-add-all-foreign-keys.xml`.

---

## Permissions

The existing `event.*` permissions (IDs 55–58) apply directly:

| Permission | Applied To |
|---|---|
| `event.view` | View events, registrations, volunteer lists, reports |
| `event.manage` | Create/edit events, manage registrations, assign volunteers |
| `event.distribute` | Check in attendees on the day |
| `event.delete` | Delete events |

No new permissions needed for MVP.

---

## Entitlement Enforcement

Reuse the existing `events.max` entitlement. When an admin creates a new general event, the service checks the combined count of **all** active events (distribution + general) against the plan limit.

If a separate limit is preferred in future, add `general_events.max` as a new plan entitlement (IDs would follow current sequence from 69+).

---

## Differences from Eid Distribution Events

| Aspect | Eid ul Adha Distribution | General Event |
|---|---|---|
| Purpose | Annual meat parcel distribution | Any community gathering |
| Parcel tracking | Yes — categories, counts, who got what | No |
| Registration tables | Separate member + non-member tables | Single unified registrations table |
| Check-in concept | "Parcel received" | "Attended the event" |
| Ticketing | Never applicable | Optional single price |
| Volunteer tracking | No | Yes |
| Status DRAFT | No (always PLANNED) | Yes |
| Sub-types | Always Eid ul Adha | LECTURE, FUNDRAISER, IFTAR, etc. |

Both event types share the same `event.*` permissions and the same `events.max` entitlement.

---

## Implementation Priority (Phased)

### Phase 1 — MVP

- [ ] New enums: `GeneralEventType`, `GeneralEventStatus`, `RegistrantType`, `RsvpStatus`, `CheckInStatus`
- [ ] Liquibase DDL: `org_general_events`, `org_general_event_registrations` tables
- [ ] FK constraints in `999-add-all-foreign-keys.xml`
- [ ] JPA entities: `GeneralEvent`, `GeneralEventRegistration`
- [ ] DTOs: request/response for both entities
- [ ] Repository interfaces
- [ ] `GeneralEventService`: CRUD + registration management + status transitions + report summary
- [ ] `GeneralEventController`: all REST endpoints
- [ ] Frontend: Events list page extended with General Events tab, detail page with Overview + Registrations tabs, create/edit form
- [ ] i18n keys for all new UI text (en + nl)
- [ ] `events.max` entitlement check in `GeneralEventService.createEvent()`

### Phase 2

- [ ] Volunteer assignment (`org_general_event_volunteers` table + UI tab)
- [ ] Waitlist: auto-promote from WAITLIST → CONFIRMED when a spot opens
- [ ] Email announcements / broadcast to registered attendees
- [ ] Recurring event support
- [ ] CSV export of attendee list
- [ ] QR code check-in (generate code, scan on mobile)
- [ ] Post-event feedback link
