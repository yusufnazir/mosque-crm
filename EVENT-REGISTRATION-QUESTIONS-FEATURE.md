# Event Registration Questions — Feature Design & Implementation Spec

## Overview

A client running **General Events** with event type **OTHER** (e.g. an outing where the
mosque arranges a bus) needs participants to indicate how they will travel
("Bus" vs "Own transport"). This is the first of many similar asks (meal choice,
t-shirt size, arrival window, session choice, dietary detail, …).

Instead of hard-coding a `transport_mode` column, this feature adds a **generic,
optional "registration questions" mechanism** to General Events. Each event can
define 0..N questions, and each question is *configured* as:

- **SINGLE_CHOICE** — radio buttons, pick one option (the client's "Bus / Own transport" case)
- **MULTI_CHOICE** — checkboxes, pick several options
- **FREE_TEXT** — a short text answer (no options needed)

Answers are captured wherever a registration is created (public self-registration
form **and** the admin add/edit registration flow) and are shown to organizers in the
registrations table, the Excel/PDF exports, and as a per-option **tally** so they can
plan logistics (e.g. how many seats on the bus).

The feature is **optional**: an event with no questions behaves exactly as today.

## Scope

### In scope
- Questions + options defined per event (`org_general_event_questions`, `org_general_event_question_options`)
- Answers stored per registration (`org_general_event_registration_answers`)
- UI to define/edit questions while creating **or** editing an event — shown only when `generalEventType = OTHER` (v1 decision)
- Questions rendered on the **public self-registration** form
- Questions rendered in the **admin add/edit registration** modal
- Answers visible in the **registrations list**, **Excel/PDF export**, and a per-question **tally**
- Backend model is generic (not OTHER-only) so the UI can be widened later without schema change

### Out of scope (v1)
- Per-option capacity / seats (e.g. "bus limited to 50") — later phase
- Conditional / dependent questions
- Questions on distribution (`EID_UL_ADHA_DISTRIBUTION`) events
- Multi-lingual question labels (labels are free text as entered; org UI language applies)

## Data Model

All tables follow the standard multi-tenant pattern:
`organization_id BIGINT`, `created_at`, `updated_at`, `OrganizationAware` +
`OrganizationEntityListener`, `@Filter(name = "organizationFilter")`, TableGenerator IDs
(see `GeneralEventSession` for the reference implementation).

### `org_general_event_questions` (one row per question on an event)

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT | PK, TableGenerator `general_event_questions_seq` |
| `general_event_id` | BIGINT NOT NULL | FK → `org_general_events.id` |
| `label` | VARCHAR(255) NOT NULL | e.g. "How will you travel?" |
| `input_type` | VARCHAR(20) NOT NULL | `SINGLE_CHOICE`, `MULTI_CHOICE`, `FREE_TEXT` |
| `required` | TINYINT(1) NOT NULL | Default 0 |
| `sort_order` | INT NOT NULL | Default 0 |
| `organization_id` | BIGINT | Multi-tenancy |
| `created_at` / `updated_at` | TIMESTAMP | |

### `org_general_event_question_options` (choices for SINGLE/MULTI choice questions)

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT | PK, TableGenerator `general_event_question_options_seq` |
| `question_id` | BIGINT NOT NULL | FK → `org_general_event_questions.id` |
| `label` | VARCHAR(255) NOT NULL | e.g. "Bus" / "Own transport" |
| `sort_order` | INT NOT NULL | Default 0 |
| `organization_id` | BIGINT | |
| `created_at` / `updated_at` | TIMESTAMP | |

### `org_general_event_registration_answers` (one row per selected option / free-text answer)

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT | PK, TableGenerator `general_event_reg_answers_seq` |
| `registration_id` | BIGINT NOT NULL | FK → `org_general_event_registrations.id` |
| `question_id` | BIGINT NOT NULL | FK → `org_general_event_questions.id` |
| `option_id` | BIGINT NULL | FK → `org_general_event_question_options.id`; set for single/multi choice |
| `free_text` | VARCHAR(1000) NULL | Set for FREE_TEXT answers |
| `organization_id` | BIGINT | |
| `created_at` / `updated_at` | TIMESTAMP | |

**Answer semantics**
- SINGLE_CHOICE → exactly one row with `option_id`
- MULTI_CHOICE → one row **per selected option**
- FREE_TEXT → one row with `free_text`
- Optional questions answered "blank" → **no rows** (simplest; tally omits blanks)

A question that is `required` and has no answer rows is rejected by the service
(both admin and public registration paths).

### Deletion rules
- Deleting a **registration** deletes its answers (JPA cascade on the registration →
  answers `@OneToMany(cascade = ALL, orphanRemoval = true)`).
- Deleting an **event**: cleanup order matters because answers reference questions.
  In the transactional delete we first remove the event's question definitions
  (which cascade to options) — answers were already removed with their
  registrations (registrations cascade from `GeneralEvent`). To be safe the
  `GeneralEventService.deleteEvent` path deletes answers and questions explicitly
  *before* the parent delete (mirrors `EventFeatureCleanupService` usage).
- Options of a question are removed when the question is deleted/replaced
  (cascade + orphanRemoval on `GeneralEventQuestion.options`).

## Backend

### New files
- `enums/GeneralEventQuestionType.java` — `SINGLE_CHOICE`, `MULTI_CHOICE`, `FREE_TEXT`
- `entity/GeneralEventQuestion.java`
- `entity/GeneralEventQuestionOption.java`
- `entity/GeneralEventRegistrationAnswer.java`
- `repository/GeneralEventQuestionRepository.java`
- `repository/GeneralEventRegistrationAnswerRepository.java`
- `dto/GeneralEventQuestionOptionDTO.java`
- `dto/GeneralEventQuestionDTO.java` (used for both create/update and response)
- `dto/GeneralEventQuestionAnswerDTO.java` (payload embedded in registration create/update)
- `service/GeneralEventQuestionService.java` (question CRUD + validation + answer save/read + tally)
- Liquibase DDL: `ddl/193-create-general-event-registration-questions.xml`
- Liquibase FK additions in `ddl/999-add-all-foreign-keys.xml` (CHANGESET under the events block)

### Changed files
- `entity/GeneralEvent.java` — add `@OneToMany List<GeneralEventQuestion> questions`
- `entity/GeneralEventRegistration.java` — add `@OneToMany List<GeneralEventRegistrationAnswer> answers`
- `dto/GeneralEventCreateDTO.java` — add `List<GeneralEventQuestionDTO> registrationQuestions` (optional)
- `dto/GeneralEventDTO.java` — add `List<GeneralEventQuestionDTO> registrationQuestions`
- `dto/PublicGeneralEventDTO.java` — add `List<GeneralEventQuestionDTO> registrationQuestions`
- `dto/GeneralEventRegistrationCreateDTO.java` — add `List<GeneralEventQuestionAnswerDTO> answers`
- `dto/GeneralEventRegistrationDTO.java` — add answers (questionId → answer view) for admin display
- `dto/PublicGeneralEventSelfRegisterDTO.java` — add `List<GeneralEventQuestionAnswerDTO> answers`
- `service/GeneralEventService.java` — map questions in create/update; save answers in
  add/update registration; include answers + questions in DTO mapping; explicit cleanup on delete
- `service/PublicGeneralEventService.java` — expose questions in public DTO; save answers on
  self-register (both opt-in and guest); validate required questions
- `service/GeneralEventReportDTO` — add per-question tally summary (optional, used by tally UI)
- `controller/GeneralEventController.java` — registration create/update already pass the DTO;
  add `GET /{id}/registration-questions/summary` for the tally

### API surface
- Question definitions are **embedded** in the event create/update payload
  (`registrationQuestions`), so the create/edit form stays one round-trip.
- `GET /general-events/{id}` and `GET /general-events` return `registrationQuestions`.
- Registrations list returns each registration's answers.
- `GET /general-events/{id}/registration-questions/summary` returns per-question:
  `[{ questionId, label, totals: [{ optionLabel, count }], answeredCount }]` for the tally UI.
- Public: `GET /api/public/.../{org}/events/{id}` includes `registrationQuestions`;
  the self-register payload accepts `answers`.

### Permissions
Reuses the existing `event.view` / `event.manage` scopes — no new permission category is
introduced (questions are managed on the event edit screen, answers on registrations).
No `031-data-role-permissions.xml` change required.

## Frontend

### Changed files
- `lib/generalEventApi.ts` — types + payload handling (questions + answers)
- `app/(dashboard)/general-events/new/page.tsx` — "Registration questions" builder shown
  when `generalEventType === 'OTHER'`
- `app/(dashboard)/general-events/[id]/edit/page.tsx` — same builder prefilled from the event
- `app/(dashboard)/general-events/[id]/page.tsx` — admin add/edit registration modal renders
  questions; registrations table shows answers; tally card; Excel/PDF export includes answers
- `app/(auth)/event-register/[id]/page.tsx` — public form renders questions + submits answers
- `lib/i18n/locales/en.json` + `lib/i18n/locales/nl.json` — new keys (both locales)

### Questions builder (admin, OTHER only)
- "Optional registration questions" panel with "Add question"
- Each question: label text, type select (single / multi / free text), required toggle
- Options editor for choice types (add/remove option rows, up/down order)
- Deletable questions; persisted only on event save (embedded in the create/update DTO)

### Question inputs (registration)
- SINGLE_CHOICE → radio group
- MULTI_CHOICE → checkbox group
- FREE_TEXT → text input
- Required questions validated client-side before submit

### Registration answers payload
```ts
answers: [{ questionId: number, optionIds?: number[], freeText?: string }]
```
The API layer serializes this; for display the registration DTO carries the chosen
labels per question.

## i18n
Add keys (en + nl) under a new `general_events.questions` section:
`title`, `add_question`, `label`, `type`, `single_choice`, `multi_choice`, `free_text`,
`required`, `add_option`, `remove`, `empty_hint`, `answer` plus UI strings on the public
register form and registration table/export columns.

## Migration/Changelog summary
- New Liquibase DDL file registered in `ddl/db.changelog-ddl.xml` (after `192-...`)
- FKs added in `999-add-all-foreign-keys.xml` under the events FK changeset block
  (guard with `tableExists` preconditions so fresh + existing DBs both work)
- `organization_id` FK → `organizations` on all three new tables
- `option_id` and `free_text` are both nullable; FREE_TEXT questions simply never set `option_id`

## Checklist mapping (per copilot-instructions)
- Entities `OrganizationAware` + listener + filter — yes
- Liquibase DDL with `organization_id` — yes
- FK entries incl. `mosques`/`organizations` — yes
- DTOs, repositories, services (constructor injection), controllers (no security annotations) — yes
- No Lombok; explicit constructors/getters/setters — yes
- i18n keys in `en.json` + `nl.json` — yes
- No new permission category (reuses `event.view`/`event.manage`)
