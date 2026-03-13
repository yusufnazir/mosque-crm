# Membership Subscription Model

Status: Draft v1
Date: 2026-03-12

## Purpose
Define the subscription model for plan enforcement across organizations (tenants), including:
- plan tier (Starter, Growth, Pro)
- billing cycle (monthly, yearly)
- subscription state lifecycle
- feature entitlements
- admin-user limits per plan

This document is the design source for DB schema, backend services, and UI enforcement.

## Plan Catalog

## Plan: Starter
- Price: 15 USD/month
- Price (yearly): 150 USD/year (example discount model)
- Intended for small organizations
- Admin limit: 2

## Plan: Growth
- Price: 30 USD/month
- Price (yearly): 300 USD/year (example discount model)
- Includes Starter + self-service + engagement
- Admin limit: 5

## Plan: Pro
- Price: 60 USD/month
- Price (yearly): 600 USD/year (example discount model)
- Includes Growth + automation + advanced integrations
- Admin limit: unlimited

Notes:
- Final yearly pricing/discount may be configured in DB instead of hard-coded.
- Currency support can reuse existing currency model if needed.

## Billing Cycle
- MONTHLY
- YEARLY

## Subscription State Model

## States
- TRIALING
- ACTIVE
- PAST_DUE
- CANCELED
- EXPIRED

## Lifecycle examples
- New org: TRIALING -> ACTIVE
- Payment failed: ACTIVE -> PAST_DUE -> ACTIVE (if recovered)
- Cancellation: ACTIVE -> CANCELED (effective period end)
- Lapsed subscription: PAST_DUE -> EXPIRED

## Core Domain Objects

## 1) Plan Definition (Catalog)
Represents immutable/slow-changing commercial plan metadata.

Fields:
- code: STARTER | GROWTH | PRO
- name
- description
- monthlyPrice
- yearlyPrice
- isActive

## 2) Plan Entitlement
Represents normalized feature access rules per plan.

Fields:
- planCode (FK to plan definition)
- featureKey (example: member.portal, event.management)
- enabled (boolean)
- limitValue (nullable integer, for quota features)

Examples:
- featureKey=admin.users.max, limitValue=2 for Starter
- featureKey=admin.users.max, limitValue=5 for Growth
- featureKey=admin.users.max, limitValue=null for Pro (interpreted as unlimited)

## 3) Organization Subscription
Represents current subscription instance for one organization.

Fields:
- mosqueId (organization FK)
- planCode
- billingCycle (MONTHLY | YEARLY)
- status (TRIALING | ACTIVE | PAST_DUE | CANCELED | EXPIRED)
- startsAt
- endsAt
- trialEndsAt (nullable)
- canceledAt (nullable)
- autoRenew (boolean)
- providerRef (nullable external billing ID)
- createdAt
- updatedAt

Constraints:
- one active current subscription per organization at a time
- historical rows allowed for plan changes and auditing

## 4) Subscription Audit Log
Tracks changes to plan or state.

Fields:
- mosqueId
- fromPlanCode
- toPlanCode
- fromStatus
- toStatus
- changedByUserId
- reason
- changedAt

## Feature Entitlement Keys (v1)
- member.management
- member.family
- member.search
- member.import.excel
- member.import.csv
- member.export
- member.portal
- event.management
- notification.email.engagement
- notification.whatsapp
- payment.management
- report.basic
- report.advanced
- automation.rules
- integrations.payment_gateway
- integrations.accounting
- integrations.messaging
- api.external
- admin.users.max

## Default Entitlement Matrix (v1)

Starter:
- member.management: true
- member.family: true
- member.search: true
- member.import.excel: true
- member.import.csv: false (until implemented)
- member.export: true
- member.portal: false
- event.management: false
- notification.email.engagement: false
- notification.whatsapp: false
- payment.management: false
- report.basic: true
- report.advanced: false
- automation.rules: false
- integrations.payment_gateway: false
- integrations.accounting: false
- integrations.messaging: false
- api.external: false
- admin.users.max: 2

Growth:
- all Starter true features
- member.portal: true
- event.management: true
- notification.email.engagement: true
- report.basic: true
- report.advanced: false
- payment.management: false
- automation.rules: false
- admin.users.max: 5

Pro:
- all Growth features
- payment.management: true
- report.advanced: true
- automation.rules: true
- integrations.payment_gateway: true
- integrations.accounting: true
- integrations.messaging: true
- api.external: true
- admin.users.max: unlimited

## Enforcement Rules

## Rule 1: Route/API feature guard
Before executing protected operations:
- resolve current organization (mosqueId)
- load active subscription and entitlements
- deny when feature entitlement is disabled

Response contract suggestion:
- HTTP 403
- error code: PLAN_ENTITLEMENT_REQUIRED
- message: "Feature not available on current plan"

## Rule 2: Admin user limit guard
On admin user create/role assignment:
- read entitlement admin.users.max
- count active admin users in org
- block when count >= limit
- Pro with null limit = unlimited

Response contract suggestion:
- HTTP 409
- error code: ADMIN_LIMIT_REACHED
- message includes plan and limit

## Rule 3: Plan downgrade safety
When downgrading:
- do not delete data
- block creation/use of non-entitled features
- existing data remains read-only or hidden based on policy

## API Design (v1)

## Admin/Owner APIs
- GET /subscriptions/current
- PUT /subscriptions/current/plan
- PUT /subscriptions/current/status
- GET /subscriptions/entitlements

## Internal enforcement API/service
- boolean isFeatureEnabled(mosqueId, featureKey)
- Integer getLimit(mosqueId, featureKey)
- void assertFeatureEnabled(mosqueId, featureKey)

## Suggested Liquibase Objects (v1)
- plans
- plan_entitlements
- organization_subscriptions
- subscription_audit_logs

## Seed Data (v1)
- 3 plans: STARTER, GROWTH, PRO
- default entitlement rows for each plan

## Backward Compatibility
For existing organizations without subscription records:
- temporary default plan: Pro (recommended for non-breaking rollout)
- migration option: map existing orgs to Starter if product requires strict default

Recommended rollout path:
1. deploy schema + seed plans/entitlements
2. auto-create subscription rows for existing organizations
3. enable read-only plan APIs
4. enable guard checks gradually per feature

## Acceptance Criteria for This Design Task
- Plan tiers formally defined with pricing and limits
- Billing cycle and subscription lifecycle documented
- Entitlement model documented with feature keys
- Admin limit enforcement rule defined
- API and schema direction documented

## Next Implementation Task
Create DB schema and seed data for:
- plan catalog
- entitlement matrix
- organization subscriptions
