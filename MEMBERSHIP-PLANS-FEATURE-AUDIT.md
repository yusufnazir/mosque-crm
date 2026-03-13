# Membership Management Platform - Feature Tiers and Current Audit

## Goal
Define feature tiers for a generic Membership Management Platform used by organizations such as:
- mosques
- churches
- associations
- clubs
- NGOs
- community groups

This document includes:
- product tier specification (Starter, Growth, Pro)
- current application audit against those tiers
- identified gaps and future development priorities

## Pricing Model
| Plan | Price | Description |
|---|---:|---|
| Starter | $15/month | Basic membership management for small organizations |
| Growth | $30/month | Self-service member portal and engagement features |
| Pro | $60/month | Advanced automation, payments, and integrations |

Billing can be monthly or yearly.

## Core Concepts
### Organization
An organization represents a customer tenant of the platform.
Examples: mosque, church, sports club, NGO.

Each organization has:
- administrators
- staff users
- members

### Admin Users
Admin users manage the system and may have permissions for:
- member creation and edits
- payments/contributions management
- events
- communications

### Members
Members are registered people in the organization.
Members may optionally receive portal access.

## Feature Tier Specification

## Starter Plan ($15/month)
### Target users
Small organizations with simple needs (member database, contact records, basic reporting).

### Features
- Member management
  - create members
  - edit members
  - deactivate members
  - view member profiles
- Member profile fields (typical)
  - first name, last name, gender, date of birth
  - address, phone number, email
  - membership status, notes
- Family/household support
  - family linking (parent/child/spouse)
- Member search and filtering
  - active/inactive/families/membership status
- Basic reports
  - member count
  - active vs inactive
  - simple export (CSV/Excel)
- Admin user limit
  - up to 2 admin users
- Import
  - CSV/Excel import
- Export
  - member list export

### Excludes
- member portal
- event management
- automated notifications
- payment management
- integrations

## Growth Plan ($30/month)
### Target users
Organizations needing member engagement and self-service.

### Includes
All Starter features, plus:
- Member self-service portal
  - account creation/login
  - view/update profile and contact info
  - view membership status
  - optional admin approval workflow
- Event management
  - create events
  - registrations
  - attendee lists
- Notifications
  - reminders, announcements, renewal reminders
  - channels: email (now), WhatsApp (future)
- Member portal dashboard
  - profile summary
  - upcoming events
  - announcements
- Admin user limit
  - up to 5 admin users

## Pro Plan ($60/month)
### Target users
Larger organizations requiring automation and financial depth.

### Includes
All Growth features, plus:
- Payment management
  - dues/donations/contributions/event fees
  - payment records/history/reports
  - future online payment gateway support
- Advanced reporting
  - financial reports
  - membership growth
  - event participation
  - filtering + Excel/PDF export
- Automation
  - scheduled reminders and announcements
- Integrations
  - payment gateways
  - accounting software
  - messaging services
  - API access
- Admin users
  - unlimited

## Long-Term Roadmap
- Mobile app
- QR check-in
- Digital membership cards
- Donation campaigns
- Community directory with privacy controls

## Current Application Feature Audit (as of 2026-03-12)

### Starter
#### Member management
Status: Partially Implemented
Details:
- Create/edit/view are implemented.
- Status/deceased flows exist.
- A dedicated, explicit "deactivate member" lifecycle can be made clearer.
- Notes field is not clearly represented in core member profile APIs.

#### Family/household membership
Status: Implemented
Details:
- Relationship APIs and genealogy/family-tree UI are present.

#### Member search/filter
Status: Partially Implemented
Details:
- Search, sort, pagination are implemented.
- Rich filter UX (active/inactive/family presets) is limited.

#### Basic reports
Status: Partially Implemented
Details:
- Member stats and financial reports exist.
- Starter-specific "member list" reporting can be made more explicit.

#### Admin users (max 2)
Status: Not Implemented
Details:
- No plan/tier entitlement enforcement found.

#### Import
Status: Partially Implemented
Details:
- Excel import is implemented.
- CSV import is not present.

#### Export
Status: Partially Implemented
Details:
- Export is strong in reports (Excel/PDF).
- Explicit member-list export endpoint/flow is limited.

### Growth
#### Member self-service portal
Status: Partially Implemented
Details:
- Member login + profile retrieval exist.
- Full self-service profile update + approval workflow is incomplete.

#### Event management
Status: Not Implemented
Details:
- No organizational event CRUD/registration/attendee module found.

#### Notifications
Status: Partially Implemented
Details:
- Email service exists for auth/welcome flows.
- Engagement notifications (announcements/reminders) are not implemented.

#### Portal dashboard (events + announcements)
Status: Not Implemented
Details:
- No event/announcement feed powering member dashboard.

#### Admin users (max 5)
Status: Not Implemented
Details:
- No tier-based limit enforcement.

### Pro
#### Payment management
Status: Implemented
Details:
- Contributions, payment records/history, obligations, exemptions, and related reporting are implemented.

#### Advanced reporting
Status: Partially Implemented
Details:
- Financial reporting and export are implemented.
- Membership growth and event participation analytics are missing.

#### Automation
Status: Not Implemented
Details:
- No scheduler-driven reminder/announcement workflows found.

#### Integrations
Status: Partially Implemented
Details:
- Core APIs and email integration exist.
- Payment gateways/accounting/WhatsApp integrations are missing.

#### Unlimited admin users (tier entitlement)
Status: Not Implemented
Details:
- Entitlements and plan limits are not modeled.

## Cross-Cutting Gap
### Subscription/Billing/Tier Engine
Status: Not Implemented
Needed:
- plan model (Starter/Growth/Pro)
- org subscription state
- monthly/yearly billing model
- feature flags/entitlements per plan
- admin limit enforcement per plan

## Final Summary
### Already available
- Member CRUD core
- Family/genealogy relationships and views
- Excel import
- Financial/contributions stack
- Report exports (Excel/PDF)
- Authentication + basic member portal profile view

### Required to complete Starter
- formal deactivate member workflow
- notes field in member profile
- CSV import
- first-class member list export
- enforce max 2 admins per org

### Required to complete Growth
- event management module
- member portal self-update + optional approval
- engagement notifications (announcements/reminders)
- portal dashboard data (events/announcements)
- enforce max 5 admins per org

### Required to complete Pro
- automation workflows
- external integrations (payments/accounting/messaging)
- expanded analytics (membership growth/event participation)
- entitlement engine incl. unlimited admins

## Suggested Next Step
Use this file as the canonical source while implementing a phased roadmap:
1. Starter completion
2. Growth features
3. Pro features
