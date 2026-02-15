# Mosque CRM Project Instructions

## IMPORTANT: Mandatory Documentation Check for AI Assistants
- **READ ALL DOCUMENTATION FIRST**: Before generating ANY code, AI assistants must read and understand all project documentation
- **NO LOMBOK ALLOWED**: This project strictly prohibits Lombok annotations - see Coding Standards section below
- **Follow ALL guidelines**: Any code that violates these standards will be rejected

## Project Overview
This is a mosque member management system with two main components:
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Spring Boot 3.2.1 with Java 17, REST API and database
- **Architecture**: Separated security layer (users ≠ members), GEDCOM-based family tree module, role-based access control

## Big Picture Architecture
- **Security Layer**: Completely separated from member management - users can exist without member profiles and vice versa
- **GEDCOM Module**: Relationship-centric genealogy system following GEDCOM 5.5.1 standard - individuals connect through families, not direct relationships
- **Data Management**: Custom Liquibase pattern with Java-based UPSERT operations for seed/test data management
- **Frontend Integration**: Next.js communicates with Spring Boot backend via JWT-authenticated REST APIs

## Coding Standards
- **NO Lombok**: Do not use Lombok annotations (@Data, @Builder, @Slf4j, @RequiredArgsConstructor, @NoArgsConstructor, @AllArgsConstructor, @Getter, @Setter, etc.)
- Write explicit constructors, getters, and setters for Java classes
- Use standard SLF4J Logger initialization: `private static final Logger log = LoggerFactory.getLogger(ClassName.class);`
- Use constructor injection for dependencies (not @RequiredArgsConstructor)
- **NO Security Annotations in Controllers**: Do not add @PreAuthorize, @PermitAll, or other security annotations to controller methods. Security is handled at the configuration level, not in individual controllers.
- **Controllers Should Remain Open**: Backend controllers should not restrict access with security annotations - security is managed centrally in SecurityConfig.
- **GEDCOM Compliance**: Never add direct relationship fields to Individual entities; always use Family/FamilyChild join tables for relationships
- **IMPORTANT FOR AI ASSISTANTS**: When generating Java code, explicitly write out all boilerplate code (constructors, getters, setters) instead of using Lombok annotations. This is a strict project requirement.

## UI Standards
- **Confirmation Dialogs**: NEVER use browser `confirm()` for destructive or important actions. Always use the `ConfirmDialog` component (`@/components/ConfirmDialog`). Use `variant="danger"` for delete/remove actions, `variant="warning"` for deactivation, and `variant="default"` for neutral confirmations. The component requires: `open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `variant`, `onConfirm`, `onCancel`.
- **Toast Notifications**: Use `ToastNotification` component for success/error feedback after actions.
- **Color Palette**: Deep emerald green (#047857), warm gold (#D4AF37), soft cream (#FAFAF9), charcoal text (#1C1917)
- **Islamic Design**: Inspired by geometric patterns with clean typography and generous white space

## Critical Developer Workflows
- **Backend Development**: `cd backend && mvn spring-boot:run` (runs on http://localhost:8080/api)
- **Frontend Development**: `cd frontend && npm install && npm run dev` (runs on http://localhost:3000)
- **Database Migrations**: Liquibase runs automatically on startup; use UUID-based changeset IDs for data updates
- **Testing**: Use the provided PowerShell scripts (test-login.ps1, test-genealogy-endpoint.ps1, etc.) for integration testing
- **Security Testing**: Admin user (admin/admin123) has no member profile; member user (ahmed/password123) has MEMBER role but no profile link initially

## Project-Specific Conventions
- **GEDCOM ID Format**: Individuals use `@I<number>@` format (e.g., `@I1@`), Families use `@F<number>@` format (e.g., `@F1@`)
- **Relationship Queries**: Always query through Family/FamilyChild tables - never assume direct relationships on Individual entities
- **Data Updates**: When updating Liquibase DML data, change the UUID changeset ID to trigger re-execution with UPSERT logic

## Adding New Features / Views — Required Checklist
When adding a new feature or page to the application, AI assistants **MUST** complete ALL of the following steps. Missing any step will result in the feature being invisible or inaccessible to users.

### 1. Backend (Spring Boot)
- [ ] **Entities**: Create JPA entities implementing `MosqueAware` with `mosque_id` column, `@FilterDef`/`@Filter` for multi-tenancy, and `MosqueEntityListener`
- [ ] **Liquibase DDL**: Create table migration XML files (in `db/changelog/changes/ddl/`) with `mosque_id BIGINT` column
- [ ] **Liquibase FK**: Add foreign key constraints to `999-add-all-foreign-keys.xml` (including FK to `mosques` table)
- [ ] **DTOs**: Create request/response DTOs in the `dto` package
- [ ] **Repository**: Create Spring Data JPA repository interfaces
- [ ] **Service**: Create service classes with constructor injection
- [ ] **Controller**: Create REST controllers (no security annotations — access is managed centrally)

### 2. Permissions & Roles (CRITICAL — often missed!)
Every new view/feature needs its own permission category so admins can control access via the Roles & Permissions UI:
- [ ] **Define permissions** in `030-data-permissions.xml`: Add `<category>.view` and `<category>.manage` permissions with new sequential IDs. Use a unique UUID for each changeset ID.
- [ ] **Assign to roles** in `031-data-role-permissions.xml`: Add role-permission mappings for relevant roles (at minimum ADMIN should get all new permissions). Update the comment headers to reflect new permission counts.
- [ ] **Reference**: Current permissions are numbered sequentially (id=1 through id=18). New permissions should continue from id=19.
- [ ] **Categories in use**: `dashboard`, `member`, `family`, `finance`, `contribution`, `import`, `settings`, `user`, `profile`

### 3. Frontend
- [ ] **API client**: Create TypeScript API functions in `lib/` using the existing `ApiClient` pattern
- [ ] **Page component**: Create the page in `app/(dashboard)/<feature>/page.tsx` with `p-8` padding wrapper
- [ ] **Sidebar entry**: Add navigation item in `components/Sidebar.tsx` with the correct `permission: '<category>.view'` value
- [ ] **i18n translations**: Add translation keys to BOTH `lib/i18n/locales/en.json` AND `lib/i18n/locales/nl.json` (sidebar key + full feature section)
- [ ] **Multi-tenancy**: Frontend sends `X-Mosque-Id` header automatically via `ApiClient` — no extra work needed

## Integration Points & External Dependencies
- **JWT Authentication**: Token-based security with 24-hour expiration, stored in localStorage
- **Database**: MariaDB (development) with Liquibase for schema and data management
- **Email Templates**: FreeMarker templates for password reset and notifications
- **Frontend API Calls**: Use the `lib/api.ts` utility functions for authenticated requests
- **Family Tree Visualization**: D3.js-based genealogy trees in frontend components

## Important Documentation
- **Security Architecture**: See `backend/SECURITY.md` for complete security module documentation
  - **Users are independent** - No member profile required for login/authentication
  - **Users ≠ Members** - Separated authentication layer (users, roles, user_roles tables)
  - **Optional user-member linking** - Link table only used when members need portal access
  - JWT-based authentication with BCrypt password hashing
  - Role-based access control (ADMIN, MEMBER, TREASURER, IMAM)
  - Admin users typically don't have member profiles
  - `memberId` in login response can be null (frontend handles gracefully)
  
- **GEDCOM Family Tree Module**: See `backend/GEDCOM.md` for complete genealogy module documentation
  - **GEDCOM 5.5.1 standard** - Industry-standard genealogical data format
  - **Relationship-centric model** - NO direct spouse/parent fields on Individual entity
  - **All relationships through Family entities** - Children belong to families, not individuals
  - **Separate from security/membership** - Independent module with `gedcom_*` tables
  - **Complex family support** - Handles remarriage, adoption, half-siblings, multi-generational data
  - **ID format**: Individuals `@I1@`, Families `@F1@` (GEDCOM xref standard)
  - **Query pattern**: Always use join tables (Family, FamilyChild) to find relationships
  
- **Liquibase Data Pattern**: See `backend/LIQUIBASE.md` for data management documentation
  - Custom Java task changes for UPSERT operations
  - UUID-based changeset IDs enable data updates
  - Type-safe data classes extending CustomDataTaskChange
  - When updating data: change changeset ID to new UUID
  - **Folder Organization**: Each folder (ddl, dml) has consolidation file (db.changelog-ddl.xml, db.changelog-dml.xml)
  - **Master Changelog**: Only references folder consolidation files, never individual changesets
  - **DML Files**: Create one file per entity/table (e.g., 020-data-roles.xml, 021-data-users.xml)

## Project Status
- [x] Create copilot-instructions.md
- [x] Scaffold Next.js Frontend
- [x] Scaffold Spring Boot Backend
- [x] Setup Frontend Pages and Components
- [x] Setup Backend Entities and APIs
- [x] Configure Design System
- [x] Implement Separated Security Layer

## Getting Started

### Backend
```bash
cd backend
mvn spring-boot:run
```
Backend runs on http://localhost:8080/api

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:3000

## Login Credentials
- Admin: admin / admin123 (ADMIN role, no member profile)
- Member: ahmed / password123 (MEMBER role, no member profile yet)

**Note:** Both users can log in and access the dashboard. Member portal features requiring a member profile link will show 403 until user-member links are created.
