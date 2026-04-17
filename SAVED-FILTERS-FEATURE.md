# Saved Member Filters — Feature Specification

Gated by plan entitlement `member.saved_filters` (Growth & PRO plans).  
Basic free-text search remains available to all plans. Saved filters add structured filter criteria that users can name, store, and reapply.

---

## Feature Set

### 1. Advanced Filter Panel (always visible, but save/load gated)
The members list page gains a collapsible filter panel alongside the existing search bar. Filter criteria:

| Filter | Type | Values |
|---|---|---|
| Status | Multi-select | `ACTIVE`, `INACTIVE`, `PENDING` |
| Gender | Select | Any / Male / Female |
| Age range | Number range | Min age / Max age (years) |
| Has email | Toggle | Yes / No |
| Has phone | Toggle | Yes / No |
| Group membership | Multi-select | Any of the mosque's groups |
| Date joined | Date range | From / To |
| Membership plan | Multi-select | FREE, STARTER, GROWTH, PRO (or mosque's own plan names) |

Applying filters always resets to page 1 and combines with the existing free-text search term.  
Active filters show as removable chips below the search bar.

### 2. Saved Filters (gated by `member.saved_filters`)
- **Save current filter** — name the current filter combination and save it; button is disabled/hidden when feature is not available
- **My Saved Filters** — dropdown in the filter bar listing all saved filters for the current user + mosque
- **Load filter** — selecting a saved filter populates the filter panel and triggers a new search
- **Delete saved filter** — remove from list (with confirmation)
- **Default filter** — mark one saved filter as the default; it auto-applies when the members page opens (replaces the "show all" default load)
- Saved filters are **per-user per-mosque** — not shared between users (v1)

### 3. Quick-access filters (optional, v1.5)
Pinned shortcut buttons above the member list for the most commonly used filters (e.g., "Active members", "New this month"). Could be derived from admin-defined saved filters.

---

## Backend Implementation Plan

### New DB Table: `saved_member_filters`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | |
| `organization_id` | BIGINT FK → `organizations.id` | multi-tenancy |
| `created_by_user_id` | BIGINT FK → `users.id` | owner; only owner can delete |
| `name` | VARCHAR(100) | display name |
| `filter_json` | TEXT | serialized filter criteria (see below) |
| `is_default` | BOOLEAN DEFAULT FALSE | auto-apply on members page load |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**`filter_json` schema** (stored as JSON string):
```json
{
  "statuses": ["ACTIVE"],
  "gender": "MALE",
  "minAge": 18,
  "maxAge": 65,
  "hasEmail": true,
  "hasPhone": null,
  "groupIds": [12, 34],
  "joinedFrom": "2024-01-01",
  "joinedTo": null
}
```
Null fields are ignored (no constraint applied). Frontend serialises only set fields.

### Entities
- `SavedMemberFilter` — implements `OrganizationAware`, `@FilterDef`/`@Filter` for multi-tenancy, `@EntityListeners(OrganizationEntityListener.class)`

### DTOs
- `SavedMemberFilterDTO` — id, name, filterJson, isDefault, createdAt
- `SavedMemberFilterRequest` — name, filterJson (on create/update)
- `MemberFilterCriteria` — typed Java class with all filter fields, for use in service-layer query building

### Repository: `SavedMemberFilterRepository`
```java
List<SavedMemberFilter> findByCreatedByUserId(Long userId);
Optional<SavedMemberFilter> findByCreatedByUserIdAndIsDefaultTrue(Long userId);
```

### Service: `SavedMemberFilterService`
- `listFilters(userId)` → `List<SavedMemberFilterDTO>` (user's saved filters for current mosque)
- `createFilter(userId, request)` → `SavedMemberFilterDTO`
- `updateFilter(id, userId, request)` → `SavedMemberFilterDTO` (own filters only)
- `deleteFilter(id, userId)` (own filters only)
- `setDefault(id, userId)` — unsets previous default, sets new one

### Members query extension (`PersonService` / `PersonRepository`)
Add a `getPagedFiltered(MemberFilterCriteria criteria, Pageable pageable)` method.  
Implement using JPA `Specification<Person>` (or `CriteriaBuilder`) to compose dynamic WHERE clauses based on which fields in `MemberFilterCriteria` are non-null.  
Group filter (`groupIds`) requires a subquery or join through `group_members`.

### Controller: `SavedMemberFilterController`
`@RequestMapping("/members/filters")`  
No `@PlanFeatureRequired` on the controller — the save/load endpoints check the feature at the service level so that the **advanced filter panel itself** (which is always rendered) can still call the server without a feature gate. Only the persist/load operations are gated.

| Method | Path | Description |
|---|---|---|
| `GET` | `/members/filters` | List user's saved filters |
| `POST` | `/members/filters` | Save a new filter (requires `member.saved_filters`) |
| `PUT` | `/members/filters/{id}` | Rename / update criteria (requires `member.saved_filters`) |
| `DELETE` | `/members/filters/{id}` | Delete (requires `member.saved_filters`) |
| `POST` | `/members/filters/{id}/set-default` | Set as default (requires `member.saved_filters`) |

The existing `GET /members` endpoint is extended to accept structured filter query params (status, gender, minAge, maxAge, hasEmail, hasPhone, groupIds, joinedFrom, joinedTo). These params are available to all plans — only the saved/loaded persistence layer is gated.

### Permissions
Add to `030-data-permissions.xml` (next sequential IDs after current max):
- `member.saved_filters.view` — View and load saved filters (category: `member`)
- `member.saved_filters.manage` — Create, update, and delete saved filters (category: `member`)

Assign both to ADMIN role in `031-data-role-permissions.xml`.

### Liquibase
- DDL: new file `09X-create-saved-member-filters-table.xml` (use next available DDL sequence number)
- FK: add FK entry to `999-add-all-foreign-keys.xml` (fk_saved_filter_org, fk_saved_filter_user)
- No DML seed needed

---

## Frontend Implementation Plan

### Members Page Changes (`app/(dashboard)/members/page.tsx`)

**Filter panel state** (added to existing page state):
```ts
const [filterOpen, setFilterOpen] = useState(false);
const [criteria, setCriteria] = useState<MemberFilterCriteria>({});
const [savedFilters, setSavedFilters] = useState<SavedMemberFilterDTO[]>([]);
const [activeSavedFilter, setActiveSavedFilter] = useState<SavedMemberFilterDTO | null>(null);
```

**Filter bar layout** (below the search input):
```
[Search input ........] [Filters ▼] [Save filter] [Saved filters ▼]
[chip: Status: Active ×] [chip: Has email ×]
```
- "Filters" button toggles the collapsible panel
- "Save filter" button only rendered when `hasFeature('member.saved_filters')` && criteria is non-empty
- "Saved filters" dropdown only rendered when `hasFeature('member.saved_filters')`
- Active filter chips always visible regardless of entitlement (visual feedback for applied criteria)

**Filter panel fields** (inside `<FilterPanel>` component):
- Status multi-select checkboxes
- Gender radio group
- Age range (two number inputs)
- Has email / Has phone toggles
- Group multi-select (only if `hasFeature('member.grouping')`)
- Date joined range (two date inputs)

**API call changes**: `memberApi.getPaged()` extended to pass structured filter fields alongside existing `search`, `sortBy`, `direction` params.

**Save filter modal**: Name input + confirm → calls `savedFilterApi.create({ name, filterJson })`.

**Saved filters dropdown**: List of user's saved filters, click to load; each row has a "×" delete button; current default marked with a star.

### New API Client (`lib/savedFilterApi.ts`)
```ts
savedFilterApi.list()
savedFilterApi.create(request)
savedFilterApi.update(id, request)
savedFilterApi.delete(id)
savedFilterApi.setDefault(id)
```

### TypeScript Types (`types/` or inline)
```ts
interface MemberFilterCriteria {
  statuses?: string[];
  gender?: string;
  minAge?: number;
  maxAge?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
  groupIds?: number[];
  joinedFrom?: string;
  joinedTo?: string;
}

interface SavedMemberFilterDTO {
  id: number;
  name: string;
  filterJson: string; // JSON-encoded MemberFilterCriteria
  isDefault: boolean;
  createdAt: string;
}
```

### i18n
Add keys to `en.json` and `nl.json` under `"members"` or a new `"saved_filters"` section:
- `members.filter_panel` — "Filters"
- `members.save_filter` — "Save Filter"
- `members.saved_filters` — "Saved Filters"
- `members.filter_name_label` — "Filter Name"
- `members.no_saved_filters` — "No saved filters yet"
- `members.filter_saved` — "Filter saved"
- `members.filter_deleted` — "Filter deleted"
- `members.set_default` — "Set as Default"
- `members.filter_status` — "Status"
- `members.filter_gender` — "Gender"
- `members.filter_age` — "Age Range"
- `members.filter_has_email` — "Has Email"
- `members.filter_has_phone` — "Has Phone"
- `members.filter_groups` — "Group Membership"
- `members.filter_joined` — "Date Joined"
- `members.clear_filters` — "Clear All"

---

## Constraints & Notes

- **Filter panel is always rendered** — structured filter params are applied on all plans; saving/loading is gated
- **Filter params are additive with search** — `?search=ahmed&status=ACTIVE` both apply
- **Group filter requires `member.grouping`** — the group filter field is hidden if grouping isn't available on the plan
- **Default filter + localStorage fallback** — if the user has a default saved filter, it loads on page open; otherwise no prefilter. No localStorage persistence needed (server-stored default is sufficient)
- **Filter sharing** — v1 is per-user only; admin cannot create shared/mosque-wide filter presets (v2 scope)
- **No backend filter at FREE/STARTER** — the query param extension does apply to all plans, meaning even FREE users can apply ad-hoc structured filters; they just can't save them. This is intentional — the gated value is the ergonomic save/load, not the filter itself.

---

## Implementation Order

1. Liquibase DDL (`saved_member_filters`) + FK entries
2. `SavedMemberFilter` entity + `SavedMemberFilterRepository`
3. `PersonService` / `PersonRepository` — add `Specification`-based filtered query; extend `GET /members` to accept filter params
4. `SavedMemberFilterService` + `SavedMemberFilterController`
5. Permission seed + ADMIN role assignments
6. Frontend: extend `memberApi.getPaged()` with filter params
7. Frontend: `FilterPanel` component + chip display + clear
8. Frontend: `savedFilterApi.ts` API client
9. Frontend: "Save filter" modal + "Saved filters" dropdown — render gated by `hasFeature('member.saved_filters')`
10. i18n keys (en + nl)
11. Update `ENTITLEMENT-ENFORCEMENT-STATUS.md`
