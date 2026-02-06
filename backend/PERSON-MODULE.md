# Person Module

## Overview

The **Person Module** is the foundational identity layer for the Mosque CRM system. It provides core person/individual data management independent of authentication, genealogy, or any other domain-specific concerns.

## Module Purpose

Person serves as the **central identity hub** that other modules can link to:

- **Authentication Module** → Links `User` to `Person` (portal access)
- **GEDCOM Module** → Links genealogy `Individual` to `Person` (family tree)
- **Financial Module** → References `Person` for subscriptions and donations
- **Membership Module** → Tracks `Person` mosque membership status

## Core Principles

### 1. Independence
- Person exists independently of all other modules
- A Person can exist without:
  - User account (no portal access)
  - GEDCOM data (no family tree)
  - Membership (visitor/guest)
  - Financial records (no transactions yet)

### 2. Stability
- Person data is **stable** and **persistent**
- Deleting linked data (User, GEDCOM) does NOT delete Person
- Person serves as the permanent identity anchor

### 3. UUID-Based
- Uses UUID primary keys for global uniqueness
- Enables distributed system integration
- Future-proof for multi-site deployments

## Entity Model

### Person Entity

**Table**: `persons`  
**Primary Key**: UUID  
**Package**: `com.mosque.crm.entity`

```java
@Entity
@Table(name = "persons")
public class Person {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    // Identity
    private String firstName;      // Required
    private String lastName;
    private String gender;
    private LocalDate dateOfBirth;
    private LocalDate dateOfDeath;
    
    // Contact
    private String email;          // Unique
    private String phone;
    
    // Address
    private String address;
    private String city;
    private String country;
    private String postalCode;
    
    // Status
    private PersonStatus status;   // ACTIVE, INACTIVE, DECEASED
    
    // Audit
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Relationships (OneToMany)
    private List<Membership> memberships;
    private List<Subscription> subscriptions;
    private List<Donation> donations;
    
    // Relationships (OneToOne)
    private UserMemberLink userLink;        // Portal access link
    private GedcomPersonLink gedcomLink;    // Genealogy link
}
```

### Supporting Entities

#### Membership
**Purpose**: Track mosque membership for a person  
**Table**: `memberships`  
**Foreign Key**: `person_id` → Person (UUID)

```java
@Entity
public class Membership {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne Person person;
    private MembershipType membershipType;  // FULL, ASSOCIATE, YOUTH, SENIOR, FAMILY
    private MembershipStatus status;         // ACTIVE, EXPIRED, SUSPENDED, CANCELLED
    private LocalDate startDate;
    private LocalDate endDate;
}
```

#### Subscription
**Purpose**: Recurring financial commitment  
**Table**: `subscriptions`  
**Foreign Key**: `person_id` → Person (UUID)

```java
@Entity
public class Subscription {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne Person person;
    private BigDecimal amount;
    private SubscriptionFrequency frequency;  // WEEKLY, MONTHLY, YEARLY
    private SubscriptionStatus status;
}
```

#### Donation
**Purpose**: One-time financial contribution  
**Table**: `donations`  
**Foreign Key**: `person_id` → Person (UUID)

```java
@Entity
public class Donation {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne Person person;
    private BigDecimal amount;
    private DonationType donationType;  // ZAKAT, SADAQAH, BUILDING_FUND, etc.
    private LocalDate donationDate;
}
```

## Module Relationships

### Person ← User (Authentication Module)

**Link Table**: `user_member_link`  
**Relationship**: OneToOne (optional)  
**Purpose**: Grant portal access to a Person

```java
@Entity
@Table(name = "user_member_link")
public class UserMemberLink {
    @Id
    private Long id;
    
    @OneToOne User user;      // FK: users table
    @OneToOne Person person;  // FK: persons table
    
    private LocalDateTime linkedAt;
}
```

**Rules**:
- ✅ Person can exist without User (no portal access)
- ✅ User can exist without Person (admin-only account)
- ✅ Link is optional and reversible
- ❌ One User → Max one Person
- ❌ One Person → Max one User

**Use Case**: A mosque member (Person) is granted portal access by linking to a User account.

---

### Person ← GEDCOM Individual (Genealogy Module)

**Link Table**: `gedcom_person_links`  
**Relationship**: OneToOne (optional)  
**Purpose**: Connect Person to family tree data

```java
@Entity
@Table(name = "gedcom_person_links")
public class GedcomPersonLink {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @OneToOne Person person;              // FK: persons table
    @OneToOne Individual gedcomIndividual; // FK: gedcom_individuals table
    
    private String linkedBy;
    private String linkReason;
    private LocalDateTime linkedAt;
}
```

**Rules**:
- ✅ Person can exist without GEDCOM data (modern members)
- ✅ GEDCOM Individual can exist without Person (historical/deceased)
- ✅ Link is optional and reversible
- ✅ Deleting GEDCOM does NOT delete Person
- ✅ Deleting Person does NOT delete GEDCOM
- ❌ One Person → Max one GEDCOM Individual
- ❌ One GEDCOM Individual → Max one Person

**Use Case**: A Person is linked to their genealogy record in the family tree for historical research.

---

## API Endpoints

### REST API
**Base Path**: `/api/persons`  
**Controller**: `PersonController`

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/persons` | Get all persons | ADMIN, IMAM, TREASURER |
| GET | `/api/persons/active` | Get active persons | ADMIN, IMAM, TREASURER |
| GET | `/api/persons/members` | Get persons with memberships | ADMIN, IMAM, TREASURER |
| GET | `/api/persons/{id}` | Get person by UUID | ADMIN, IMAM, TREASURER, MEMBER |
| GET | `/api/persons/search?q=term` | Search persons | ADMIN, IMAM, TREASURER |
| POST | `/api/persons` | Create person | ADMIN, IMAM |
| PUT | `/api/persons/{id}` | Update person | ADMIN, IMAM |
| DELETE | `/api/persons/{id}` | Delete person | ADMIN |

### Service Layer
**Service**: `PersonService`

**Methods**:
```java
// Retrieval
List<PersonDTO> getAllPersons()
List<PersonDTO> getAllActivePersons()
List<PersonDTO> getAllWithActiveMemberships()
Optional<PersonDTO> getPersonById(UUID id)
Optional<PersonDTO> getPersonByEmail(String email)
List<PersonDTO> searchPersons(String searchTerm)

// Mutation
PersonDTO createPerson(PersonCreateDTO dto)
PersonDTO updatePerson(UUID id, PersonUpdateDTO dto)
void deletePerson(UUID id)
```

### DTOs

**PersonDTO** - Full person data with computed flags
```java
public class PersonDTO {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private PersonStatus status;
    // ... all person fields
    
    // Computed flags
    private boolean hasPortalAccess;      // Has User link
    private boolean hasGedcomData;        // Has GEDCOM link
    private boolean hasActiveMembership;  // Has active Membership
    private String gedcomIndividualId;    // GEDCOM xref if linked
}
```

**PersonCreateDTO** - For creating new persons
```java
public class PersonCreateDTO {
    private String firstName;  // Required
    private String lastName;
    private String email;
    private PersonStatus status;  // Default: ACTIVE
    // ... other fields
}
```

**PersonUpdateDTO** - For updating persons
```java
public class PersonUpdateDTO {
    private UUID id;
    private String firstName;
    private String lastName;
    private PersonStatus status;
    // ... all updatable fields
}
```

## Database Schema

### Core Tables

#### persons
```sql
CREATE TABLE persons (
    id BINARY(16) PRIMARY KEY,
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
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_persons_email (email),
    INDEX idx_persons_status (status),
    INDEX idx_persons_name (first_name, last_name)
);
```

#### memberships
```sql
CREATE TABLE memberships (
    id BINARY(16) PRIMARY KEY,
    person_id BINARY(16) NOT NULL,
    membership_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    INDEX idx_memberships_person (person_id),
    INDEX idx_memberships_status (status)
);
```

#### subscriptions
```sql
CREATE TABLE subscriptions (
    id BINARY(16) PRIMARY KEY,
    person_id BINARY(16) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    INDEX idx_subscriptions_person (person_id),
    INDEX idx_subscriptions_status (status)
);
```

#### donations
```sql
CREATE TABLE donations (
    id BINARY(16) PRIMARY KEY,
    person_id BINARY(16) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    donation_type VARCHAR(50) NOT NULL,
    donation_date DATE NOT NULL,
    receipt_number VARCHAR(50),
    notes VARCHAR(1000),
    anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    INDEX idx_donations_person (person_id),
    INDEX idx_donations_date (donation_date),
    INDEX idx_donations_type (donation_type)
);
```

### Link Tables

#### user_member_link (Person ↔ User)
```sql
CREATE TABLE user_member_link (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    person_id BINARY(16) UNIQUE,
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    INDEX idx_user_member_link_person (person_id)
);
```

#### gedcom_person_links (Person ↔ GEDCOM)
```sql
CREATE TABLE gedcom_person_links (
    id BINARY(16) PRIMARY KEY,
    person_id BINARY(16) NOT NULL UNIQUE,
    gedcom_individual_id VARCHAR(20) NOT NULL UNIQUE,
    linked_by VARCHAR(100),
    link_reason VARCHAR(500),
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    FOREIGN KEY (gedcom_individual_id) REFERENCES gedcom_individuals(id) ON DELETE CASCADE,
    INDEX idx_gedcom_person_links_person (person_id),
    INDEX idx_gedcom_person_links_individual (gedcom_individual_id)
);
```

## Usage Patterns

### Pattern 1: Create Person (No Links)
```java
// Create a new mosque member
PersonCreateDTO dto = new PersonCreateDTO();
dto.setFirstName("Ahmed");
dto.setLastName("Ali");
dto.setEmail("ahmed@example.com");
dto.setStatus(PersonStatus.ACTIVE);

PersonDTO person = personService.createPerson(dto);
// Person exists independently, no User or GEDCOM link yet
```

### Pattern 2: Create Person + User Link (Portal Access)
```java
// Step 1: Create Person
PersonDTO person = personService.createPerson(createDTO);

// Step 2: Create User account
User user = new User();
user.setUsername("ahmed");
user.setPassword(encodedPassword);
userRepository.save(user);

// Step 3: Link User to Person
UserMemberLink link = new UserMemberLink();
link.setUser(user);
link.setPerson(personRepository.findById(person.getId()).orElseThrow());
userMemberLinkRepository.save(link);

// Now Ahmed can log into the portal
```

### Pattern 3: Link Person to GEDCOM
```java
// Person already exists
Person person = personRepository.findById(personUuid).orElseThrow();

// GEDCOM individual already imported
Individual gedcomIndividual = individualRepository.findById("@I123@").orElseThrow();

// Create optional link
GedcomPersonLink link = new GedcomPersonLink();
link.setPerson(person);
link.setGedcomIndividual(gedcomIndividual);
link.setLinkedBy("admin");
link.setLinkReason("Family tree research project");
gedcomPersonLinkRepository.save(link);

// Now Person has genealogy data available
```

### Pattern 4: Query with Links
```java
// Get person with all relationship data
Person person = personRepository.findById(uuid).orElseThrow();

// Check portal access
boolean hasPortal = person.hasPortalAccess();
if (hasPortal) {
    User user = person.getUserLink().getUser();
    String username = user.getUsername();
}

// Check genealogy data
boolean hasGedcom = person.hasGedcomData();
if (hasGedcom) {
    Individual gedcomData = person.getGedcomLink().getGedcomIndividual();
    // Show family tree
}

// Get financial data
List<Donation> donations = donationRepository.findByPerson(person);
List<Subscription> subscriptions = subscriptionRepository.findByPerson(person);

// Get membership status
Optional<Membership> activeMembership = 
    membershipRepository.findActiveMembershipByPerson(person);
```

## Module Dependencies

### This Module Depends On
- **None** - Person is a foundational module with no dependencies

### Other Modules Depend On This
- **Authentication Module** - `User` links to `Person` via `UserMemberLink`
- **GEDCOM Module** - `Individual` links to `Person` via `GedcomPersonLink`
- **Financial Module** - `Subscription`, `Donation` reference `Person`
- **Membership Module** - `Membership` references `Person`

## Best Practices

### DO ✅

1. **Always reference Person for CRM operations**
   ```java
   subscription.setPerson(person);  // ✅ Correct
   ```

2. **Use UUID for all Person references**
   ```java
   UUID personId = person.getId();  // ✅ UUID, not Long
   ```

3. **Keep Person data stable and minimal**
   - Store core identity only
   - Move domain-specific data to related entities

4. **Use optional links for authentication and genealogy**
   ```java
   if (person.hasPortalAccess()) {
       // User link exists
   }
   ```

### DON'T ❌

1. **Never embed domain logic in Person entity**
   ```java
   person.calculateDonationTotal();  // ❌ Wrong! Use DonationService
   ```

2. **Never cascade delete from Person to User or GEDCOM**
   ```java
   @OneToOne(cascade = CascadeType.ALL)  // ❌ Wrong! Links are optional
   ```

3. **Never use Person for authentication**
   ```java
   person.login(password);  // ❌ Wrong! Use User entity
   ```

4. **Never query GEDCOM from financial features**
   ```java
   donation.getGedcomIndividual();  // ❌ Wrong! Use Person only
   ```

## Enums

### PersonStatus
```java
public enum PersonStatus {
    ACTIVE,      // Active mosque participant
    INACTIVE,    // Temporarily inactive (moved away, etc.)
    DECEASED     // Deceased (for records)
}
```

### MembershipType
```java
public enum MembershipType {
    FULL,        // Full voting member
    ASSOCIATE,   // Non-voting associate
    YOUTH,       // Youth member (under 18)
    SENIOR,      // Senior member (65+)
    FAMILY       // Family membership
}
```

### MembershipStatus
```java
public enum MembershipStatus {
    ACTIVE,      // Current active membership
    EXPIRED,     // Membership expired
    SUSPENDED,   // Temporarily suspended
    CANCELLED    // Cancelled by member or admin
}
```

### SubscriptionFrequency
```java
public enum SubscriptionFrequency {
    WEEKLY,
    MONTHLY,
    QUARTERLY,
    YEARLY
}
```

### SubscriptionStatus
```java
public enum SubscriptionStatus {
    ACTIVE,      // Active recurring subscription
    PAUSED,      // Temporarily paused
    CANCELLED,   // Cancelled by member
    EXPIRED      // Expired (end date reached)
}
```

### DonationType
```java
public enum DonationType {
    ZAKAT,           // Obligatory charity
    SADAQAH,         // Voluntary charity
    BUILDING_FUND,   // Mosque building fund
    EDUCATION_FUND,  // Islamic education
    RAMADAN_PROGRAM, // Ramadan programs
    GENERAL,         // General donation
    OTHER            // Other specified purpose
}
```

## Migration Path

### From Old Member Entity
The Person module replaces the old `Member` entity as the core identity:

**Old Design** (Coupled):
```
Member (identity + membership + GEDCOM reference)
  └─ individual_id → gedcom_individuals (tight coupling)
```

**New Design** (Modular):
```
Person (core identity only)
  ├─ Membership (membership tracking)
  ├─ Subscription (financial)
  ├─ Donation (financial)
  ├─ UserMemberLink (optional portal access)
  └─ GedcomPersonLink (optional genealogy)
```

### Migration Steps
1. ✅ Create `persons` table with UUID
2. ✅ Create supporting tables (memberships, subscriptions, donations)
3. ✅ Create link tables (user_member_link, gedcom_person_links)
4. ⏳ Migrate data from `members` to `persons`
5. ⏳ Update all services to use PersonService
6. ⏳ Deprecate old Member entity

## File Locations

### Entities
- `com.mosque.crm.entity.Person`
- `com.mosque.crm.entity.Membership`
- `com.mosque.crm.entity.Subscription`
- `com.mosque.crm.entity.Donation`
- `com.mosque.crm.entity.GedcomPersonLink`
- `com.mosque.crm.entity.UserMemberLink`

### Enums
- `com.mosque.crm.enums.PersonStatus`
- `com.mosque.crm.enums.MembershipType`
- `com.mosque.crm.enums.MembershipStatus`
- `com.mosque.crm.enums.SubscriptionFrequency`
- `com.mosque.crm.enums.SubscriptionStatus`
- `com.mosque.crm.enums.DonationType`

### Repositories
- `com.mosque.crm.repository.PersonRepository`
- `com.mosque.crm.repository.MembershipRepository`
- `com.mosque.crm.repository.SubscriptionRepository`
- `com.mosque.crm.repository.DonationRepository`
- `com.mosque.crm.repository.GedcomPersonLinkRepository`
- `com.mosque.crm.repository.UserMemberLinkRepository`

### Services
- `com.mosque.crm.service.PersonService`

### Controllers
- `com.mosque.crm.controller.PersonController`

### DTOs
- `com.mosque.crm.dto.PersonDTO`
- `com.mosque.crm.dto.PersonCreateDTO`
- `com.mosque.crm.dto.PersonUpdateDTO`

### Database Migrations
- `db/changelog/changes/ddl/016-create-persons-table.xml`
- `db/changelog/changes/ddl/017-create-memberships-table.xml`
- `db/changelog/changes/ddl/018-create-subscriptions-table.xml`
- `db/changelog/changes/ddl/019-create-donations-table.xml`
- `db/changelog/changes/ddl/020-create-gedcom-person-links-table.xml`
- `db/changelog/changes/ddl/021-alter-user-member-links-to-person.xml`

## Summary

The **Person Module** is the foundational identity layer that:

- Provides **stable, independent** person identity
- Uses **UUID** for global uniqueness
- Supports **optional links** to authentication and genealogy
- Enables **modular architecture** with clear separation of concerns
- Follows **domain-driven design** principles

**Key Insight**: Person is what a User can become (via link), and what a GEDCOM Individual represents (via link), but Person exists independently as the source of truth for mosque CRM identity.
