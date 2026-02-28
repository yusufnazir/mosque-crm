# Next.js Frontend — Complete Feature Inventory

> **Purpose**: Source of truth for what must exist in the mobile app.  
> **Generated from**: Full code analysis of `frontend/` directory.  
> **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS  

---

## Table of Contents

1. [Authentication & Session Management](#1-authentication--session-management)
2. [Navigation & Layout](#2-navigation--layout)
3. [Dashboard](#3-dashboard)
4. [Members Module](#4-members-module)
5. [Contributions Module](#5-contributions-module)
6. [Groups Module](#6-groups-module)
7. [Users Module](#7-users-module)
8. [Roles & Permissions Module](#8-roles--permissions-module)
9. [Privileges Module](#9-privileges-module)
10. [Currencies Module](#10-currencies-module)
11. [Mosques Module](#11-mosques-module)
12. [Reports Module](#12-reports-module)
13. [Settings Module](#13-settings-module)
14. [Account & Profile (Member Portal)](#14-account--profile-member-portal)
15. [Import Module](#15-import-module)
16. [Family Tree / Genealogy Module](#16-family-tree--genealogy-module)
17. [Reusable Components](#17-reusable-components)
18. [Cross-Cutting Concerns](#18-cross-cutting-concerns)
19. [API Endpoints Summary](#19-api-endpoints-summary)
20. [Permission Catalog](#20-permission-catalog)

---

## 1. Authentication & Session Management

### 1.1 Login (`/login`)
- **Form fields**: username, password
- **API**: `POST /api/auth/login` → sets `session_token` httpOnly cookie
- **Validation**: Required fields; shows translated error codes (`account_disabled`, `account_locked`, `login_failed`)
- **Post-login logic**:
  - Stores `personId` and `memberId` in `localStorage`
  - Syncs language preference from backend (`syncLanguageWithBackend()`)
  - If `mustChangePassword === true` → redirects to `/set-password`
  - Otherwise → redirects to `/dashboard`
- **State**: `useState` for form fields, error, loading

### 1.2 Forgot Password (`/forgot-password`)
- **Form fields**: username
- **API**: `POST /api/auth/forgot-password`
- **Behavior**: Shows success message after submission regardless of result (security)
- **State**: `useState` for username, success, error, loading

### 1.3 Reset Password (`/reset-password`)
- **Form fields**: newPassword, confirmPassword
- **API**: `POST /api/auth/reset-password` with token from URL query param
- **Validation**: Min 6 characters, passwords must match
- **Post-reset**: Auto-redirects to `/login` after 3 seconds

### 1.4 Set Password (First Login) (`/set-password`)
- **Form fields**: newPassword, confirmPassword
- **API**: `POST /api/auth/set-password`
- **Validation**: Min 6 characters, passwords must match
- **Post-set**: Redirects to `/dashboard`

### 1.5 Session Management
- **Middleware** (`middleware.ts`): Edge middleware checks `session_token` cookie
  - No cookie + protected route → redirect to `/login`
  - Has cookie + `/login` → redirect to `/dashboard`
  - Has cookie + `/` → redirect to `/dashboard`
  - Public paths: `/login`, `/forgot-password`, `/reset-password`
- **Auth Context** (`AuthContext.tsx`): Global auth provider
  - Fetches `/api/me` on mount
  - Provides: `user`, `can(permission)`, `canAny(...permissions)`, `isSuperAdmin`, `selectedMosque`, `selectMosque()`, `activeMosqueName`, `refresh()`, `clearAuth()`
  - CurrentUser: `id`, `username`, `email`, `mosqueId`, `mosqueName`, `superAdmin`, `personId`, `permissions[]`, `roles[]`, `selectedMosqueId`, `selectedMosqueName`, `mustChangePassword`, `preferences`
- **BFF Pattern**: All API calls go to `/api/*` on same origin (Next.js API routes), which proxy to Spring Boot at `localhost:8080`. JWT stored in httpOnly cookie, never in JS.

---

## 2. Navigation & Layout

### 2.1 Dashboard Layout (`app/(dashboard)/layout.tsx`)
- Wraps all authenticated pages
- Contains `Sidebar` component
- Mobile: hamburger toggle for sidebar
- Desktop: persistent sidebar

### 2.2 Sidebar (`components/Sidebar.tsx`, 444 lines)

**Navigation Items** (each gated by `permission`):

| Label Key | Route | Permission | Icon |
|-----------|-------|------------|------|
| Dashboard | `/dashboard` | `dashboard.view` | Grid |
| Members | `/members` | `member.view` | Users |
| Groups | `/groups` | `group.view` | UsersGroup |
| Contributions | `/contributions` | `contribution.view` | Currency |
| Currencies | `/currencies` | `currency.view` | Dollar |
| Reports | `/reports` | `report.view` | ChartBar |
| Import | `/import` | `import.execute` | Upload |
| My Profile | `/profile` | `profile.view` | User |
| Users | `/users` | `user.view` | ShieldCheck |
| Roles | `/roles` | `role.view` | Key |
| Privileges | `/privileges` | `privilege.view` | Lock |
| Mosques | `/mosques` | `organization.manage` | Building |
| Settings | `/settings` | `settings.view` | Cog |

> **Note**: Family Tree (`/family-tree`) nav item exists but is **commented out** in Sidebar.

**Sidebar Features**:
- Permission-filtered menu: items hidden when user lacks permission
- Panel label: "Admin Panel" vs "Member Portal" based on permissions
- User menu dropdown: Account link, Change Password modal trigger, Logout
- **Super Admin Mosque Selector**: Dropdown to switch mosque context, persists in `localStorage`
- Regular users see their mosque name displayed
- Language selector (`LanguageSelector` component)
- Configurable app name via `AppNameContext`
- Mobile-responsive: overlay with close button

---

## 3. Dashboard

### Route: `/dashboard`
### Permission: `dashboard.view`

**Content**:
- **Stats Cards**: Total Families (from `familyApi.getAll()`), Active Members (from `memberApi.getStats()`)
- **Dashboard Charts** (`DashboardCharts.tsx`, Chart.js):
  - Income by Contribution Type (stacked bar, year selector, multi-currency)
  - Members by Age & Gender (grouped bar chart)
  - Family Size Distribution (bar chart, children per family)
  - Age Distribution (bar chart)
  - Gender Distribution (pie chart)
- **Quick Actions**: "Add New Member" (if `member.create`), "View Members" (if `member.view`)

**APIs used**:
- `GET /api/families` — family count
- `GET /api/members/stats` — member stats
- `GET /api/families/size-distribution` — family size chart
- `GET /api/members/age-distribution` — age chart
- `GET /api/members/gender-distribution` — gender pie
- `GET /api/members/age-gender-distribution` — age-gender grouped bar
- `GET /api/reports/contribution-totals?year=X&lang=Y` — income chart
- `GET /api/payments/years` — year selector options

---

## 4. Members Module

### 4.1 Members List (`/members`)
**Permission**: `member.view`

| Feature | Details |
|---------|---------|
| **Pagination** | Server-side, page sizes: 10/20/50/100 |
| **Search** | Debounced (400ms), searches all fields server-side |
| **Sorting** | Columns: firstName, email, status |
| **Views** | Mobile: card list / Desktop: table |
| **Row actions** | View (→ detail page), Edit (→ edit page) |
| **Status display** | Color-coded badges (ACTIVE/INACTIVE/SUSPENDED/DECEASED) |

**API**: `GET /api/members/paged?page=X&size=Y&search=Q&sortBy=F&sortDir=D`

### 4.2 Add Member (`/members/add`)
**Permission**: `member.create` (implied)

**Form fields**:
- Personal: firstName\*, lastName\*, email, phone, dateOfBirth\*, gender\* (MALE/FEMALE/OTHER)
- Address: address, city, country, postalCode
- Membership: status (ACTIVE/INACTIVE/SUSPENDED/DECEASED), startDate, endDate
- **Optional Account Creation**: checkbox → shows username, password, role assignment (fetches roles from `/admin/roles`)

**Validation**: Required fields marked with \*; client-side checks  
**API**: `POST /api/members`

### 4.3 Member Detail (`/members/[id]`, 1960 lines)
**Permission**: `member.view`

**3 Tabs**: Overview, Family, Finance

#### Overview Tab
- **Personal Info Card**: email, phone, DOB, gender, date of death (editable inline), member since, username, status, address
- **Quick Actions Grid** (6 buttons):
  - Manage Family → opens FamilyManagementModal
  - Add Payment → opens Payment modal
  - Add Exemption → opens Exemption modal
  - View Finances → switches to Finance tab
  - View Family → switches to Family tab
  - Mark as Deceased → date picker confirmation (only if not already deceased)

#### Family Tab
- **Sub-tabs**: Immediate Family / Full Genealogy
- **Immediate Family** (`FamilyTree` component): Shows parents, spouse, children, siblings as clickable cards. Navigation between member profiles.
- **Full Genealogy** (`GenealogyTree` component): D3.js DAG visualization using `d3-dag`. Nodes: person (blue/pink by gender) and family units (green). Interactive zoom/pan. Click person → navigate.
- **Manage Family button** → opens `FamilyManagementModal`

#### Finance Tab
- **Member Payments** (paginated table/cards):
  - Year filter dropdown
  - Add Payment button
  - Table columns: type, amount (with currency), date, period, reference
  - Row actions: Receipt (print/download/share), Edit, Delete
  - Pagination controls (rows per page selector + prev/next)
  - Total summary at bottom
- **Contribution Assignments** (read-only table):
  - Type, period, active/inactive status
- **Contribution Exemptions** (table with CRUD):
  - Type, exemption type (FULL/FIXED_AMOUNT/DISCOUNT_AMOUNT/DISCOUNT_PERCENTAGE), amount, reason, period, status
  - Add Exemption button
  - Row actions: Edit, Delete

**Member Selector**: Quick-navigate dropdown to jump between members

**Header Actions**: Edit Member button, Manage Family button  
**Summary Stats Cards**: Total Payments, Active Assignments, Active Exemptions, Family Members count

**APIs used**:
- `GET /api/members/{id}` — member data
- `GET /api/genealogy/persons/{personId}/relationships` — family relationships
- `GET /api/members` — all members (for relationship mapping + selector)
- `GET /api/genealogy/persons/{personId}/graph` — genealogy DAG data
- `GET /api/contribution-types` — contribution types
- `GET /api/mosque-currencies` — currencies for mosque
- `GET /api/member-payments/person/{personId}/paged` — paginated payments
- `GET /api/member-payments/person/{personId}/years` — available years
- `GET /api/contribution-assignments/person/{personId}` — assignments
- `GET /api/contribution-exemptions/person/{personId}` — exemptions
- `POST /api/member-payments` — create payment
- `PUT /api/member-payments/{id}` — update payment
- `DELETE /api/member-payments/{id}` — delete payment
- `POST /api/contribution-exemptions` — create exemption
- `PUT /api/contribution-exemptions/{id}` — update exemption
- `DELETE /api/contribution-exemptions/{id}` — delete exemption
- `POST /api/persons/{id}/mark-deceased` — mark as deceased

### 4.4 Edit Member (`/members/[id]/edit`)
**Permission**: `member.manage` (implied)

Same form as Add, pre-populated. Additional:
- Account enable/disable checkbox
- Role assignment (excludes SUPER_ADMIN role)

**API**: `PUT /api/members/{id}`

---

## 5. Contributions Module

### Route: `/contributions` (3044 lines)
### Permission: `contribution.view`

**5 Tabs**: Types, Obligations, Payments, Exemptions, Assignments

**Summary Cards** (desktop only): Total Types (active count), Required Types count, Total Payments count

### 5.1 Types Tab
- **List**: All contribution types with translated names, required/active badges
- **Actions per type**: Edit, Activate/Deactivate (with ConfirmDialog)
- **Create/Edit Modal** (`TypeModal`):
  - Fields: code, isRequired, isActive
  - **Translations**: name + description per locale (EN/NL)
- **APIs**: 
  - `GET /api/contribution-types`
  - `POST /api/contribution-types`
  - `PUT /api/contribution-types/{id}`
  - `PUT /api/contribution-types/{id}/activate`
  - `PUT /api/contribution-types/{id}/deactivate`

### 5.2 Obligations Tab
- **List**: Obligation records with type, amount, frequency, currency, dates
- **Filters**: Only required + active types for create
- **Create/Edit Modal** (`ObligationModal`):
  - Fields: contributionTypeId, amount, frequency (MONTHLY/YEARLY), startDate, endDate, currencyId
- **APIs**:
  - `GET /api/contribution-obligations`
  - `POST /api/contribution-obligations`
  - `PUT /api/contribution-obligations/{id}`
  - `DELETE /api/contribution-obligations/{id}`

### 5.3 Payments Tab
- **Paginated list** with search, year filter, page size selector
- **Person search**: Inline autocomplete to select person
- **Create Payment Modal** (`PaymentModal`):
  - Fields: person (search), contributionType, amount, paymentDate, periodFrom, periodTo, reference, notes, currencyId
  - **Periodic Payment Creation**: Can create multiple payments for a date range (monthly/yearly splits), with skip detection for existing entries
- **Row actions**: View (read-only modal), Edit, Delete (ConfirmDialog), Reverse (ConfirmDialog), Receipt
- **Permission-gated actions**: `contribution.create_payment`, `contribution.edit_payment`, `contribution.delete_payment`, `contribution.reverse`, `contribution.edit_reversal`, `contribution.delete_reversal`
- **APIs**:
  - `GET /api/member-payments/paged`
  - `POST /api/member-payments`
  - `POST /api/member-payments/periodic` — multi-period split
  - `PUT /api/member-payments/{id}`
  - `DELETE /api/member-payments/{id}`
  - `POST /api/member-payments/{id}/reverse`

### 5.4 Exemptions Tab
- **List**: Exemptions with person name, type, exemption kind, amount, reason, period, status
- **Create/Edit Modal** (`ExemptionModal`):
  - Fields: person (search), contributionType, exemptionType (FULL/FIXED_AMOUNT/DISCOUNT_AMOUNT/DISCOUNT_PERCENTAGE), amount, reason, startDate, endDate, isActive
- **APIs**:
  - `GET /api/contribution-exemptions`
  - `POST /api/contribution-exemptions`
  - `PUT /api/contribution-exemptions/{id}`
  - `DELETE /api/contribution-exemptions/{id}`

### 5.5 Assignments Tab
- **List**: Assignments with person name, type, period, active toggle
- **Create/Edit Modal** (`AssignmentModal`):
  - Fields: person (search), contributionType (required + active only), startDate, endDate, notes
- **Actions**: Edit, Delete (ConfirmDialog), Toggle Active/Inactive
- **APIs**:
  - `GET /api/contribution-assignments`
  - `POST /api/contribution-assignments`
  - `PUT /api/contribution-assignments/{id}`
  - `DELETE /api/contribution-assignments/{id}`
  - `PUT /api/contribution-assignments/{id}/toggle`

---

## 6. Groups Module

### 6.1 Groups List (`/groups`)
**Permission**: `group.view`

| Feature | Details |
|---------|---------|
| **Search** | Client-side filter by translated name/description |
| **Views** | Mobile: card list / Desktop: table |
| **Columns** | Name (+ avatar initial), Description, Members count, Status (Active/Inactive), Start Date |
| **Row actions** | View (→ detail page), Delete (ConfirmDialog) |
| **i18n** | Group names resolve: current locale → EN fallback → raw name |
| **Create Modal** | Bilingual name/description (EN + NL fieldsets), start/end dates |

**APIs**:
- `GET /api/groups`
- `POST /api/groups` (with translations[])
- `DELETE /api/groups/{id}`

### 6.2 Group Detail (`/groups/[id]`, 954 lines)
**Permission**: `group.view`

**Group Info**: Name, description, status, dates, member count. Edit button → modal.

**Edit Group Modal**: Same fields as create, pre-populated + isActive toggle.

**Members Section**:
- Search/filter members in group
- Table with: name, role (from GroupRole or freetext), start/end dates, status (active/expired)
- Avatar with hash-based color assignment
- **Add Member**: Opens `MemberSearchModal` (search by name/email, 2-step: select person → set role/dates)
- **Edit Member**: Inline modal with role dropdown (from group roles), start/end dates, active toggle
- **Remove Member**: ConfirmDialog

**Roles Section**:
- List of group-level roles with translated names, sort order, max members, active status
- **Create/Edit Role Modal**: Bilingual name (EN/NL), sort order, max members, isActive
- **Delete Role**: ConfirmDialog

**APIs**:
- `GET /api/groups/{id}`
- `PUT /api/groups/{id}` (with translations[])
- `GET /api/groups/{id}/members`
- `POST /api/groups/{id}/members`
- `PUT /api/group-members/{id}`
- `DELETE /api/group-members/{id}`
- `GET /api/groups/{id}/roles`
- `POST /api/groups/{id}/roles`
- `PUT /api/group-roles/{id}`
- `DELETE /api/group-roles/{id}`

---

## 7. Users Module

### Route: `/users` (625 lines)
### Permission: `user.view`

| Feature | Details |
|---------|---------|
| **Search** | Client-side by username, email, role, mosque name |
| **Views** | Mobile: card list / Desktop: table |
| **Columns** | Username (+ linked person name, "You" badge), Email, Roles (badges), Mosque, Status (Active/Inactive/Locked), Last Login |

**CRUD Operations**:
- **Create User Modal**: username\*, password\*, email, role checkboxes, enabled toggle
- **Edit User Modal**: email, password (optional change), role checkboxes, enabled toggle. Username is read-only on edit.
- **Toggle Enabled**: Quick action button per user (except self)
- **Delete User**: ConfirmDialog (except self)

**APIs**:
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/{id}`
- `DELETE /api/admin/users/{id}`
- `PUT /api/admin/users/{id}/toggle-enabled`
- `GET /api/admin/roles` (for role checkboxes)

---

## 8. Roles & Permissions Module

### Route: `/roles` (537 lines)
### Permission: `role.view`

**Layout**: 2-panel (sidebar role list + main permission editor)

**Role List** (left panel):
- All roles with permission count badge (`assigned/assignable`)
- Create Role button → modal (name, description)
- Click to select and load permissions

**Permission Editor** (right panel):
- Grouped by category with expand/collapse
- Category-level checkbox (select all/none, indeterminate state)
- Individual permission checkboxes
- Only shows permissions from the role's "assignable pool"
- **Unsaved changes indicator** + Save button
- **Edit Role button** → modal (name, description)
- **Delete Role button** → ConfirmDialog (protected: SUPER_ADMIN cannot be deleted)

**APIs**:
- `GET /api/admin/roles`
- `POST /api/admin/roles` (create)
- `PUT /api/admin/roles/{id}` (edit name/desc)
- `DELETE /api/admin/roles/{id}`
- `PUT /api/admin/roles/{id}/permissions` (update assigned permissions)
- `GET /api/admin/roles/permissions` (all available permissions)

---

## 9. Privileges Module

### Route: `/privileges` (590 lines)
### Permission: `privilege.view`

**Purpose**: Super-admin tool to control the "assignable permission pool" — which permissions are available for role assignment across the system.

**Features**:
- **Search**: Filter by code, description, category
- **Status filter**: All / Changed only
- **Category groups**: Expand/collapse individual or all
- **Checkboxes**: Toggle each permission's availability in the pool
- **Change tracking**: Visual indicator for unsaved changes, count badge
- **Summary**: X/Y permissions available count
- **Responsive**: Desktop table / Mobile card groups

**APIs**:
- `GET /api/admin/roles/permissions` — all permissions
- `GET /api/admin/roles/pool` — current assignable pool
- `PUT /api/admin/roles/pool` — save updated pool

---

## 10. Currencies Module

### Route: `/currencies` (855 lines)
### Permission: `currency.view`

**3 Tabs**: Mosque Currencies, Exchange Rates, Available Currencies

### 10.1 Mosque Currencies Tab
- List of currencies added to current mosque
- Set Primary (badge + action), Toggle Active (switch), Remove (ConfirmDialog)
- **Add Currency Modal**: Search + select from available currencies not yet added
- First currency auto-set as primary
- Mobile: card list / Desktop: table

### 10.2 Exchange Rates Tab
- List of exchange rates between mosque currencies
- **Create/Edit Modal**: from currency, to currency, rate, effective date
- Delete with ConfirmDialog

### 10.3 Available Currencies Tab
- Browse all global currencies (code, name, symbol)
- Client-side search filter
- Read-only reference list

**APIs**:
- `GET /api/currencies` — all global currencies
- `GET /api/mosque-currencies` — mosque currencies
- `POST /api/mosque-currencies`
- `PUT /api/mosque-currencies/{id}`
- `PUT /api/mosque-currencies/{id}/set-primary`
- `DELETE /api/mosque-currencies/{id}`
- `GET /api/exchange-rates`
- `POST /api/exchange-rates`
- `PUT /api/exchange-rates/{id}`
- `DELETE /api/exchange-rates/{id}`

---

## 11. Mosques Module

### Route: `/mosques`
### Permission: `organization.manage` (client-side gate)

| Feature | Details |
|---------|---------|
| **Table** | Name (+ short name), City/Country, Contact (email/phone), Status badge |
| **Create/Edit Modal** | name\*, shortName, city, country, address, postalCode, phone, email, website, active checkbox |
| **No Delete** | Only create + edit operations |

**APIs**:
- `GET /api/mosques`
- `POST /api/mosques`
- `PUT /api/mosques/{id}`

---

## 12. Reports Module

### Route: `/reports` (880 lines)
### Permission: `report.view`

**Report Catalog** (card-based selector):

### 12.1 Payment Summary Report
- **Table**: Member name (lastName, firstName) + columns per contribution type + total column
- **Multi-currency**: Separate sub-columns per currency code
- **Pagination**: Server-side (10/20/50/100 per page)
- **Year filter**: Dropdown of available payment years
- **Export Excel**: Fetches ALL rows (unpaginated), generates `.xlsx` via `xlsx` library
- **Export PDF**: Fetches ALL rows, generates landscape A4 PDF via `jsPDF` + `jspdf-autotable`

### 12.2 Contribution Totals Report
- **Table**: Contribution type code + name, total per currency, grand total row
- **Year filter**: Same as above
- **Export Excel**: `.xlsx` with grand total row
- **Export PDF**: Landscape A4 with styled grand total row

**APIs**:
- `GET /api/reports/payment-summary?year=X&lang=Y&page=P&size=S` — paginated
- `GET /api/reports/payment-summary/all?year=X&lang=Y` — for export (all rows)
- `GET /api/reports/contribution-totals?year=X&lang=Y`
- `GET /api/payments/years` — available years

---

## 13. Settings Module

### Route: `/settings`
### Permission: `settings.view`

**3 Tabs**: General, Mail Server, Document Management

### 13.1 General Tab
- **App Name**: Text input → saved to `/api/configurations`
- **App Base URL**: Text input → saved to `/api/configurations`
- Updates `AppNameContext` on save

### 13.2 Mail Server Tab
- **Fields**: SMTP Host, Username, Password, Project UUID
- **Save**: `PUT /api/configurations/mail-server`
- **Test Connection**: `POST /api/configurations/mail-server/test`
- Toast feedback for test result

### 13.3 Document Management Tab
- "Coming soon" placeholder

**APIs**:
- `GET /api/configurations/APP_NAME`
- `GET /api/configurations/APP_BASE_URL`
- `POST /api/configurations` (save key/value)
- `GET /api/configurations/mail-server`
- `PUT /api/configurations/mail-server`
- `POST /api/configurations/mail-server/test`

---

## 14. Account & Profile (Member Portal)

### 14.1 Account Page (`/account`)
- **Read-only fields**: username, role (first role displayed)
- **Editable**: email (save button → `PUT /api/users/me/email`)
- **Change Password**: Triggers `ChangePasswordModal`
- **Linked Member Profile**: If personId exists, shows personal info card (name, email, phone, member since, status)
- **APIs**: `GET /api/users/me`, `PUT /api/users/me/email`, `GET /api/portal/profile`

### 14.2 Member Profile (`/profile`)
**Permission**: `profile.view`

- **Personal Info display**: Name, email, phone, status, partner, date of death (if deceased)
- **Family Tree** with 2 sub-tabs:
  - **Immediate Family**: `FamilyTree` component (parents, spouse, children)
  - **Genealogy**: `GenealogyTree` component (D3 DAG graph)
- **No profile state**: Shows "contact admin" message if no personId linked
- **APIs**: `GET /api/portal/profile`, `GET /api/genealogy/persons/{id}/relationships`, `GET /api/members`, `GET /api/genealogy/persons/{id}/graph`

---

## 15. Import Module

### Route: `/import`
### Permission: `import.execute`

**Features**:
- File upload: `.xlsx` / `.xls` only
- Mosque must be selected (super admin warning)
- **Confirmation dialog** before upload (ConfirmDialog component)
- Multi-part form upload: `POST /api/admin/import/excel` (with `X-Mosque-Id` header)
- **Results display**: Total records, successfully processed, skipped, errors count, warnings count
- **Error/Warning details**: Expandable with individual messages
- **Required columns** (Dutch): NAAM, VOORNAMEN, ADRES, POSTCODE, WOONPLAATS, TELEFOONNUMMER, EMAIL, GEBOORTEDATUM, GESLACHT, LID_VANAF

---

## 16. Family Tree / Genealogy Module

### 16.1 Complete Family Tree (`/family-tree`)
- **Note**: Sidebar nav item is **commented out** — page exists but is not navigable
- Full-graph visualization of all persons in the mosque
- Uses `GenealogyTree` component (D3 DAG)
- Legend: Male (blue), Female (pink), Family Unit (green)
- **API**: `GET /api/genealogy/graph/complete`

### 16.2 Person Family Management (`/persons/[personId]/family`)
- **Purpose**: Add/remove GEDCOM relationships for a person
- **Add Relationship Form**: Person search (debounced 300ms), relationship type (FATHER/MOTHER/SPOUSE/CHILD)
- **Current Relationships**: Grouped by type, with icons (👨/👩/💑/👶) and color badges
- Remove relationship with `confirm()` dialog
- **APIs**:
  - `GET /api/genealogy/persons/{id}/relationships`
  - `POST /api/genealogy/persons/{id}/relationships`
  - `DELETE /api/genealogy/persons/{id}/relationships/{relId}`
  - `GET /api/members/search?q=Q` (person search)

### 16.3 Person Genealogy View (`/persons/[personId]/genealogy`)
- D3 DAG visualization for a single person's family tree
- Click node → navigate to that person's genealogy view
- Legend: Male (blue), Female (pink), Family Unit (green)
- **API**: `GET /api/genealogy/persons/{id}/graph`

---

## 17. Reusable Components

### 17.1 UI Components

| Component | File | Description |
|-----------|------|-------------|
| `Button` | `Button.tsx` | Variants: primary/secondary/danger/ghost. Sizes: sm/md/lg. Emerald/gold/red theme. |
| `Card` / `CardHeader` / `CardContent` / `CardTitle` | `Card.tsx` | White card with rounded corners, shadow, gray border. |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Modal dialog with title, message, cancel/confirm buttons. Variants: danger (red), warning (amber), default (emerald). |
| `ToastNotification` | `ToastNotification.tsx` | Fixed top-right toast. Types: success/error/info/warning. Auto-dismiss (3s default). Close button. |
| `LanguageSelector` | `LanguageSelector.tsx` | Dropdown to switch EN/NL. Styled for sidebar (emerald background). |
| `PWARegister` | `PWARegister.tsx` | Service worker registration (production only). Checks for updates every 60 min. |

### 17.2 Modal Components

| Component | File | Description |
|-----------|------|-------------|
| `ChangePasswordModal` | `ChangePasswordModal.tsx` | Portal-rendered. Fields: old password, new password, confirm. Min 6 chars validation. |
| `FamilyManagementModal` | `FamilyManagementModal.tsx` | 2 tabs: Partner (search + link), Children (search + link OR create new). Member search. |
| `MemberSearchModal` | `MemberSearchModal.tsx` | 2-step: search members → assign role/dates. Used by Groups. Supports predefined GroupRoles. |
| `PaymentReceiptModal` | `PaymentReceiptModal.tsx` | Receipt display with mosque info. Actions: Print (new window), Download PDF (html2canvas + jsPDF), Share (Web Share API as PNG). |

### 17.3 Visualization Components

| Component | File | Description |
|-----------|------|-------------|
| `GenealogyTree` | `GenealogyTree.tsx` (339 lines) | D3.js DAG graph using `d3-dag` (Sugiyama layout). SVG rendering with zoom/pan. Nodes: persons (rectangles, blue/pink) and family units (circles, green). Edges: vertical links. Click handler. |
| `FamilyTree` | `family-tree.tsx` (219 lines) | Card-based immediate family view. Shows parents → current member + spouse → children. Clickable cards navigate to member pages. Gender-colored avatars. |
| `ComprehensiveFamilyTree` | `comprehensive-family-tree.tsx` | Extended family tree component (imported in member detail but `FamilyTree` is used for immediate view). |
| `DashboardCharts` | `DashboardCharts.tsx` (369 lines) | Chart.js components: Bar charts (income, family size, age, age-gender), Pie chart (gender). Year selector for income chart. |

---

## 18. Cross-Cutting Concerns

### 18.1 Internationalization (i18n)
- **Languages**: English (`en`), Dutch (`nl`)
- **Implementation**: `LanguageContext` + `useTranslation()` hook
- **Storage priority**: localStorage → cookie → browser language → default (en)
- **Backend sync**: `syncLanguageWithBackend()` on login; `preferencesApi.updateLanguage()` on change
- **Translation function**: `t(key, params?)` with nested dot notation and `{{param}}` interpolation
- **Locale files**: `lib/i18n/locales/en.json`, `lib/i18n/locales/nl.json`
- **All user-facing text** uses translation keys

### 18.2 Multi-Tenancy
- **Mosque scoping**: `X-Mosque-Id` header sent with every API request via `ApiClient`
- **Source**: `localStorage.getItem('selectedMosqueId')`
- **Super admin**: Can switch mosque via Sidebar selector; selection persisted
- **Regular users**: Mosque assigned at user level; displayed in sidebar

### 18.3 Responsive Design
- **Mobile-first**: All pages have responsive layouts
- **Pattern**: Mobile card lists + Desktop tables
- **Sidebar**: Overlay on mobile, persistent on desktop
- **Breakpoints**: `md:` (768px) for table/card switch; `sm:` for layout adjustments; `lg:` for multi-column layouts

### 18.4 State Management
- **Global state**: `AuthContext` (user, permissions), `LanguageContext` (language, translation), `AppNameContext` (app name)
- **Local state**: `useState` for all page-level data, form state, modals, loading, errors
- **No external state library** (no Redux, Zustand, etc.)
- **Data fetching**: Direct API calls in `useEffect` / `useCallback`, no SWR/React Query

### 18.5 Error Handling
- **API errors**: Caught in try/catch, displayed via `ToastNotification`
- **401 handling**: `ApiClient` auto-redirects to `/login` on 401 responses
- **Form validation**: Client-side required field checks, min length checks
- **Loading states**: Skeleton/pulse animations while data loads

### 18.6 PWA Support
- Service worker registration in production
- `manifest.json` for installability
- Offline page at `/offline`
- 60-minute update check interval

---

## 19. API Endpoints Summary

### Authentication
| Method | Endpoint | Used By |
|--------|----------|---------|
| POST | `/api/auth/login` | Login page |
| POST | `/api/auth/forgot-password` | Forgot password page |
| POST | `/api/auth/reset-password` | Reset password page |
| POST | `/api/auth/set-password` | Set password page |
| POST | `/api/auth/change-password` | Change password modal |
| GET | `/api/me` | AuthContext |
| GET | `/api/preferences` | Language sync |
| PUT | `/api/preferences/language` | Language change |

### Members
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/members` | Multiple (all members) |
| GET | `/api/members/paged` | Members list |
| GET | `/api/members/stats` | Dashboard |
| GET | `/api/members/{id}` | Member detail |
| GET | `/api/members/search?q=` | Person search |
| POST | `/api/members` | Add member |
| PUT | `/api/members/{id}` | Edit member |
| DELETE | `/api/members/{id}` | Delete member |
| GET | `/api/members/age-distribution` | Dashboard charts |
| GET | `/api/members/gender-distribution` | Dashboard charts |
| GET | `/api/members/age-gender-distribution` | Dashboard charts |

### Families
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/families` | Dashboard |
| GET | `/api/families/size-distribution` | Dashboard charts |

### Persons / Genealogy
| Method | Endpoint | Used By |
|--------|----------|---------|
| POST | `/api/persons/{id}/mark-deceased` | Member detail |
| GET | `/api/genealogy/persons/{id}/relationships` | Member detail, Profile, Person family |
| POST | `/api/genealogy/persons/{id}/relationships` | Person family page |
| DELETE | `/api/genealogy/persons/{id}/relationships/{relId}` | Person family page |
| GET | `/api/genealogy/persons/{id}/graph` | Member detail, Person genealogy, Profile |
| GET | `/api/genealogy/graph/complete` | Family tree page |

### Contributions
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/contribution-types` | Contributions, Member detail |
| POST | `/api/contribution-types` | Contributions |
| PUT | `/api/contribution-types/{id}` | Contributions |
| PUT | `/api/contribution-types/{id}/activate` | Contributions |
| PUT | `/api/contribution-types/{id}/deactivate` | Contributions |
| GET | `/api/contribution-obligations` | Contributions |
| POST | `/api/contribution-obligations` | Contributions |
| PUT | `/api/contribution-obligations/{id}` | Contributions |
| DELETE | `/api/contribution-obligations/{id}` | Contributions |
| GET | `/api/member-payments/paged` | Contributions |
| GET | `/api/member-payments/person/{id}/paged` | Member detail |
| GET | `/api/member-payments/person/{id}/years` | Member detail |
| POST | `/api/member-payments` | Contributions, Member detail |
| POST | `/api/member-payments/periodic` | Contributions |
| PUT | `/api/member-payments/{id}` | Contributions, Member detail |
| DELETE | `/api/member-payments/{id}` | Contributions, Member detail |
| POST | `/api/member-payments/{id}/reverse` | Contributions |
| GET | `/api/contribution-exemptions` | Contributions |
| GET | `/api/contribution-exemptions/person/{id}` | Member detail |
| POST | `/api/contribution-exemptions` | Contributions, Member detail |
| PUT | `/api/contribution-exemptions/{id}` | Contributions, Member detail |
| DELETE | `/api/contribution-exemptions/{id}` | Contributions, Member detail |
| GET | `/api/contribution-assignments` | Contributions |
| GET | `/api/contribution-assignments/person/{id}` | Member detail |
| POST | `/api/contribution-assignments` | Contributions |
| PUT | `/api/contribution-assignments/{id}` | Contributions |
| DELETE | `/api/contribution-assignments/{id}` | Contributions |
| PUT | `/api/contribution-assignments/{id}/toggle` | Contributions |

### Groups
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/groups` | Groups list |
| GET | `/api/groups/{id}` | Group detail |
| POST | `/api/groups` | Groups list |
| PUT | `/api/groups/{id}` | Group detail |
| DELETE | `/api/groups/{id}` | Groups list |
| GET | `/api/groups/{id}/members` | Group detail |
| POST | `/api/groups/{id}/members` | Group detail |
| PUT | `/api/group-members/{id}` | Group detail |
| DELETE | `/api/group-members/{id}` | Group detail |
| GET | `/api/groups/{id}/roles` | Group detail |
| POST | `/api/groups/{id}/roles` | Group detail |
| PUT | `/api/group-roles/{id}` | Group detail |
| DELETE | `/api/group-roles/{id}` | Group detail |

### Users & Roles & Privileges
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/admin/users` | Users page |
| POST | `/api/admin/users` | Users page |
| PUT | `/api/admin/users/{id}` | Users page |
| DELETE | `/api/admin/users/{id}` | Users page |
| PUT | `/api/admin/users/{id}/toggle-enabled` | Users page |
| GET | `/api/users/me` | Account page |
| PUT | `/api/users/me/email` | Account page |
| GET | `/api/admin/roles` | Roles page, Users page, Add member |
| POST | `/api/admin/roles` | Roles page |
| PUT | `/api/admin/roles/{id}` | Roles page |
| DELETE | `/api/admin/roles/{id}` | Roles page |
| PUT | `/api/admin/roles/{id}/permissions` | Roles page |
| GET | `/api/admin/roles/permissions` | Roles page, Privileges page |
| GET | `/api/admin/roles/pool` | Privileges page |
| PUT | `/api/admin/roles/pool` | Privileges page |

### Currencies
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/currencies` | Currencies page |
| GET | `/api/mosque-currencies` | Currencies page, Contributions |
| POST | `/api/mosque-currencies` | Currencies page |
| PUT | `/api/mosque-currencies/{id}` | Currencies page |
| PUT | `/api/mosque-currencies/{id}/set-primary` | Currencies page |
| DELETE | `/api/mosque-currencies/{id}` | Currencies page |
| GET | `/api/exchange-rates` | Currencies page |
| POST | `/api/exchange-rates` | Currencies page |
| PUT | `/api/exchange-rates/{id}` | Currencies page |
| DELETE | `/api/exchange-rates/{id}` | Currencies page |

### Mosques
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/mosques` | Mosques page |
| GET | `/api/mosques/active` | Sidebar (super admin), Receipts |
| GET | `/api/mosques/{id}` | — |
| POST | `/api/mosques` | Mosques page |
| PUT | `/api/mosques/{id}` | Mosques page |

### Reports
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/reports/payment-summary` | Reports page |
| GET | `/api/reports/payment-summary/all` | Reports export |
| GET | `/api/reports/contribution-totals` | Reports page, Dashboard charts |
| GET | `/api/payments/years` | Reports page, Dashboard charts |

### Settings / Configuration
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/configurations/{key}` | Settings, AppNameContext |
| POST | `/api/configurations` | Settings |
| GET | `/api/configurations/mail-server` | Settings |
| PUT | `/api/configurations/mail-server` | Settings |
| POST | `/api/configurations/mail-server/test` | Settings |

### Import
| Method | Endpoint | Used By |
|--------|----------|---------|
| POST | `/api/admin/import/excel` | Import page |

### Portal
| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/portal/profile` | Profile page, Account page |

---

## 20. Permission Catalog

All permissions used in the frontend for conditional rendering:

| Permission | Used In |
|------------|---------|
| `dashboard.view` | Sidebar nav, Dashboard page |
| `member.view` | Sidebar nav, Members list, Quick actions |
| `member.create` | Quick actions (Add Member button) |
| `member.manage` | (implied by edit page access) |
| `group.view` | Sidebar nav |
| `contribution.view` | Sidebar nav, Contributions page |
| `contribution.create_payment` | Payments tab |
| `contribution.edit_payment` | Payments tab |
| `contribution.delete_payment` | Payments tab |
| `contribution.reverse` | Payments tab |
| `contribution.edit_reversal` | Payments tab |
| `contribution.delete_reversal` | Payments tab |
| `currency.view` | Sidebar nav |
| `report.view` | Sidebar nav |
| `import.execute` | Sidebar nav |
| `profile.view` | Sidebar nav |
| `user.view` | Sidebar nav |
| `role.view` | Sidebar nav |
| `privilege.view` | Sidebar nav |
| `organization.manage` | Sidebar nav, Mosques page |
| `settings.view` | Sidebar nav |

**Super Admin** (`isSuperAdmin`): Used for mosque selector, some Contributions tab actions.

---

## File Structure Summary

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── set-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── account/page.tsx
│   │   ├── contributions/page.tsx          (3044 lines, 5 tabs)
│   │   ├── currencies/page.tsx             (855 lines, 3 tabs)
│   │   ├── dashboard/page.tsx
│   │   ├── family-tree/page.tsx            (nav commented out)
│   │   ├── groups/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx              (954 lines)
│   │   ├── import/page.tsx
│   │   ├── members/
│   │   │   ├── page.tsx
│   │   │   ├── add/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx               (1960 lines, 3 tabs)
│   │   │       └── edit/page.tsx
│   │   ├── mosques/page.tsx
│   │   ├── persons/
│   │   │   └── [personId]/
│   │   │       ├── family/page.tsx
│   │   │       └── genealogy/page.tsx
│   │   ├── privileges/page.tsx             (590 lines)
│   │   ├── profile/page.tsx
│   │   ├── reports/page.tsx                (880 lines)
│   │   ├── roles/page.tsx                  (537 lines)
│   │   ├── settings/page.tsx
│   │   └── users/page.tsx                  (625 lines)
│   ├── api/                                (BFF proxy routes)
│   └── offline/                            (PWA offline page)
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── ChangePasswordModal.tsx
│   ├── ConfirmDialog.tsx
│   ├── DashboardCharts.tsx
│   ├── FamilyManagementModal.tsx
│   ├── family-tree.tsx
│   ├── comprehensive-family-tree.tsx
│   ├── GenealogyTree.tsx
│   ├── LanguageSelector.tsx
│   ├── MemberSearchModal.tsx
│   ├── PaymentReceiptModal.tsx
│   ├── PWARegister.tsx
│   ├── Sidebar.tsx
│   └── ToastNotification.tsx
├── lib/
│   ├── api.ts                              (ApiClient + module APIs)
│   ├── contributionApi.ts
│   ├── currencyApi.ts
│   ├── familyApi.ts
│   ├── groupApi.ts
│   ├── mosqueApi.ts
│   ├── userApi.ts
│   ├── utils.ts
│   ├── AppNameContext.tsx
│   ├── auth/AuthContext.tsx
│   └── i18n/
│       ├── LanguageContext.tsx
│       └── locales/
│           ├── en.json
│           └── nl.json
├── types/index.ts
└── middleware.ts
```
