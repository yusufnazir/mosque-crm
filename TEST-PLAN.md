# Test Plan — Mosque CRM

Covers all automated test cases written for the system.
Two test layers: **Backend Integration Tests** (JUnit 5 / Spring Boot) and **Frontend E2E Tests** (Playwright).

---

## Test Infrastructure

### Backend Integration Tests

| Property | Value |
|---|---|
| Framework | JUnit 5 + Spring Boot Test |
| Profile | `integration` (`application-integration.properties`) |
| Server | Boots on a random port against a real MariaDB instance |
| Database | `mcrm` on `localhost:3307` |
| Auth | Real JWT login before each test class; tokens reused across methods |
| Run command | `mvn verify -P integration-tests` |

**Test data lifecycle (per class):**

1. `@BeforeAll` — `TestTenantFixture.setupAll()` inserts three isolated tenants with users, persons, documents, groups, and subscription plans directly into the database.
2. Tests run using the real endpoints with real JWT tokens.
3. `@AfterAll` — `TestTenantFixture.cleanupAll()` deletes all test rows in reverse order.

**Three test tenants created by the fixture:**

| Tenant | Username | Role | Plan |
|---|---|---|---|
| Alpha | `test_alpha_admin` | ADMIN | Pro |
| Alpha | `test_alpha_member` | MEMBER | Pro |
| Beta | `test_beta_admin` | ADMIN | Pro |
| Beta | `test_beta_member` | MEMBER | Pro |
| Starter | `test_starter_admin` | ADMIN | Starter |

Password for all test users: defined in `TestTenantFixture.TEST_PASSWORD`.

---

### Frontend E2E Tests

| Property | Value |
|---|---|
| Framework | Playwright 1.59.1 |
| Browser | Chromium |
| Base URL | `http://localhost:3002` |
| Workers | 1 (serial — avoids session conflicts) |
| Auth | `loginAs()` fills `#username` / `#password` form fields and submits |
| Session | Stored as httpOnly cookie `session_token` (BFF proxy pattern) |
| Run command | `cd frontend && npm run test:e2e` |

**Prerequisites:** Both `npm run dev` (port 3002) and `mvn spring-boot:run` (port 8080) must be running.

**Frontend test users (real accounts in the database):**

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `ahmed` | `password123` | MEMBER |

---

## Backend Integration Tests

### 1. `AuthenticationIT` — Authentication Contract

**Purpose:** Verify that the `/auth/login` endpoint behaves correctly for all credential scenarios, and that protected endpoints reject unauthenticated requests.

| # | Test | What it checks | Expected |
|---|---|---|---|
| 1 | Admin login succeeds | POST `/auth/login` with valid admin credentials | HTTP 200, `token` field present and non-blank |
| 2 | Member login succeeds | POST `/auth/login` with valid member credentials | HTTP 200, `token` field present |
| 3 | Wrong password returns 401 | POST `/auth/login` with correct username, wrong password | HTTP 401, `code = "invalid_credentials"` |
| 4 | Unknown username returns 401 | POST `/auth/login` with a username that does not exist | HTTP 401, `code = "invalid_credentials"` (same error as wrong password — prevents user enumeration) |
| 5 | No token returns 401/403 | GET `/persons` without `Authorization` header | HTTP 401 or 403 |
| 6 | Login response structure is complete | POST `/auth/login` as admin | Response body contains `token`, `role`, `organizationId`, `permissions`; `role = "ADMIN"` |
| 7 | Tokens are organization-scoped | Login as Alpha admin and Beta admin separately | The `organizationId` values in each token are different |

**Security note:** Tests 3 and 4 verify OWASP-compliant user enumeration prevention — both bad-password and unknown-user cases return the same generic error code.

---

### 2. `AdminRoleIT` — Admin Feature Access (Pro Plan)

**Purpose:** Verify that an ADMIN user on a Pro-plan tenant can reach all feature endpoints that are enabled for that plan.

**Actor:** `test_alpha_admin` (Alpha tenant, Pro plan)

#### Members
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 1 | Admin can list persons | GET `/persons` | HTTP 200 |
| 2 | Admin can create a person | POST `/persons` | HTTP 200/201; created record is deleted as cleanup |

#### Groups (`member.grouping`)
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 3 | Admin can list groups | GET `/groups` | HTTP 200 |
| 4 | Admin can create a group | POST `/groups` | HTTP 200/201; created record is deleted as cleanup |

#### Saved Member Filters (`member.saved_filters`)
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 5 | Admin can list saved member filters | GET `/members/filters` | HTTP 200 |

#### Communications (`communication.tools`)
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 6 | Admin can access communications | GET `/communications/messages` | HTTP 200 |

#### Documents (`document.management`)
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 7 | Admin can list document folders | GET `/document-folders` | HTTP 200 |
| 8 | Admin can list documents | GET `/documents` | HTTP 200 |
| 9 | Admin can view document by ID | GET `/documents/{id}` | HTTP 200 |
| 10 | Admin can delete a document | POST `/documents` then DELETE `/documents/{id}` | DELETE returns 200/204 |

#### Data Export (`data.export`)
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 11 | Admin can access data export | GET `/admin/export/members` | HTTP 200 |

#### Roles & Permissions (`roles.permissions`)
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 12 | Admin can list roles | GET `/admin/roles` | HTTP 200 |
| 13 | Admin can view permission pool | GET `/admin/roles/permissions` | HTTP 200 |

#### Always-on Features
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 14 | Admin can list events | GET `/events` | HTTP 200 |
| 15 | Admin can list memberships | GET `/memberships` | HTTP 200 |
| 16 | Admin can list application users | GET `/admin/users` | HTTP 200 |

---

### 3. `MemberRoleIT` — Member Role Boundary Enforcement

**Purpose:** Verify that a MEMBER user cannot access admin-only endpoints and can access their own self-service endpoints.

**Actor:** `test_alpha_member` (Alpha tenant, Pro plan, MEMBER role)

#### Blocked endpoints — must return HTTP 403
| # | Test | Endpoint | Reason |
|---|---|---|---|
| 1 | Cannot list all persons | GET `/persons` | admin-only |
| 2 | Cannot create a person | POST `/persons` | admin-only |
| 3 | Cannot list groups | GET `/groups` | admin-managed, no member permission |
| 4 | Cannot create a group | POST `/groups` | admin-managed |
| 5 | Cannot access communications compose/history | GET `/communications/messages` | admin tool |
| 6 | Cannot access data export | GET `/admin/export/members` | admin-only |
| 7 | Cannot list application users | GET `/admin/users` | admin-only |
| 8 | Cannot view roles | GET `/admin/roles` | admin-only |
| 9 | Cannot manage contribution types | GET `/contributions/types` | `contribution.view_types` required |
| 10 | Cannot delete a document folder | DELETE `/document-folders/{id}` | `document.manage` required |
| 11 | Cannot delete a document | DELETE `/documents/{id}` | `document.manage` required |

#### Allowed endpoints — member self-service
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 12 | Can access own profile | GET `/member/profile` | Not 401 or 500 (200 if person linked, 403 if no link — both acceptable) |
| 13 | Can view documents | GET `/documents` | HTTP 200 |
| 14 | Can view document folders | GET `/document-folders` | HTTP 200 |
| 15 | Can view document by ID | GET `/documents/{id}` | HTTP 200 |
| 16 | Can view own inbox | GET `/messages/inbox` | HTTP 200 |
| 17 | Can list saved filters | GET `/members/filters` | HTTP 200 |
| 18 | Can view current user info | GET `/me` | HTTP 200 |

---

### 4. `MultiTenancyIT` — Cross-Tenant Data Isolation

**Purpose:** Verify that a user from one tenant can never read, list, or delete data belonging to another tenant. The Hibernate `organizationFilter` enforces this by filtering all queries on `organization_id`, making cross-tenant records appear as if they do not exist (HTTP 404, not 403).

**Actors:** `test_alpha_admin` (Alpha), `test_alpha_member` (Alpha), `test_beta_admin` (Beta)

#### Cross-tenant person access
| # | Test | Actor | Target | Expected |
|---|---|---|---|---|
| 1 | Alpha admin cannot read Beta person by ID | Alpha admin | Beta person | HTTP 404 |
| 2 | Beta admin cannot read Alpha person by ID | Beta admin | Alpha person | HTTP 404 |
| 3 | Alpha person list excludes Beta persons | Alpha admin | GET `/persons` | Response items do not contain any Beta person IDs |
| 4 | Beta person list excludes Alpha persons | Beta admin | GET `/persons` | Response items do not contain any Alpha person IDs |

#### Cross-tenant document access
| # | Test | Actor | Target | Expected |
|---|---|---|---|---|
| 5 | Alpha admin cannot read Beta document | Alpha admin | Beta document | HTTP 404 |
| 6 | Beta admin cannot read Alpha document | Beta admin | Alpha document | HTTP 404 |
| 7 | Alpha admin cannot read Beta folder | Alpha admin | Beta folder | HTTP 404 |
| 8 | Alpha member cannot read Beta document | Alpha member | Beta document | HTTP 404 |
| 9 | Alpha document list excludes Beta documents | Alpha admin | GET `/documents` | No Beta document IDs in response |

#### Cross-tenant group access
| # | Test | Actor | Target | Expected |
|---|---|---|---|---|
| 10 | Alpha admin cannot read Beta group | Alpha admin | Beta group | HTTP 404 |
| 11 | Alpha group list excludes Beta groups | Alpha admin | GET `/groups` | No Beta group IDs in response |

#### Cross-tenant write attempts
| # | Test | Actor | Target | Expected |
|---|---|---|---|---|
| 12 | Alpha admin cannot delete Beta document | Alpha admin | DELETE Beta document | HTTP 404 (not 403 — entity is invisible) |
| 13 | Alpha admin cannot delete Beta person | Alpha admin | DELETE Beta person | HTTP 404 |

**Design note:** The response is 404 (not 403) because the Hibernate filter hides the entity entirely. A 403 would inadvertently confirm the entity exists — 404 is the safer, privacy-preserving response.

---

### 5. `PlanEntitlementIT` — Plan Feature Gating

**Purpose:** Verify that features gated by subscription plan are accessible to Pro-plan tenants and blocked (HTTP 403) for Starter-plan tenants.

**Actors:** `test_alpha_admin` (Pro plan), `test_starter_admin` (Starter plan)

| # | Feature key | Starter result | Pro result | Endpoints tested |
|---|---|---|---|---|
| 1–2 | `communication.tools` | HTTP 403 | HTTP 200 | GET `/communications/messages` |
| 3–4 | `member.grouping` | HTTP 403 | HTTP 200 | GET `/groups` |
| 5 | `member.saved_filters` | HTTP 200 | HTTP 200 | GET `/members/filters` — **no API-level plan gate; write-op gating only** |
| 6–7 | `data.export` | HTTP 403 | HTTP 200 | GET `/admin/export/members` |
| 8–9 | `roles.permissions` | HTTP 403 | HTTP 200 | GET `/admin/roles/permissions` |
| 10–12 | `document.management` | HTTP 403 | HTTP 200 | GET `/documents`, GET `/document-folders` |
| 13 | Always-on: `/me` | HTTP 200 | — | GET `/me` |
| 14 | Always-on: persons | HTTP 200 | — | GET `/persons` — member management is not plan-gated |

---

### 6. `DocumentAccessIT` — Document Module Access Control

**Purpose:** Detailed access control tests for the document management module, covering admin CRUD, member read-only boundaries, and cross-tenant isolation. Documents use `RICH_TEXT` type with no file bytes — no object-storage server required.

**Actors:** `test_alpha_admin`, `test_alpha_member`, `test_beta_admin`

#### Admin CRUD on document folders
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 1 | Admin can create a folder | POST `/document-folders` | HTTP 200/201; created folder deleted as cleanup |
| 2 | Admin can view a folder by ID | GET `/document-folders/{id}` | HTTP 200 |
| 3 | Admin can delete a folder | POST then DELETE `/document-folders/{id}` | DELETE 200/204 |

#### Admin CRUD on documents
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 4 | Admin can create a document | POST `/documents` (RICH_TEXT) | HTTP 200/201; deleted as cleanup |
| 5 | Admin can read a document by ID | GET `/documents/{id}` | HTTP 200 |
| 6 | Admin can list documents | GET `/documents` | HTTP 200 |
| 7 | Admin can delete a document | POST then DELETE `/documents/{id}` | DELETE 200/204 |

#### Member read-only access
| # | Test | Endpoint | Expected |
|---|---|---|---|
| 8 | Member can list documents | GET `/documents` | HTTP 200 |
| 9 | Member can view document by ID | GET `/documents/{id}` | HTTP 200 |
| 10 | Member can list document folders | GET `/document-folders` | HTTP 200 |
| 11 | Member cannot delete a document | DELETE `/documents/{id}` | HTTP 403 |
| 12 | Member cannot delete a folder | DELETE `/document-folders/{id}` | HTTP 403 |
| 13 | Member cannot create a folder | POST `/document-folders` | HTTP 403 |

#### Cross-tenant document isolation
| # | Test | Actor | Target | Expected |
|---|---|---|---|---|
| 14 | Alpha admin cannot read Beta document | Alpha admin | Beta document | HTTP 404 |
| 15 | Beta admin cannot read Alpha document | Beta admin | Alpha document | HTTP 404 |
| 16 | Alpha member cannot read Beta document | Alpha member | Beta document | HTTP 404 |
| 17 | Alpha admin cannot delete Beta document | Alpha admin | Beta document | HTTP 404 |

---

## Frontend E2E Tests

### 7. `auth.spec.ts` — Authentication Flow

**Purpose:** Verify that the login page works correctly for both user roles, that invalid credentials are rejected, that protected routes redirect to login, and that logout clears the session.

| # | Test | Flow | Expected |
|---|---|---|---|
| 1 | Admin can log in | Navigate to `/login` → fill `admin`/`admin123` → submit | URL no longer contains `/login`; sidebar `nav` is visible |
| 2 | Member can log in | Navigate to `/login` → fill `ahmed`/`password123` → submit | URL no longer contains `/login`; sidebar `nav` is visible |
| 3 | Invalid credentials show error | Navigate to `/login` → fill `nobody`/`wrongpassword` → submit | Stays on `/login`; body does not contain "Signing in…" |
| 4 | Unauthenticated access to `/dashboard` redirects | Navigate directly to `/dashboard` without logging in | Redirected to `/login`; `#username` input is visible |
| 5 | Admin logout clears session | Log in → call logout endpoint → navigate to `/dashboard` | Redirected to `/login` (session cookie cleared) |

---

### 8. `admin-navigation.spec.ts` — Admin Navigation & Page Access

**Purpose:** Verify that an admin user can see all administrative navigation items in the sidebar and successfully navigate to all admin pages.

| # | Test | Flow | Expected |
|---|---|---|---|
| 1 | Dashboard loads | Log in as admin → navigate to `/dashboard` | Sidebar visible; URL not on `/login` |
| 2 | Sidebar shows Members | Log in as admin | Sidebar `nav` contains "Members" text |
| 3 | Sidebar shows Users | Log in as admin | Sidebar `nav` contains "Users" text |
| 4 | Sidebar shows Roles | Log in as admin | Sidebar `nav` contains "Roles" text |
| 5 | Navigate to `/users` | Log in → go to `/users` | URL stays on `/users`; sidebar visible |
| 6 | Navigate to `/roles` | Log in → go to `/roles` | URL stays on `/roles`; sidebar visible |
| 7 | Navigate to `/members` | Log in → go to `/members` | URL stays on `/members`; sidebar visible |
| 8 | Navigate to `/export` | Log in → go to `/export` | URL stays on `/export`; sidebar visible |
| 9 | `/users` page loads data | Log in → go to `/users` → wait for load | Body does not contain "Authentication required"; contains "admin" |
| 10 (10→9+) | `/members` page loads data | Log in → go to `/members` → wait for load | Body does not contain "Authentication required" or "Access denied" |

Each test logs out in `afterEach` to prevent session bleed.

---

### 9. `member-access.spec.ts` — Member Role Access Restrictions

**Purpose:** Verify that a member user cannot see administrative navigation items, cannot obtain admin data even by navigating directly to admin URLs, and that the backend returns 403 for any admin API call made by a member's session.

**Actor:** `ahmed` (MEMBER role)

#### Sidebar visibility
| # | Test | Flow | Expected |
|---|---|---|---|
| 1 | Users link hidden | Log in as member | Sidebar does NOT contain "Users" text |
| 2 | Roles link hidden | Log in as member | Sidebar does NOT contain "Roles" text |
| 3 | Export link hidden | Log in as member | Sidebar does NOT contain "Export" text |
| 4 | Import link hidden | Log in as member | Sidebar does NOT contain "Import" text |

#### Direct URL access (bypassing the sidebar)
| # | Test | Flow | Expected |
|---|---|---|---|
| 5 | `/users` returns no admin data | Log in as member → navigate directly to `/users` | Page body does not contain "admin123"; no redirect to `/login` |
| 6 | `/roles` returns no role data | Log in as member → navigate directly to `/roles` | Page body does not contain "admin123" |
| 7 | `/export` returns no export data | Log in as member → navigate directly to `/export` | No redirect to `/login` (member is authenticated, just not authorised) |

#### Backend enforcement (network-level)
| # | Test | Flow | Expected |
|---|---|---|---|
| 8 | API call to `/admin/users` returns 403 | Log in as member → navigate to `/users` → intercept response | Intercepted `/api/admin/users` response status is 403 or 404 |
| 9 | API call to `/admin/roles` returns 403 | Log in as member → navigate to `/roles` → intercept response | Intercepted `/api/admin/roles` response status is 403 or 404 |

#### Pages the member is allowed to access
| # | Test | Flow | Expected |
|---|---|---|---|
| 10 | Can access `/dashboard` | Log in as member → navigate to `/dashboard` | URL on `/dashboard`; sidebar visible |
| 11 | Can access `/profile` | Log in as member → navigate to `/profile` | URL not on `/login`; sidebar visible |

Each test logs out in `afterEach`.

---

## Summary Counts

| Layer | File | Tests |
|---|---|---|
| Backend | `AuthenticationIT` | 7 |
| Backend | `AdminRoleIT` | 16 |
| Backend | `MemberRoleIT` | 18 |
| Backend | `MultiTenancyIT` | 13 |
| Backend | `PlanEntitlementIT` | 14 |
| Backend | `DocumentAccessIT` | 17 |
| **Backend total** | | **85** |
| Frontend | `auth.spec.ts` | 5 |
| Frontend | `admin-navigation.spec.ts` | 9 |
| Frontend | `member-access.spec.ts` | 12 |
| **Frontend total** | | **26** |
| **Grand total** | | **111** |

---

## How to Run

### Backend integration tests
```powershell
# Requires MariaDB running at localhost:3307 (db: mcrm, user: mcrm)
$env:JAVA_HOME = "C:\Users\User\.jdk\jdk-17.0.16"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
cd backend
mvn verify -P integration-tests
```

### Frontend E2E tests
```powershell
# Terminal 1 — start backend
cd backend ; mvn spring-boot:run

# Terminal 2 — start frontend
cd frontend ; npm run dev

# Terminal 3 — run tests
cd frontend
npm run test:e2e              # headless
npm run test:e2e:ui           # with Playwright UI explorer
npm run test:e2e:report       # show HTML report from last run
```
