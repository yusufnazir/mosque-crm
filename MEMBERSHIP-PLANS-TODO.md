# Membership Plans Implementation TODO

Purpose: track all remaining work from the tier audit. Update this file as tasks are completed.

Legend:
- [ ] Not started
- [x] Done
- [~] In progress

## How To Use
- Keep this file as the single checklist for tier rollout.
- When a task is completed, change [ ] to [x].
- If partially done, use [~] and add a short note.

## Mandatory Definition of Done (Applies to Every Feature)
- [ ] Backend/API completed and tested (happy path + validation + permission checks)
- [ ] Webapp implementation completed and validated on responsive breakpoints
- [ ] Responsive QA passed on web: mobile width, tablet, desktop
- [ ] Mobile app implementation completed (if feature applies to members/admin mobile workflows)
- [ ] Mobile QA passed on Android and iOS layouts/states
- [ ] EN/NL localization updated for web and mobile (if user-facing text changed)
- [ ] Regression checks passed for related existing flows

Rule:
- A feature task cannot be marked [x] until all applicable items above are done.

## Phase 0 - Platform Foundation (Required Before Tier Enforcement)
- [x] Design and document subscription model (Starter, Growth, Pro, billing cycle) - see MEMBERSHIP-SUBSCRIPTION-MODEL.md
- [x] Add database tables for org subscriptions and plan entitlements
- [x] Add backend entities/repositories/services for subscription state
- [x] Add plan middleware/guard to enforce feature access by plan
- [x] Add plan-based admin user limit enforcement (Starter=2, Growth=5, Pro=unlimited)
- [x] Add API endpoint(s) for current organization plan and limits
- [ ] Add admin UI for viewing/updating org plan (internal management)
- [x] Add admin UI for viewing/updating org plan (internal management)
- [ ] Add audit logs for plan changes and entitlement violations
- [ ] Add automated tests for plan enforcement and user limits

## Phase 1 - Starter Completion

### Member Management
- [ ] Add explicit deactivate member action (clear lifecycle and UX)
- [ ] Add reactivate member action (if business allows)
- [ ] Add member notes field in backend model (DB + entity + DTO)
- [ ] Add member notes field in create/edit/detail UI
- [ ] Add member notes in mobile app forms and detail views
- [ ] Add tests for create/edit/deactivate/reactivate flows

### Member Search and Filters
- [ ] Add quick filters in members list: active, inactive, deceased
- [ ] Add membership-status filter chips/dropdown
- [ ] Add family/household filter option (where applicable)
- [ ] Add saved filter state in URL query params

### Import and Export
- [ ] Add CSV import support (backend parser + validations)
- [ ] Add CSV upload option in import UI
- [ ] Add import template download (CSV/Excel headers)
- [ ] Add explicit member-list export endpoint (CSV/Excel)
- [ ] Add member-list export buttons in members page
- [ ] Add import/export error report download

### Starter Reports
- [ ] Add starter report card: total members
- [ ] Add starter report card: active vs inactive members
- [ ] Add simple member list report export

## Phase 2 - Growth Features

### Member Self-Service Portal
- [ ] Add member profile update endpoint for self-service
- [ ] Add portal UI to edit own contact/profile data
- [ ] Add optional admin approval workflow for profile changes
- [ ] Add change request queue UI for admins
- [ ] Add notifications for approved/rejected profile changes

### Event Management
- [ ] Add event domain model (events, registrations, attendees)
- [ ] Add Liquibase migrations for events and registrations
- [ ] Add backend CRUD APIs for events
- [ ] Add registration API for members
- [ ] Add attendee list API for admins
- [ ] Add dashboard pages for event creation and management
- [ ] Add portal pages for event browsing and registration

### Notifications
- [ ] Add announcement model and API (create/publish/archive)
- [ ] Add reminder scheduler framework (cron/jobs)
- [ ] Add event reminder email notifications
- [ ] Add membership renewal reminder notifications
- [ ] Add notification preferences per member (email on/off)
- [ ] Add provider abstraction for future WhatsApp channel

### Portal Dashboard
- [ ] Add upcoming events widget for member dashboard
- [ ] Add announcements widget for member dashboard
- [ ] Add membership status summary card in portal dashboard

## Phase 3 - Pro Features

### Advanced Payments and Finance
- [ ] Add event fee payment linkage (event registrations to payment records)
- [ ] Add consolidated financial ledger/reporting view
- [ ] Add payment reconciliation tooling (manual)

### Advanced Reporting
- [ ] Add membership growth report (monthly/quarterly trends)
- [ ] Add churn/inactive report
- [ ] Add event participation report
- [ ] Add report builder filters (date range, segment, status)
- [ ] Add scheduled report exports

### Automation
- [ ] Add automation rules engine (trigger + action)
- [ ] Add rule: automatic renewal reminder
- [ ] Add rule: scheduled announcements
- [ ] Add automation run history and failure logs

### Integrations
- [ ] Add payment gateway integration interface
- [ ] Add first payment gateway implementation
- [ ] Add accounting export/integration interface
- [ ] Add messaging integration interface (WhatsApp/SMS future)
- [ ] Add API key management and external API access controls

## Cross-Cutting Quality and Operations
- [ ] Add end-to-end tests for key user journeys per tier
- [ ] Add permission matrix review for all new features
- [ ] Add localization keys for all new UI text (EN/NL)
- [ ] Add responsive QA checklist and sign-off template for every web feature
- [ ] Add mobile QA checklist and sign-off template for every mobile feature
- [ ] Add migration safety checks for new Liquibase changesets
- [ ] Add observability dashboards (errors, jobs, notification failures)
- [ ] Add rollout checklist and release notes template per phase

## Mobile App Alignment
- [ ] Add mobile support for member notes
- [ ] Add mobile support for improved filters/search
- [ ] Add mobile self-service profile updates (Growth)
- [ ] Add mobile events browsing/registration (Growth)
- [ ] Add mobile notifications center (Growth/Pro)
- [ ] Define feature parity matrix (web vs mobile) and track gaps per release

## Optional Long-Term Roadmap
- [ ] QR code event check-in
- [ ] Digital membership cards
- [ ] Donation campaigns
- [ ] Community directory with privacy controls

## Current Status Snapshot
- [x] Tier specification and audit documented in MEMBERSHIP-PLANS-FEATURE-AUDIT.md
- [ ] Implementation backlog execution started
