module: eid_al_adha_distribution

description: >
  Manage distribution of meat parcels during Eid ul Adha.
  Supports members and non-members, registration, parcel allocation,
  and distribution tracking.

# ========================
# DOMAIN MODELS
# ========================

entities:

  DistributionEvent:
    fields:
      id: long
      year: int
      name: string
      date: date
      location: string
      status:
        type: enum
        values: [PLANNED, ACTIVE, CLOSED]

  ParcelCategory:
    fields:
      id: long
      distributionEventId: long
      name: string
      description: string
      totalParcels: int
      distributedParcels: int
    computed:
      remainingParcels: totalParcels - distributedParcels

  NonMemberRecipient:
    fields:
      id: long
      distributionEventId: long
      distributionNumber: string
      name: string
      idNumber: string
      phoneNumber: string
      registeredAt: datetime
      status:
        type: enum
        values: [REGISTERED, COLLECTED, CANCELLED]

  MemberDistributionRegistration:
    fields:
      id: long
      distributionEventId: long
      memberId: long
      registeredAt: datetime
      status:
        type: enum
        values: [REGISTERED, COLLECTED]

  ParcelDistribution:
    fields:
      id: long
      distributionEventId: long
      recipientType:
        type: enum
        values: [MEMBER, NON_MEMBER]
      recipientId: long
      parcelCategoryId: long
      parcelCount: int
      distributedBy: string
      distributedAt: datetime

# ========================
# BUSINESS RULES
# ========================

rules:

  - name: prevent_over_distribution
    description: Parcel count cannot exceed remaining parcels
    condition: parcelCount <= ParcelCategory.remainingParcels
    error: "Not enough parcels available"

  - name: prevent_duplicate_non_member_distribution
    condition: NonMemberRecipient.status != COLLECTED
    error: "Non-member already collected parcels"

  - name: require_member_registration
    condition: MemberDistributionRegistration.status == REGISTERED
    error: "Member is not registered for distribution"

  - name: update_parcel_counts
    action: |
      ParcelCategory.distributedParcels += parcelCount

  - name: mark_recipient_collected
    action: |
      if recipientType == NON_MEMBER:
        NonMemberRecipient.status = COLLECTED
      else:
        MemberDistributionRegistration.status = COLLECTED

# ========================
# NUMBER GENERATION
# ========================

numbering:

  nonMemberDistributionNumber:
    format: "N-{000}"
    sequence: incremental
    resetPerEvent: true

# ========================
# API ENDPOINTS
# ========================

api:

  DistributionEvent:
    base: /api/distribution-events
    operations: [create, update, get, list]

  ParcelCategory:
    base: /api/parcel-categories
    operations: [create, update, get, list]

  NonMemberRecipient:
    base: /api/non-members
    operations: [create, get, list]
    onCreate:
      generate:
        field: distributionNumber
        using: nonMemberDistributionNumber

  MemberDistributionRegistration:
    base: /api/member-registrations
    operations: [create, get, list]

  ParcelDistribution:
    base: /api/distributions
    operations: [create, get, list]

# ========================
# UI SCREENS
# ========================

ui:

  menu:
    - Dashboard
    - ParcelCategories
    - MemberRegistration
    - NonMemberRegistration
    - Distribution
    - Reports

  screens:

    Dashboard:
      type: summary
      widgets:
        - totalParcels
        - distributedParcels
        - remainingParcels
        - categoryBreakdown

    ParcelCategories:
      type: crud
      entity: ParcelCategory

    NonMemberRegistration:
      type: form
      entity: NonMemberRecipient
      fields:
        - name
        - idNumber
        - phoneNumber
      actions:
        - create

    MemberRegistration:
      type: form
      entity: MemberDistributionRegistration
      fields:
        - memberLookup
      actions:
        - create

    Distribution:
      type: workflow
      modes:

        member:
          search: memberLookup
          inputs:
            - parcelCategoryId
            - parcelCount
          action: distribute

        nonMember:
          search: distributionNumber
          inputs:
            - parcelCategoryId
            - parcelCount
          action: distribute

    Reports:
      type: reporting
      reports:
        - distributionSummary
        - memberDistribution
        - nonMemberDistribution

# ========================
# REPORT DEFINITIONS
# ========================

reports:

  distributionSummary:
    fields:
      - totalParcels
      - distributedParcels
      - remainingParcels

  memberDistribution:
    fields:
      - memberId
      - parcelCount
      - distributedAt

  nonMemberDistribution:
    fields:
      - distributionNumber
      - name
      - parcelCount