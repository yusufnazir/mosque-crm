# Federation & Organization Partnership — Working Structure

> **Status:** Phases 1–3, A–D implemented (including public directory SEO). Business directory is a **plan LIMIT**: Free off, Starter 10, Growth 50, Pro unlimited (`business.directory`). Superadmin **Demo data** tab in `/settings` can one-shot seed a Suriname federation on an empty DB. Ratings deferred.  
> **Last updated:** July 2026  
> **Audience:** Developers and AI assistants working on federation, partnerships, and federated modules (business directory, public events)  
> **Process:** Spec-driven — update this document before implementing new federation behavior.

---

## Purpose

Extend the platform from a **flat single-tenant CRM** into a **generic hierarchical organization model** where:

- Any organization can exist independently (as today)
- Organizations can form **partnerships** under a parent organization
- Sub-organizations **opt in** to what they share — **default is nothing**
- Shareable **modules** use a common sharing framework

This design is **not mosque-specific**. A mosque federation (e.g. SIS in Suriname) is one use case; the same model applies to trade associations, denominational bodies, sports leagues, or any umbrella organization with member organizations underneath.

---

## Relationship to Codebase

| Area | Implementation |
|------|----------------|
| Tenant isolation | Unchanged: `organization_id` + Hibernate `organizationFilter` for private CRM data |
| Hierarchy | Explicit `organization_partnerships` table (not `parent_organization_id` on `organizations`) |
| Org role labels | Derived from partnerships — **no** `organization_type` column |
| Business directory | `businesses` + `business_listings` (separate from member-export “directory” reports) |
| Cross-org reads | Federation endpoints only; gated by partnership + share settings |

**Key files:**

- `backend/src/main/java/com/mosque/crm/entity/Organization.java` — tenant anchor; optional `federationInviteCode`
- `backend/src/main/java/com/mosque/crm/entity/OrganizationPartnership.java`
- `backend/src/main/java/com/mosque/crm/entity/OrganizationShareSetting.java`
- `backend/src/main/java/com/mosque/crm/entity/Business.java` / `BusinessListing.java`
- `backend/src/main/java/com/mosque/crm/federation/FederationConstants.java`
- `backend/MULTI-TENANT-SECURITY.md` — flat tenant RBAC; federation does **not** add role rank/levels

---

## Core Concepts

### Organization (tenant anchor)

Each organization remains an independent tenant with its own members, settings, and CRM data. Partnerships add a **layer on top** — they do not replace tenant isolation for private data.

### Organization roles (conceptual)

| Role | Description |
|------|-------------|
| **Standalone** | No parent, no children — behaves as a normal tenant |
| **Federation / Parent** | Has one or more member orgs via active partnerships |
| **Member / Sub-organization** | Has joined a parent via an active partnership |

An org can be standalone today and become a parent or member later. **One active parent per member org** (enforced at activation).

---

## Partnership Model

Partnership is **explicit and consented** — not automatic by domain, signup, or naming.

### How partnerships are formed

```
Parent org                                   Member org
     |                                            |
     |  1. Invite (handle or invite code)         |
     +------------------------------------------->|
     |                                            |
     |  2. Request to join                        |
     |<-------------------------------------------+
     |                                            |
     v                                            v
Member accepts                             Parent approves
     |                                            |
     +--------------------+-----------------------+
                          v
                 Active partnership
                 (share settings created, all OFF)
```

**Two paths:**

1. **Parent invites** → `PENDING_INVITE` → member **accepts** → `ACTIVE`
2. **Member requests** → `PENDING_REQUEST` → parent **approves** → `ACTIVE`

Until accepted/approved, there is **no partnership** and **no data sharing**.

Target org is resolved by **exact handle** or **federation invite code** (`FED-` + 8 hex). Discovery: `GET /partnerships/discover?q=` (code, handle, or name/city search).

### Partnership states

| State | Meaning |
|-------|---------|
| `PENDING_INVITE` | Parent invited; member has not responded |
| `PENDING_REQUEST` | Member requested; parent has not approved |
| `ACTIVE` | Partnership established |
| `SUSPENDED` | Temporarily paused (either party) |
| `ENDED` | Dissolved (accept/reject decline, or explicit end) |

| Action | Who | Rule |
|--------|-----|------|
| Accept | Member | `PENDING_INVITE` → `ACTIVE` |
| Approve | Parent | `PENDING_REQUEST` → `ACTIVE` |
| Reject | Member (invite) or parent (request) | → `ENDED` (no separate REJECTED status) |
| Suspend / reactivate | Either party | `ACTIVE` ↔ `SUSPENDED` |
| End | Either party | → `ENDED` |
| Resend alert | Sender only | Pending invite/request → re-notify other party's admins |

Invite codes: `GET/POST /partnerships/invite-code` (`partnership.manage`). Any org can hold a code and act as parent when others join.

**Permissions:** `partnership.view`, `partnership.manage`

**Frontend:** `/partnerships` (Administration)

---

## Data Sharing — Opt-in, Default Nothing

**Critical principle:** The **member organization** decides what the parent (and optionally sibling orgs) can see. **Default: nothing is shared.**

Only the member org can update share settings for an active partnership.

### Shareable modules

| `module_key` | Purpose | Default |
|--------------|---------|---------|
| `business_directory` | Published business listings marked for federation | **Off** |
| `public_events` | Public events marked for federation | **Off** |

Defined in `FederationConstants.SHAREABLE_MODULES`. On partnership activation, rows are created with `enabled=false`, `shareLevel=PARENT_ONLY`.

### Share levels (within a module)

| Level | Parent sees shared data | Sibling member orgs see shared data |
|-------|-------------------------|-------------------------------------|
| `PARENT_ONLY` | Yes | No |
| `SIBLINGS` | Yes | Yes |
| `PUBLIC` | Yes | Yes (same query filter as `SIBLINGS`) |

**Important:** `share_level = PUBLIC` is **not** the public website. It is a DB/legacy level treated like siblings in federation queries. The Partnerships UI only offers **Parent only** and **Partner organizations** (maps stored `PUBLIC` → display as siblings).

### What never crosses boundaries

- Individual member PII, finances, internal CRM, GEDCOM, private events/documents/communications

These remain **strictly local** to the member org tenant.

---

## Visibility Model (Business Directory) — simplified

**Publish means visible.** There are no per-listing “partner” or “public website” toggles.

| Where it appears | When |
|------------------|------|
| **Org directory** (logged-in) | `status = PUBLISHED` |
| **Federation directory** (parent / siblings, logged-in) | `status = PUBLISHED` **and** member org has partnership module `business_directory` **enabled** (share level still applies). Parent may hide a listing via `federationHidden`. |
| **Org public website** `{handle}/directory` | Org tenant setting `BUSINESS_DIRECTORY_PUBLIC_ENABLED` **and** `status = PUBLISHED` for that org’s listings |
| **Parent public website** (federation host) | Same org gate **plus** aggregated published listings from active member orgs that enabled `business_directory` sharing (excluding `federationHidden`). Partner cards show “listed by [org]”. |

| Action | Effect |
|--------|--------|
| Admin **approves** | → `PUBLISHED` (live everywhere above that applies) |
| Admin **suspends** | → `SUSPENDED` (hidden from org directory, federation, and public website) |
| Owner edits a published listing | → `PENDING_APPROVAL` again (off until re-approved) |

**Member org public pages** (`baiturrochim…/directory`) show **only that org’s** published listings.  
**Parent/federation host public pages** (`sis…/directory`) show **own + federation** listings (see table above).

Legacy DB columns `visibility` and `public_visible` may still exist; product behavior ignores them for browse gates. On approve they are set to shared/public for compatibility; on suspend they are cleared.

Parent moderators can still **hide/unhide** a listing from federation aggregation (`federationHidden`) — that also removes it from the parent’s public directory.

---

## Business Directory Module

### Entities

**Business** — company profile (name, category, description, contact, website/logo), scoped to `organization_id`, optional `ownerPersonId`.

**BusinessListing** — publish layer:

| Field | Values / role |
|-------|----------------|
| `status` | `DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `SUSPENDED` |
| `visibility` / `public_visible` | Legacy fields; not used as product gates (see Visibility Model) |
| `federation_hidden` | Parent moderation flag |
| Suspension fields | Reason + audit when status is `SUSPENDED` |

Categories use global vocabulary tables (`business_categories` + translations), not org-scoped.

### Ownership

| Type | `ownerPersonId` | Who manages content |
|------|-----------------|---------------------|
| **Member-owned** | Set (via My Businesses) | Owner edits/deletes; admin **cannot** edit/delete |
| **Org-owned** | `null` (via Directory Admin) | Admins with `business_directory.manage` |

### Listing lifecycle

```
DRAFT ──submit──► PENDING_APPROVAL ──approve──► PUBLISHED
  ▲                      │                         │
  │                   reject                    suspend
  │                   (reason)                  (reason)
  │                      │                         │
  └──────────────────────┴──── owner edit / ───────┘
       (back to DRAFT)         resubmit
```

| Transition | Notes |
|------------|--------|
| Create (member) | Starts `DRAFT` |
| Submit | From `DRAFT`, `SUSPENDED`, or already pending → `PENDING_APPROVAL`; notifies org admins |
| Approve | → `PUBLISHED`; listing is live (org + public site if org gate on + federation if module shared) |
| Reject | **Reason required** → `DRAFT`; notifies owner |
| Owner edits while `PUBLISHED` | → `PENDING_APPROVAL`; notifies admins |
| Suspend | **Published + member-owned only**; reason required → `SUSPENDED`; off all directories; notifies owner |
| Owner delete | Allowed for draft/suspended/published; **blocked** while `PENDING_APPROVAL` |
| Org-owned unpublish | Via listing status / delete — **not** suspend |

### Permissions

Plan entitlement **`business.directory`** (LIMIT) is required in addition to the permissions below. Free = off; Starter = 10 listings; Growth = 50; Pro = unlimited. Creates are blocked at the limit (`PLAN_LIMIT_EXCEEDED`). Public directory also requires the host org’s plan to have the module enabled.

| Permission | Powers |
|------------|--------|
| `business_directory.view` | Browse published local + federation directory |
| `business_directory.register_own` | My Businesses CRUD / submit (own listings) |
| `business_directory.approve` | Approve / reject pending; suspend (with manage) |
| `business_directory.manage` | Org-owned CRUD; listing status; suspend member-owned |
| `business_directory.moderate` | Parent hide/unhide federation listings of active members |

### Frontend routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/directory` | Members with `view` (+ public on subdomain) | Browse published local + federation tab; paginated search |
| `/my-businesses` (+ `/new`, `/[id]/edit`) | `register_own` | Create/edit/submit own listings |
| `/business-directory/admin` (+ new/edit) | `manage` / `approve` / `moderate` | Pending queue, org-owned CRUD, suspend, federation hide |
| `/business-directory` | — | Redirects to `/directory` |

**Navigation:** Operations → Directory; Personal → My Businesses; Administration → Directory Admin + Partnerships.

### Key APIs (`/business-directory`)

| Endpoint | Role |
|----------|------|
| `GET /`, `POST /`, `PUT/DELETE /{id}`, `PUT /{id}/listing` | Admin manage (org-owned content rules) |
| `GET /published`, `/published/page` | Member browse (paginated) |
| `GET/POST /my`, `PUT/DELETE /my/{id}`, submit | Owner |
| `GET /pending-approval`, `POST /{id}/approve\|reject\|suspend` | Approver |
| `GET /federation`, `/federation/page` | Federation browse |
| `POST /federation/{listingId}/hide\|unhide` | Moderate |
| `GET /public/{orgHandle}` | Anonymous (`SecurityConfig` permitAll); supports page/size/search |

---

## Public Events (Second Shareable Module)

Same partnership + share-settings pattern as business directory (`module_key = public_events`):

- Events marked for federation appear in parent/sibling aggregation when the module is enabled
- Parent can hide/unhide from federation view
- Private CRM event data remains tenant-scoped otherwise

See `FederationPublicEventService` and related `GeneralEvent` federation fields.

---

## Notifications

In-app (bell + WebSocket) and email via `FederationNotificationService`.

| Event | Recipients | Link |
|-------|------------|------|
| Partnership invite | Member org admins | `/partnerships` |
| Partnership request | Parent org admins | `/partnerships` |
| Partnership activated | Both orgs’ admins | `/partnerships` |
| Invite/request rejected | Other party’s admins | `/partnerships` |
| Listing submitted | Org admins | `/business-directory/admin` |
| Approved / rejected / suspended | Owner | `/my-businesses` |
| Partnership suspended | Other party’s admins | `/partnerships` |
| Partnership reactivated | Other party’s admins | `/partnerships` |
| Partnership ended | Other party’s admins | `/partnerships` |

**Not notified:** federation hide/unhide.

Admin lookup for cross-org alerts runs **without** the Hibernate org filter so invitee admins are reachable from the inviter’s tenant context. Pending invite/request can use `POST /partnerships/{id}/resend-notification`.

---

## Auth & Multi-tenancy

- One `User` → one `organization_id` (except super admin with `organization_id = null`)
- No automatic user membership in the parent when a sub-org joins
- Keep Hibernate `organizationFilter` as default for private CRM
- Federation aggregation bypasses the filter only in controlled service/repository queries gated by partnership + share settings
- Partnership rows themselves are not tenant-filtered; service layer requires caller to be parent or member org

---

## Data Model (Implemented)

### `organization_partnerships`

| Field | Purpose |
|-------|---------|
| `parent_organization_id` | Federation / parent |
| `member_organization_id` | Sub-organization |
| `status` | `PENDING_INVITE`, `PENDING_REQUEST`, `ACTIVE`, `SUSPENDED`, `ENDED` |
| `initiated_by` | `PARENT` \| `MEMBER` |
| `initiated_at` / `accepted_at` / `ended_at` | Audit timestamps |
| `ended_by_user_id` | Audit |

### `organization_share_settings`

| Field | Purpose |
|-------|---------|
| `partnership_id` | Which partnership |
| `module_key` | e.g. `business_directory`, `public_events` |
| `enabled` | Boolean — **default `false`** |
| `share_level` | `PARENT_ONLY` \| `SIBLINGS` \| `PUBLIC` |

### Business directory

| Table | Purpose |
|-------|---------|
| `businesses` | Profiles, `organization_id`, optional owner `Person`, optional `logo_image_key` |
| `business_listings` | Status, visibility, public flag, federation hide, suspension |
| `business_categories` / translations | Global category vocabulary |

### `organizations` extension

| Field | Purpose |
|-------|---------|
| `federation_invite_code` | Optional `FED-XXXXXXXX` for discovery / join |

---

## Example Use Case: SIS Suriname

- **SIS** acts as federation parent; mosques remain independent tenants
- SIS invites a mosque (or mosque requests via handle/invite code)
- Each mosque opts in per module (business directory, public events) — default off
- Opted-in published listings appear for SIS and, if share level allows, sibling mosques
- Internet public directory: each mosque’s own published listings; **SIS (parent) public directory also aggregates** partner published listings when those partners share the business directory module
- Logged-in **Directory → Federation** remains available for authenticated parent/sibling browse
- Federation browse for SIS is the logged-in **Directory → Federation** tab, not SIS’s anonymous public page
- Members, finances, families stay within each mosque

---

## Phase C (implemented)

### C1 — Partnership lifecycle notifications

When a partnership is **suspended**, **reactivated**, or **ended**, notify the **other party’s** org admins (in-app + email), same delivery path as invite/active/reject.

| Event | Recipients | Include reason if provided | Link |
|-------|------------|----------------------------|------|
| Suspend | Other org admins | Yes | `/partnerships` |
| Reactivate | Other org admins | No | `/partnerships` |
| End | Other org admins | Yes | `/partnerships` |

Notification types: `PARTNERSHIP_SUSPENDED`, `PARTNERSHIP_REACTIVATED`, `PARTNERSHIP_ENDED`.

### C2 — True DB paging for federation listings

`GET /business-directory/federation/page` must page **in the database**, not load all federation listings into memory then slice.

Acceptance:

- Parent and sibling queries return `Page<BusinessListing>` (or equivalent) with search + category filters applied in JPQL/SQL
- Count query matches content filters
- Categories for filter chips come from a distinct federation category query (same visibility rules as the list)
- Parent still sees `federationHidden` rows; siblings do not
- Existing UI pagination continues to work unchanged

### C3 — Business logo upload

Optional logo image per business, stored in object storage (same limits/types as profile images), served through the backend (no direct MinIO URLs).

| Aspect | Spec |
|--------|------|
| Storage | `businesses.logo_image_key` |
| Upload/replace/delete | Owner (`register_own` on own business) or admin (`manage` on org-owned only) |
| Authenticated serve | `GET /business-directory/{id}/logo` |
| Public serve | `GET /business-directory/public/{orgHandle}/{businessId}/logo` — only when org public directory is enabled and listing is `PUBLISHED` |
| DTO | `logoUrl` when a logo exists (e.g. `/api/business-directory/{id}/logo`) |
| UI | Upload/replace/remove on My Businesses and Directory Admin edit flows; show logo on directory cards when present |

Uploading a logo does **not** by itself change listing status (unlike content edits of a published listing).

### Deferred (not Phase C)

- Ratings / reviews

---

## Phase D — Public directory SEO (implemented)

Public business directory pages must be crawlable and shareable.

### Routes (tenant subdomain)

| URL | Purpose |
|-----|---------|
| `/directory` | Public list (SSR HTML + metadata). Logged-in users keep interactive local/federation browse. |
| `/directory/{id}-{slug}` | Public business detail (SSR). `{slug}` is derived from name for readability; **id** is authoritative. |
| `/directory/sitemap.xml` | Sitemap of the public list + each public detail URL for this tenant |
| `/robots.txt` | Allows crawling of `/directory` when public directory is enabled; points to sitemap |

### Metadata (list + detail)

- Unique `<title>` and meta description (org-aware; federation hosts mention partners)
- Canonical absolute URL on the tenant host
- Open Graph + Twitter card tags (title, description, URL; logo/OG image when available)
- `robots`: `index,follow` when public directory enabled; `noindex` when disabled / not found

### Structured data (JSON-LD)

- List page: `CollectionPage` / `ItemList` of businesses; `Organization` for the host
- Detail page: `LocalBusiness` (name, description, url, image, address, telephone, email, `sameAs` social links); include `parentOrganization` / provider attribution when listed by a partner org on a federation host

### Backend APIs

| Endpoint | Role |
|----------|------|
| `GET /business-directory/public/{orgHandle}` | Existing paged list (unchanged) |
| `GET /business-directory/public/{orgHandle}/{id}` | Single public business (own listing, or federation member listing on parent host) |
| `GET /business-directory/public/{orgHandle}/sitemap-entries` | Compact id/name/updated list for sitemap generation |

### Non-goals

- Ratings / reviews
- Indexing authenticated-only federation tabs
- Changing tenant subdomain routing

---

## Open Questions (Still Open)

1. **Cross-mosque members** — If someone belongs to two orgs, one listing or two? (Today: one user, one org.)
2. **Parent → sub content** — Can parent push policies/announcements down?
3. **Federation billing** — Parent pays for sub-orgs, or each org bills independently?
4. **Listing attribution** — Show only org name vs link to member identity in federation views?

### Resolved during implementation

- Approval workflow: member submit → admin approve → publish; federation share via listing visibility + module setting
- Parent moderation: hide/unhide from federation aggregation
- Discovery: name/handle/city search + invite codes
- Member-owned moderation: suspend with reason (not admin edit/delete)
- Public website: org gate + **published** listings (no per-listing public toggle)
- Simplified publish model: publish = visible; suspend = off; federation via org module share only
- Parent public directory aggregates federation listings
- Phase D SEO: list + detail metadata/OG, JSON-LD, sitemap

---

## Summary

**Any organization can stand alone or join a parent via invite or request. Sub-organizations control per-module sharing with default nothing shared. Business directory and public events are the shareable modules. Listing lifecycle includes draft → pending → published → (optional) suspended. Parent public directories aggregate partner listings. Phase D makes the public directory SEO-ready (SSR metadata, detail pages, JSON-LD, sitemap). Private CRM data remains tenant-isolated.**

When changing federation features, read this document first alongside `backend/MULTI-TENANT-SECURITY.md` and the entities listed above. Also update this document **before** implementing new federation behavior (spec-driven).
