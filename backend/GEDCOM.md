# GEDCOM Module Documentation

## Overview

The Mosque CRM system uses the **GEDCOM (Genealogical Data Communication)** standard format for managing family tree and genealogical data. This module is **completely independent** of the security/authentication layer and focuses purely on family relationship modeling.

**GEDCOM Version**: 5.5.1 specification  
**Purpose**: Store and manage multi-generational family relationships for mosque community members

---

## Core Principles

### 1. **GEDCOM is Relationship-Centric, Not Individual-Centric**

❌ **WRONG** (Traditional OOP approach):
```java
class Person {
    Person spouse;
    List<Person> parents;
    List<Person> children;
}
```

✅ **CORRECT** (GEDCOM approach):
```java
class Individual {
    String id;  // No spouse, no parents, no children fields
}
class Family {
    String husbandId;
    String wifeId;
}
class FamilyChild {
    String familyId;
    String childId;
}
```

**Why?** GEDCOM handles complex scenarios:
- Multiple marriages (remarriage)
- Blended families
- Half-siblings
- Adoption/foster relationships
- Single-parent families
- Complex multi-generational relationships

### 2. **Separation of Concerns**

| Layer | Purpose | Database Tables |
|-------|---------|----------------|
| **GEDCOM Module** | Genealogical data and family relationships | `gedcom_*` tables |
| **Security Module** | Authentication, authorization, roles | `users`, `roles`, `user_roles` |
| **Membership Module** | Membership management, fees, contact info | `members`, `membership_fees` |
| **Integration Layer** | Optional links between modules | `user_member_link` |

**Key Point**: Users can exist without members. Members use GEDCOM for family tree. These are separate concerns.

---

## Database Schema

### Core Entities

#### 1. `gedcom_individuals` - People Records

```sql
CREATE TABLE gedcom_individuals (
    id VARCHAR(20) PRIMARY KEY,      -- GEDCOM xref: @I1@, @I2@, etc.
    given_name VARCHAR(100) NOT NULL,
    surname VARCHAR(100),
    sex VARCHAR(1),                  -- M, F, U (unknown)
    birth_date DATE,
    birth_place VARCHAR(255),
    death_date DATE,
    death_place VARCHAR(255),
    living BOOLEAN DEFAULT true
);
```

**Entity**: `com.mosque.crm.entity.gedcom.Individual`

**CRITICAL RULES**:
- ❌ NO `spouse` field
- ❌ NO `parent` fields
- ❌ NO `children` collection
- ✅ Relationships found through `Family` and `FamilyChild` tables

#### 2. `gedcom_families` - Relationship Units

```sql
CREATE TABLE gedcom_families (
    id VARCHAR(20) PRIMARY KEY,      -- GEDCOM xref: @F1@, @F2@, etc.
    husband_id VARCHAR(20),          -- FK to gedcom_individuals.id
    wife_id VARCHAR(20),             -- FK to gedcom_individuals.id
    marriage_date DATE,
    marriage_place VARCHAR(255),
    divorce_date DATE,
    divorce_place VARCHAR(255)
);
```

**Entity**: `com.mosque.crm.entity.gedcom.Family`

**Usage**:
- Represents a marriage/partnership
- Serves as parent unit for children
- Can have only husband OR only wife (single-parent families)
- Person can be in multiple families (remarriage)

#### 3. `gedcom_family_children` - Child-to-Family Links

```sql
CREATE TABLE gedcom_family_children (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    family_id VARCHAR(20) NOT NULL,     -- FK to gedcom_families.id
    child_id VARCHAR(20) NOT NULL,      -- FK to gedcom_individuals.id
    relationship_type VARCHAR(20) NOT NULL, -- BIOLOGICAL, ADOPTED, FOSTER
    birth_order INTEGER                 -- Optional: 1st child, 2nd child, etc.
);
```

**Entity**: `com.mosque.crm.entity.gedcom.FamilyChild`

**Why Join Table?**
- Children belong to families, not directly to individuals
- Supports half-siblings (same father, different mothers = 2 families)
- Tracks adoption status per child
- Enables complex blended family scenarios

#### 4. `gedcom_events` - Life Events

```sql
CREATE TABLE gedcom_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(20) NOT NULL,       -- BIRT, DEAT, MARR, DIV, CENS, etc.
    date DATE,
    place VARCHAR(255),
    description TEXT,
    family_id VARCHAR(20)            -- For family events (MARR, DIV)
);
```

**Entity**: `com.mosque.crm.entity.gedcom.Event`  
**Enum**: `com.mosque.crm.enums.EventType`

**Event Types**:
- **Individual**: `BIRT` (birth), `DEAT` (death), `CHR` (christening), `BURI` (burial)
- **Family**: `MARR` (marriage), `DIV` (divorce), `ANUL` (annulment), `ENGA` (engagement)
- **Other**: `CENS` (census), `RESI` (residence), `EMIG` (emigration), `GRAD` (graduation)

#### 5. `gedcom_event_participants` - Event-to-Individual Links

```sql
CREATE TABLE gedcom_event_participants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,        -- FK to gedcom_events.id
    individual_id VARCHAR(20) NOT NULL, -- FK to gedcom_individuals.id
    role VARCHAR(20) NOT NULL        -- PRINCIPAL, WITNESS, PARENT, CHILD
);
```

**Entity**: `com.mosque.crm.entity.gedcom.EventParticipant`

**Examples**:
- Birth event: 1 child (PRINCIPAL) + 2 parents (PARENT role)
- Marriage: 2 individuals (PRINCIPAL)
- Death with witnesses: 1 deceased (PRINCIPAL) + N witnesses (WITNESS)

#### 6. Supporting Entities

```sql
-- Source citations (books, records, certificates)
CREATE TABLE gedcom_sources (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    publication_info TEXT
);

-- Citations linking sources to individuals/families/events
CREATE TABLE gedcom_citations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    source_id BIGINT NOT NULL,
    entity_type VARCHAR(20) NOT NULL,  -- INDIVIDUAL, FAMILY, EVENT
    entity_id VARCHAR(50) NOT NULL,
    page VARCHAR(255),
    confidence VARCHAR(20)
);

-- Notes for any entity
CREATE TABLE gedcom_notes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    text TEXT NOT NULL
);

-- Note links
CREATE TABLE gedcom_note_links (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    note_id BIGINT NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id VARCHAR(50) NOT NULL
);

-- Media (photos, documents)
CREATE TABLE gedcom_media (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    file_path VARCHAR(500) NOT NULL,
    title VARCHAR(255),
    media_type VARCHAR(50)
);
```

---

## How to Query Relationships

### Find Parents of a Child

```java
// SQL
SELECT f.husband_id, f.wife_id 
FROM gedcom_families f
JOIN gedcom_family_children fc ON f.id = fc.family_id
WHERE fc.child_id = '@I5@';

// Returns father ID and mother ID
```

### Find All Children of a Couple

```java
// SQL
SELECT i.* 
FROM gedcom_individuals i
JOIN gedcom_family_children fc ON i.id = fc.child_id
WHERE fc.family_id = '@F1@'
ORDER BY fc.birth_order;
```

### Find Siblings of a Person

```java
// Step 1: Find their family
SELECT fc.family_id 
FROM gedcom_family_children fc 
WHERE fc.child_id = '@I10@';

// Step 2: Find all children in that family
SELECT i.* 
FROM gedcom_individuals i
JOIN gedcom_family_children fc ON i.id = fc.child_id
WHERE fc.family_id = '@F3@' AND fc.child_id != '@I10@';
```

### Find Spouse(s) of a Person

```java
// Husband's spouse
SELECT i.* 
FROM gedcom_individuals i
JOIN gedcom_families f ON i.id = f.wife_id
WHERE f.husband_id = '@I2@';

// Wife's spouse
SELECT i.* 
FROM gedcom_individuals i
JOIN gedcom_families f ON i.id = f.husband_id
WHERE f.wife_id = '@I3@';

// All spouses (for remarriage cases)
SELECT i.* 
FROM gedcom_individuals i
WHERE i.id IN (
    SELECT f.wife_id FROM gedcom_families f WHERE f.husband_id = '@I2@'
    UNION
    SELECT f.husband_id FROM gedcom_families f WHERE f.wife_id = '@I2@'
);
```

### Find Grandparents

```java
// Step 1: Find parent's family
SELECT fc.family_id 
FROM gedcom_family_children fc 
WHERE fc.child_id = '@I10@';  -- child's ID

// Step 2: Find parents from that family
SELECT f.husband_id, f.wife_id 
FROM gedcom_families f 
WHERE f.id = '@F3@';  -- Result: @I2@ (father), @I3@ (mother)

// Step 3: Find grandparents (parents of @I2@)
SELECT f.husband_id, f.wife_id 
FROM gedcom_families f
JOIN gedcom_family_children fc ON f.id = fc.family_id
WHERE fc.child_id = '@I2@';  -- father's parents
```

---

## ID Format and Conventions

### GEDCOM xref Format

- **Individuals**: `@I<number>@` → `@I1@`, `@I2@`, `@I100@`
- **Families**: `@F<number>@` → `@F1@`, `@F2@`, `@F50@`

### Current ID Ranges

| Range | Usage |
|-------|-------|
| `1` | Admin user (reserved) |
| `2-14` | Existing families 1-3 (parents + children) |
| `100-107` | Grandparent generation (4 couples) |
| `15+` | Generated families and children |

### Sample Data Structure

```
Generation 0 (Grandparents):
├── @I100@ Ibrahim (m) + @I101@ Khadija (f) → Family @F100@
├── @I102@ Ahmed (m) + @I103@ Zahra (f) → Family @F101@
├── @I104@ Omar (m) + @I105@ Amina (f) → Family @F102@
└── @I106@ Idris (m) + @I107@ Noor (f) → Family @F103@

Generation 1 (Parents):
├── Family @F1@: @I2@ Ibrahim + @I3@ Fatima (children of @I100@ + @I102@)
│   └── Children: @I4@, @I5@, @I6@
├── Family @F2@: @I7@ Ahmed + @I8@ Zahra (children of @I100@ + @I104@)
│   └── Children: @I9@, @I10@
└── Family @F3@: @I11@ Abdullah + @I12@ Amina (children of @I106@ + @I100@)
    └── Children: @I13@, @I14@
```

---

## Enumerations

### Sex / Gender

```java
public enum Sex {
    M,  // Male
    F,  // Female
    U   // Unknown / Unspecified
}
```

### Relationship Type

```java
public enum RelationshipType {
    BIOLOGICAL,  // Natural birth relationship
    ADOPTED,     // Legal adoption
    FOSTER       // Foster care relationship
}
```

### Event Type

```java
public enum EventType {
    // Individual Events
    BIRT, DEAT, CHR, BURI, CENS,
    
    // Family Events
    MARR, DIV, ANUL, ENGA,
    
    // Other Events
    RESI, EMIG, IMMI, NATU, GRAD, RETI, EVEN
}
```

---

## Integration with Member System

### Member ≠ Individual

```java
// members table (membership management)
CREATE TABLE members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address VARCHAR(500),
    membership_status VARCHAR(20),
    member_since DATE
    // NO genealogical data here
);

// Optional: Link member to GEDCOM individual
// This is a FUTURE enhancement, not implemented yet
ALTER TABLE members ADD COLUMN gedcom_individual_id VARCHAR(20);
```

**Separation Strategy**:
1. **Member**: Focuses on mosque membership, contact info, fees
2. **GEDCOM Individual**: Focuses on family tree, relationships, genealogy
3. **Optional Link**: A member MAY be linked to a GEDCOM individual
4. **Independent Data**: Can have members without GEDCOM data, and GEDCOM data without members

---

## Liquibase Data Management

### Custom Task Changes

All GEDCOM data uses custom Java task changes for UPSERT operations:

```java
// Example: DataGedcomIndividual
public class DataGedcomIndividual extends CustomDataTaskChange {
    private String id;
    private String givenName;
    private String surname;
    private String sex;
    // ... setters ...
    
    @Override
    public void execute(Database database) {
        // Check if exists → UPDATE : INSERT
    }
}
```

### Changeset Pattern

```xml
<!-- File: 020-data-individuals-gen0.xml -->
<changeSet id="a1b2c3d4-e5f6-7890-abcd-ef1234567890" author="system">
    <customChange class="com.mosque.crm.liquibase.DataGedcomIndividual">
        <param name="id" value="@I100@"/>
        <param name="givenName" value="Ibrahim"/>
        <param name="surname" value="Hassan"/>
        <param name="sex" value="M"/>
        <param name="birthDate" value="1950-03-15"/>
        <param name="living" value="true"/>
    </customChange>
</changeSet>
```

**To Update Data**: Change the UUID changeset ID to trigger re-execution.

### File Organization

```
db/changelog/
├── db.changelog-master.xml          # Master file
└── changes/
    ├── ddl/
    │   ├── db.changelog-ddl.xml      # DDL consolidation
    │   ├── 003-create-gedcom-individuals.xml
    │   ├── 004-create-gedcom-families.xml
    │   └── ...
    └── dml/
        ├── db.changelog-dml.xml      # DML consolidation
        ├── 020-data-gedcom-individuals.xml
        ├── 021-data-gedcom-families.xml
        └── ...
```

---

## Code Examples

### Creating a New Individual

```java
Individual person = new Individual();
person.setId("@I200@");
person.setGivenName("Hassan");
person.setSurname("Ali");
person.setSex(Sex.M);
person.setBirthDate(LocalDate.of(2000, 5, 10));
person.setLiving(true);

individualRepository.save(person);
```

### Creating a Family (Marriage)

```java
Family family = new Family();
family.setId("@F50@");
family.setHusbandId("@I100@");
family.setWifeId("@I101@");
family.setMarriageDate(LocalDate.of(2020, 6, 15));
family.setMarriagePlace("Springfield Mosque");

familyRepository.save(family);
```

### Linking a Child to Family

```java
FamilyChild link = new FamilyChild();
link.setFamilyId("@F50@");
link.setChildId("@I200@");
link.setRelationshipType(RelationshipType.BIOLOGICAL);
link.setBirthOrder(1);  // First child

familyChildRepository.save(link);
```

### Recording an Event

```java
// Birth event
Event birthEvent = new Event();
birthEvent.setType(EventType.BIRT);
birthEvent.setDate(LocalDate.of(2000, 5, 10));
birthEvent.setPlace("Springfield Hospital");

Event savedEvent = eventRepository.save(birthEvent);

// Link to individual
EventParticipant participant = new EventParticipant();
participant.setEventId(savedEvent.getId());
participant.setIndividualId("@I200@");
participant.setRole(ParticipantRole.PRINCIPAL);

eventParticipantRepository.save(participant);
```

---

## Data Generation Tool

**Script**: `generate-families.py`

**Purpose**: Generate multi-generational test data with realistic family structures

**Usage**:
```bash
cd backend
python generate-families.py > additional-families.xml
```

**Output**: Liquibase XML with:
- 20+ parent couples (Generation 1)
- 60+ children (Generation 2)
- Proper cross-family relationships (in-laws, siblings from different families)

---

## Best Practices

### ✅ DO

1. **Always query through join tables** for relationships
2. **Use proper GEDCOM xref format** for IDs (`@I1@`, `@F1@`)
3. **Store genealogical data in GEDCOM entities only** (not in Member table)
4. **Use events for life milestones** (birth, death, marriage)
5. **Support complex scenarios** (remarriage, adoption, half-siblings)

### ❌ DON'T

1. **Don't add spouse/parent fields to Individual entity**
2. **Don't store family relationships in Member table**
3. **Don't assume one-to-one relationships** (people can remarry)
4. **Don't bypass Family entity** (children belong to families, not individuals)
5. **Don't mix GEDCOM logic with security/membership logic**

---

## Common Pitfalls

### ❌ Pitfall 1: Direct Parent Reference

```java
// WRONG
class Individual {
    @ManyToOne
    private Individual father;  // ❌ Violates GEDCOM
}

// RIGHT
// Query through FamilyChild and Family tables
```

### ❌ Pitfall 2: Assuming Single Marriage

```java
// WRONG
@OneToOne
private Family family;  // ❌ Person can have multiple families

// RIGHT
// A person can be husband/wife in multiple Family records
```

### ❌ Pitfall 3: Storing Genealogy in Member Table

```java
// WRONG
class Member {
    private String fatherName;  // ❌ Genealogy belongs in GEDCOM
    private String motherName;
}

// RIGHT
// Member optionally links to GEDCOM Individual
// All genealogy queries use GEDCOM tables
```

---

## Testing Queries

### Sample Test Queries

```sql
-- 1. Find all living individuals
SELECT * FROM gedcom_individuals WHERE living = true;

-- 2. Find all married couples
SELECT 
    h.given_name || ' ' || h.surname as husband,
    w.given_name || ' ' || w.surname as wife,
    f.marriage_date
FROM gedcom_families f
JOIN gedcom_individuals h ON f.husband_id = h.id
JOIN gedcom_individuals w ON f.wife_id = w.id
WHERE f.divorce_date IS NULL;

-- 3. Find families with 3+ children
SELECT f.id, COUNT(fc.child_id) as child_count
FROM gedcom_families f
JOIN gedcom_family_children fc ON f.id = fc.family_id
GROUP BY f.id
HAVING COUNT(fc.child_id) >= 3;

-- 4. Find all adopted children
SELECT i.*, fc.family_id
FROM gedcom_individuals i
JOIN gedcom_family_children fc ON i.id = fc.child_id
WHERE fc.relationship_type = 'ADOPTED';
```

---

## API Endpoints (Future)

When building GEDCOM REST APIs, follow this pattern:

```
GET  /api/gedcom/individuals         - List all individuals
GET  /api/gedcom/individuals/{id}    - Get individual details
POST /api/gedcom/individuals         - Create individual
PUT  /api/gedcom/individuals/{id}    - Update individual

GET  /api/gedcom/individuals/{id}/families     - Get families (as spouse)
GET  /api/gedcom/individuals/{id}/parents      - Get parents
GET  /api/gedcom/individuals/{id}/children     - Get children
GET  /api/gedcom/individuals/{id}/siblings     - Get siblings
GET  /api/gedcom/individuals/{id}/tree         - Get full family tree

GET  /api/gedcom/families            - List all families
GET  /api/gedcom/families/{id}       - Get family details
POST /api/gedcom/families            - Create family
```

---

## Summary

**GEDCOM Module = Family Tree System**
- Independent genealogical data layer
- Based on GEDCOM 5.5.1 standard
- Relationship-centric (not individual-centric)
- Supports complex family scenarios
- Completely separate from security and membership modules
- Extensible with events, sources, notes, and media

**Key Takeaway**: Always think "relationships through families" rather than "direct connections between individuals."
