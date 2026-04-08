# SUBSCRIPTION BILLING SYSTEM IMPLEMENTATION SPEC

## GOAL
Implement a monthly subscription billing system with:
- Prepaid billing
- Grace period
- Gradual restriction (active → grace → read-only → locked)
- Automated invoicing and reminders

---

## CORE CONCEPTS

### Subscription States
Define the following states:

- ACTIVE
  User has paid for the current billing period

- GRACE
  Payment is overdue but still within grace period

- READ_ONLY
  Payment overdue beyond grace period; user cannot modify data

- LOCKED
  Payment significantly overdue; no access allowed

---

## DATABASE MODEL

### Table: subscriptions
Fields:
- id
- customer_id
- status (ACTIVE, GRACE, READ_ONLY, LOCKED)
- billing_cycle_start (date)
- billing_cycle_end (date)
- next_due_date (date)
- grace_end_date (date)
- read_only_date (date)
- lock_date (date)
- price_per_employee
- employee_count
- last_payment_date

---

### Table: invoices
Fields:
- id
- subscription_id
- amount
- issue_date
- due_date
- status (PENDING, PAID, OVERDUE)

---

### Table: payments
Fields:
- id
- invoice_id
- amount
- payment_date
- payment_method

---

## BILLING LOGIC

### Monthly Invoice Generation
Trigger: daily scheduled job

IF today == (billing_cycle_end - 7 days):
  - Generate invoice
  - amount = employee_count * price_per_employee
  - issue_date = today
  - due_date = billing_cycle_end

---

### Payment Handling

WHEN payment is received:
  - Mark invoice as PAID
  - Update subscription:
    - status = ACTIVE
    - last_payment_date = today
    - billing_cycle_start = next cycle start
    - billing_cycle_end = +1 month
    - next_due_date = billing_cycle_end
    - grace_end_date = due_date + 7 days
    - read_only_date = due_date + 7 days
    - lock_date = due_date + 14 days

---

## STATE TRANSITIONS

### Daily Job: Subscription Status अपडेट

FOR each subscription:

IF today <= due_date:
  status = ACTIVE

ELSE IF today > due_date AND today <= grace_end_date:
  status = GRACE

ELSE IF today > grace_end_date AND today <= lock_date:
  status = READ_ONLY

ELSE IF today > lock_date:
  status = LOCKED

---

## APPLICATION BEHAVIOR

### ACTIVE
- Full access

### GRACE
- Full access
- Show warning banner:
  "Your subscription expires soon. Please complete payment."

### READ_ONLY
- Disable all create/update/delete actions
- Allow viewing and exporting data
- Show blocking message:
  "Your subscription is overdue. Please pay to restore full access."

### LOCKED
- Block login OR redirect to payment page
- Message:
  "Your account is locked due to unpaid subscription."

---

## UI REQUIREMENTS

### Banner Notifications
- Show dynamic banner based on state:
  - GRACE: warning (yellow)
  - READ_ONLY: danger (red)
  - LOCKED: full-screen blocking message

---

## EMAIL NOTIFICATIONS

Trigger emails:

1. 7 days before due_date
   Subject: Subscription renewal reminder

2. On due_date
   Subject: Payment due today

3. 3 days after due_date
   Subject: Payment overdue

4. On entering READ_ONLY
   Subject: Account restricted

5. On entering LOCKED
   Subject: Account locked

---

## EDGE CASES

- If employee_count changes:
  - Apply change to next invoice (not current one)

- If payment is made during GRACE or READ_ONLY:
  - Immediately restore ACTIVE state

- Prevent duplicate invoice generation:
  - Only one invoice per billing cycle

---

## OPTIONAL IMPROVEMENTS

- Add webhook support for payment providers
- Add auto-payment (credit card)
- Add admin override to extend grace period
- Add audit log for status changes

---

## IMPLEMENTATION NOTES

- Use scheduled job (e.g., daily cron)
- Use enum for subscription status
- Ensure all restricted actions check subscription status
- Centralize access control logic (middleware/service layer)

---

## END GOAL

A resilient SaaS billing system that:
- Encourages timely payment
- Minimizes user friction
- Protects revenue
- Handles edge cases cleanly