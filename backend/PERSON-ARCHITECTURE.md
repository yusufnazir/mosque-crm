# Person-Centric Architecture Documentation

## Overview

The Mosque CRM uses a **Person-Centric Architecture** where **Person** is the core identity entity, and GEDCOM genealogy is an optional, separate module.

## Core Principles

### 1. Person is the Core Identity
- All CRM features (memberships, subscriptions, donations, portal access) reference `Person`
- Person can exist independently without GEDCOM data
- Person uses UUID primary keys for global uniqueness

### 2. GEDCOM is Optional
- GEDCOM data (`gedcom_individuals` table) exists in a separate bounded context
- Linking Person ↔ GEDCOM is optional via `GedcomPersonLink`
- Deleting GEDCOM data does NOT affect Person records
- GEDCOM can be reimported/rebuilt without affecting financial data

### 3. Financial Features Never Touch GEDCOM
- Subscriptions reference `person_id` (UUID)
- Donations reference `person_id` (UUID)
- Memberships reference `person_id` (UUID)
- **NEVER** query GEDCOM for financial operations

---

## Entity Model

### Core Entities

#### Person
**Purpose**: Central identity for mosque CRM  
**Table**: `persons`  
**Primary Key**: UUID

```java
@Entity
@Table(name = "persons")
public class Person {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    private String firstName;      // Required
    private String lastName;
    private String gender;
    private LocalDate dateOfBirth;
    private LocalDate dateOfDeath;
    private String email;          // Unique
    private String phone;
    private String address;
    private PersonStatus status;   // ACTIVE, INACTIVE, DECEASED
    
    // Relationships
    @OneToMany List<Membership> memberships;
    @OneToMany List<Subscription> subscriptions;
    @OneToMany List<Donation> donations;
    @OneToOne UserMemberLink userLink;
    @OneToOne GedcomPersonLink gedcomLink;
}
```

**Rules**:
- ✅ Can exist without GEDCOM data
- ✅ Can have multiple memberships (historical records)
- ✅ Can have multiple subscriptions
- ✅ Can have multiple donations
- ✅ Optional portal access via `UserMemberLink`
- ✅ Optional genealogy via `GedcomPersonLink`

---

#### Membership
**Purpose**: Track mosque membership status  
**Table**: `memberships`  
**Primary Key**: UUID  
**Foreign Key**: `person_id` → Person (UUID)

```java
@Entity
@Table(name = "memberships")
public class Membership {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne Person person;           // FK to persons
    private MembershipType membershipType;  // FULL, ASSOCIATE, YOUTH, etc.
    private LocalDate startDate;
    private LocalDate endDate;
    private MembershipStatus status;     // ACTIVE, EXPIRED, etc.
}
```

**Rules**:
- ✅ MUST reference Person (never GEDCOM)
- ✅ A person can have multiple memberships over time
- ✅ Historical memberships are preserved

---

#### Subscription
**Purpose**: Recurring financial commitment  
**Table**: `subscriptions`  
**Primary Key**: UUID  
**Foreign Key**: `person_id` → Person (UUID)

```java
@Entity
@Table(name = "subscriptions")
public class Subscription {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne Person person;          // FK to persons
    private BigDecimal amount;
    private SubscriptionFrequency frequency;  // WEEKLY, MONTHLY, YEARLY
    private LocalDate startDate;
    private SubscriptionStatus status;
}
```

**Rules**:
- ✅ MUST reference Person (never GEDCOM)
- ❌ NEVER query GEDCOM for subscription data
- ✅ Financial reports aggregate by `person_id`

---

#### Donation
**Purpose**: One-time financial contribution  
**Table**: `donations`  
**Primary Key**: UUID  
**Foreign Key**: `person_id` → Person (UUID)

```java
@Entity
@Table(name = "donations")
public class Donation {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne Person person;           // FK to persons
    private BigDecimal amount;
    private DonationType donationType;   // ZAKAT, SADAQAH, etc.
    private LocalDate donationDate;
    private String receiptNumber;
}
```

**Rules**:
- ✅ MUST reference Person (never GEDCOM)
- ❌ NEVER query GEDCOM for donation data
- ✅ Can be anonymous (person still tracked internally)

---

### Linking Entities

#### GedcomPersonLink
**Purpose**: Optional link between Person and GEDCOM Individual  
**Table**: `gedcom_person_links`  
**Primary Key**: UUID

```java
@Entity
@Table(name = "gedcom_person_links")
public class GedcomPersonLink {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @OneToOne Person person;                  // FK to persons
    @OneToOne Individual gedcomIndividual;    // FK to gedcom_individuals
    private String linkedBy;
    private String linkReason;
}
```

**Rules**:
- ✅ One Person → One GEDCOM Individual (1:1)
- ✅ Linking is OPTIONAL
- ✅ Link can be created/deleted without affecting either entity
- ✅ Deleting GEDCOM data does NOT cascade to Person
- ✅ Deleting Person does NOT cascade to GEDCOM

---

#### UserMemberLink
**Purpose**: Link authentication User to Person  
**Table**: `user_person_links`  
**Primary Key**: BIGINT (legacy, can be UUID later)

```java
@Entity
@Table(name = "user_person_links")
public class UserMemberLink {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne User user;       // FK to users
    @OneToOne Person person;   // FK to persons
}
```

**Rules**:
- ✅ Separates authentication from person identity
- ✅ Person can exist without User (no portal access)
- ✅ User is only for portal login

---

## GEDCOM Module (Bounded Context)

### Individual (GEDCOM)
**Purpose**: Genealogy data in GEDCOM 5.5.1 format  
**Table**: `gedcom_individuals`  
**Primary Key**: String (@I1@, @I2@, etc.)

```java
@Entity
@Table(name = "gedcom_individuals")
public class Individual {
    @Id
    private String id;  // GEDCOM xref: @I1@, @I2@, etc.
    
    private String givenName;
    private String surname;
    private Sex sex;
    private LocalDate birthDate;
    private Boolean living;
    
    // NO direct relationships to Person
    // Link via GedcomPersonLink if needed
}
```

**Rules**:
- ✅ Can exist without Person link (historical/deceased individuals)
- ✅ Stores raw GEDCOM data
- ❌ NEVER referenced by financial features
- ❌ NO foreign key to persons table
- ✅ Relationships managed via Family entities (GEDCOM standard)

---

## Data Flow Patterns

### Pattern 1: Create New Person (No GEDCOM)
```java
// Create person
Person person = new Person("Ahmed", "Ali");
person.setEmail("ahmed@mosque.org");
person.setStatus(PersonStatus.ACTIVE);
personRepository.save(person);

// Create membership
Membership membership = new Membership(person, MembershipType.FULL, LocalDate.now());
membershipRepository.save(membership);

// Create subscription
Subscription subscription = new Subscription(person, new BigDecimal("50"), SubscriptionFrequency.MONTHLY);
subscriptionRepository.save(subscription);
```

### Pattern 2: Link Existing GEDCOM Individual to Person
```java
// Find existing GEDCOM individual
Individual gedcomIndividual = individualRepository.findById("@I123@").orElseThrow();

// Find or create person
Person person = personRepository.findByEmail("ahmed@mosque.org").orElseGet(() -> {
    Person p = new Person(gedcomIndividual.getGivenName(), gedcomIndividual.getSurname());
    p.setDateOfBirth(gedcomIndividual.getBirthDate());
    return personRepository.save(p);
});

// Create link
GedcomPersonLink link = new GedcomPersonLink(person, gedcomIndividual);
link.setLinkedBy("admin");
link.setLinkReason("Imported from GEDCOM");
gedcomPersonLinkRepository.save(link);
```

### Pattern 3: Financial Report (Never Touch GEDCOM)
```java
// Get all donations by person
List<Donation> donations = donationRepository.findByPerson(person);

// Get total donations
BigDecimal total = donationRepository.getTotalDonationsByPerson(person);

// Get active subscriptions
List<Subscription> subscriptions = subscriptionRepository.findByPerson(person);

// ❌ NEVER do this:
// List<Donation> donations = gedcomIndividualRepository.findDonations(...) // WRONG!
```

### Pattern 4: Display Person with Optional GEDCOM Data
```java
Person person = personRepository.findById(uuid).orElseThrow();

// Check if GEDCOM data exists
if (person.hasGedcomData()) {
    Individual gedcomIndividual = person.getGedcomLink().getGedcomIndividual();
    // Show family tree, genealogy, etc.
}

// Always show person data (works with or without GEDCOM)
System.out.println(person.getFullName());
System.out.println(person.getEmail());
```

---

## Migration Strategy

### Phase 1: Keep Both Models (Current State)
- ✅ Old `Member` entity exists
- ✅ New `Person` entity created
- ✅ Both work in parallel
- ✅ Gradually migrate features to Person

### Phase 2: Migrate Services
- Update `MemberService` → `PersonService`
- Update controllers to use Person
- Update DTOs to reference Person
- Keep GEDCOM queries separate

### Phase 3: Data Migration
- Copy `members` → `persons` (generate UUIDs)
- Create `gedcom_person_links` for existing links
- Update foreign keys in financial tables
- Deprecate old `members` table

### Phase 4: Cleanup
- Remove old `Member` entity
- Remove old `MemberRepository`
- Update all references to use Person

---

## Database Schema

```sql
-- Core Person Table (UUID primary key)
CREATE TABLE persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    gender VARCHAR(10),
    date_of_birth DATE,
    date_of_death DATE,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address VARCHAR(500),
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Memberships (References Person)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id),
    membership_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions (References Person)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id),
    amount DECIMAL(10,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Donations (References Person)
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id),
    amount DECIMAL(10,2) NOT NULL,
    donation_type VARCHAR(50) NOT NULL,
    donation_date DATE NOT NULL,
    receipt_number VARCHAR(50),
    notes VARCHAR(1000),
    anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Optional Link (Person ↔ GEDCOM)
CREATE TABLE gedcom_person_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL UNIQUE REFERENCES persons(id),
    gedcom_individual_id VARCHAR(20) NOT NULL UNIQUE REFERENCES gedcom_individuals(id),
    linked_by VARCHAR(100),
    link_reason VARCHAR(500),
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Portal Access Link (User ↔ Person)
CREATE TABLE user_person_links (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    person_id UUID NOT NULL UNIQUE REFERENCES persons(id),
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Best Practices

### DO ✅
1. **Always reference Person for financial features**
   ```java
   subscription.setPerson(person);  // ✅ Correct
   ```

2. **Use GedcomPersonLink for optional genealogy**
   ```java
   if (person.hasGedcomData()) {
       showFamilyTree(person.getGedcomLink().getGedcomIndividual());
   }
   ```

3. **Query Person independently**
   ```java
   List<Person> persons = personRepository.findAllActivePersons();
   ```

4. **Treat GEDCOM as a separate module**
   ```java
   // Genealogy service
   Individual individual = individualRepository.findById("@I1@");
   
   // Person service (separate)
   Person person = personRepository.findById(uuid);
   ```

### DON'T ❌
1. **Never reference GEDCOM from financial features**
   ```java
   donation.setGedcomIndividual(...);  // ❌ WRONG!
   ```

2. **Never cascade delete from GEDCOM to Person**
   ```java
   @OneToOne(cascade = CascadeType.ALL)  // ❌ WRONG!
   private Person person;
   ```

3. **Never query GEDCOM for person lists**
   ```java
   List<Individual> individuals = individualRepository.findAll();
   // Then try to get financial data  // ❌ WRONG!
   ```

4. **Never use GEDCOM IDs as foreign keys**
   ```java
   private String gedcomIndividualId;  // ❌ WRONG!
   ```

---

## Summary

| Feature | References | Notes |
|---------|-----------|-------|
| **Person** | UUID | Core identity, always available |
| **Membership** | Person (UUID) | Mosque membership status |
| **Subscription** | Person (UUID) | Recurring financial commitment |
| **Donation** | Person (UUID) | One-time financial contribution |
| **GEDCOM Individual** | String (@I1@) | Optional genealogy data |
| **GedcomPersonLink** | Person + Individual | Optional 1:1 link |
| **UserMemberLink** | User + Person | Portal access |

**Golden Rule**: Financial and membership features MUST reference Person. GEDCOM is optional genealogy data that can be linked but never required.
