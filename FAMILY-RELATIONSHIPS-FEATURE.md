# Family Relationship Management Feature

## Overview

This feature enables mosque administrators to manage family relationships for persons using GEDCOM-compatible genealogy standards. The system maintains a clear separation between Person (core identity) and GEDCOM genealogy data.

## Code Quality Standards

**NO Lombok** - This implementation follows the project's coding standards:
- No Lombok annotations (@Data, @Builder, @Slf4j, @RequiredArgsConstructor)
- Explicit constructors, getters, and setters
- Standard SLF4J Logger: `private static final Logger log = LoggerFactory.getLogger(ClassName.class);`
- Constructor injection for dependency management

## Architecture

### Backend Components

#### 1. **Repositories**
- `FamilyRepository` - GEDCOM Family entity queries
- `FamilyChildRepository` - Family-child relationship queries
- `PersonRepository` - Person search functionality
- `IndividualRepository` - GEDCOM Individual entity
- `GedcomPersonLinkRepository` - Links Person ↔ GEDCOM Individual

#### 2. **Service Layer**
[RelationshipService](backend/src/main/java/com/mosque/crm/service/RelationshipService.java)

**Key Methods:**
- `getRelationships(personId)` - Get all family relationships for a person
- `addRelationship(personId, relatedPersonId, relationshipType)` - Add new relationship
- `removeRelationship(relationshipId)` - Remove existing relationship
- `getOrCreateIndividual(person)` - Auto-create GEDCOM Individual if needed

**GEDCOM Logic:**
- Automatically creates GEDCOM Individual records when adding relationships
- Creates or reuses Family entities
- Manages FamilyChild join table entries
- Handles complex family structures (remarriage, single parents, etc.)

#### 3. **REST API**
[RelationshipController](backend/src/main/java/com/mosque/crm/controller/RelationshipController.java)

**Endpoints:**
```
GET    /api/persons/search?q={query}          (PersonController - existing)
GET    /api/genealogy/persons/{personId}/relationships
POST   /api/genealogy/persons/{personId}/relationships
DELETE /api/genealogy/persons/{personId}/relationships/{relationshipId}
```

**Note:** Person search uses the existing PersonController endpoint which returns PersonDTO.

#### 4. **DTOs**
- `RelationshipResponse` - Relationship details
- `AddRelationshipRequest` - Request to add relationship

**Note:** PersonSearchResponse was removed to avoid duplication - the existing PersonDTO from PersonController is used instead.

### Frontend Components

#### Page Route
`/persons/[personId]/family`

[Manage Family Page](frontend/app/(dashboard)/persons/[personId]/family/page.tsx)

**Features:**
- Person search with autocomplete (debounced 300ms)
- Relationship type selection (Father, Mother, Spouse, Child)
- Visual relationship list with icons and color coding
- Add/remove relationships

**UI Elements:**
- 👨 Father (blue)
- 👩 Mother (blue)
- 💑 Spouse (pink)
- 👶 Child (green)

## GEDCOM Relationship Rules

### 1. **Add Father/Mother**
```
Person A + Father/Mother B
↓
1. Create GedcomIndividual for both (if not exists)
2. Find or create Family
3. Set B as husband (father) or wife (mother)
4. Add A as child via FamilyChild
```

### 2. **Add Spouse**
```
Person A + Spouse B
↓
1. Create GedcomIndividual for both (if not exists)
2. Create Family with A and B as husband/wife
3. Gender-aware role assignment (or neutral)
```

### 3. **Add Child**
```
Parent A + Child B
↓
1. Create GedcomIndividual for both (if not exists)
2. Find or create Family where A is parent
3. Add B as child via FamilyChild
```

### 4. **Remove Relationship**
```
- For parent/child: Delete FamilyChild record
- For spouse: Delete Family (only if no children)
```

## Critical Design Principles

### ✅ Correct Approach
- Person entity NEVER stores family relationships
- All genealogy uses GEDCOM entities (Individual, Family, FamilyChild)
- GedcomPersonLink provides optional bridge
- Auto-create GEDCOM entities when needed
- GEDCOM supports complex families (remarriage, adoption, etc.)

### ❌ Wrong Approach
- Adding parentId, spouseId fields to Person
- Storing family data in Person table
- Direct person-to-person relationships
- Ignoring GEDCOM standards

## Testing Instructions

### Prerequisites
1. Backend running on `http://localhost:8080`
2. Frontend running on `http://localhost:3000`
3. Login credentials: `admin / admin123`

### Test Scenario 1: Add Parents
1. Navigate to any person's profile (create one if needed)
2. Click "Manage Family" or navigate to `/persons/{personId}/family`
3. Search for another person (father)
4. Select "FATHER" from relationship type
5. Click "Add Relationship"
6. Repeat for mother

**Expected Behavior:**
- GEDCOM Individual created for both persons (if not exists)
- Family entity created linking parents
- Current person added as child
- Relationships appear in list

### Test Scenario 2: Add Spouse
1. From person's family page
2. Search for spouse
3. Select "SPOUSE" relationship type
4. Add relationship

**Expected Behavior:**
- New Family created with both as spouses
- Relationship type shows as "SPOUSE"

### Test Scenario 3: Add Children
1. From person's family page
2. Search for child person
3. Select "CHILD" relationship type
4. Add relationship

**Expected Behavior:**
- Child added to parent's family
- If no family exists, single-parent family created

### Test Scenario 4: Remove Relationship
1. Click "Remove" button on any relationship
2. Confirm deletion

**Expected Behavior:**
- Relationship removed from list
- GEDCOM entities updated appropriately

### Test Scenario 5: Person Search
1. Type partial name in search box
2. Wait 300ms for debounce
3. Results appear in dropdown

**Expected Behavior:**
- Search calls backend API
- Current person filtered from results
- Clicking result fills search box

## API Testing with cURL

### Search Persons
```bash
curl -X GET "http://localhost:8080/api/persons/search?q=ahmed" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Relationships
```bash
curl -X GET "http://localhost:8080/api/genealogy/persons/{personId}/relationships" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Relationship
```bash
curl -X POST "http://localhost:8080/api/genealogy/persons/{personId}/relationships" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "relatedPersonId": "uuid-here",
    "relationshipType": "FATHER"
  }'
```

### Remove Relationship
```bash
curl -X DELETE "http://localhost:8080/api/genealogy/persons/{personId}/relationships/{relationshipId}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Verification

### Check GEDCOM Individuals
```sql
SELECT * FROM gedcom_individuals;
```

### Check Families
```sql
SELECT * FROM gedcom_families;
```

### Check Family-Child Links
```sql
SELECT fc.*, 
       i_child.given_name as child_name,
       f.husband_id, f.wife_id
FROM gedcom_family_children fc
JOIN gedcom_individuals i_child ON fc.child_id = i_child.id
JOIN gedcom_families f ON fc.family_id = f.id;
```

### Check Person-GEDCOM Links
```sql
SELECT p.first_name, p.last_name, 
       gpl.gedcom_individual_id,
       gi.given_name, gi.surname
FROM persons p
JOIN gedcom_person_links gpl ON p.id = gpl.person_id
JOIN gedcom_individuals gi ON gpl.gedcom_individual_id = gi.id;
```

## Common Issues & Solutions

### Issue: "Person not found"
**Solution:** Ensure the person exists in the `persons` table

### Issue: "Cannot remove family - has children"
**Solution:** Remove all children from family before removing spouse relationship

### Issue: Search returns no results
**Solution:** Check person has first_name or last_name populated

### Issue: Duplicate relationships
**Solution:** Backend prevents duplicates; check if relationship already exists

## Next Steps

This feature provides the foundation for:
- ✅ Basic family relationship management
- ⬜ Family tree visualization (see `comprehensive-family-tree.tsx`)
- ⬜ GEDCOM file import/export
- ⬜ Multi-generational queries
- ⬜ Sibling relationship inference
- ⬜ Family reports and statistics

## Files Created

### Backend
- `RelationshipService.java` - Core business logic
- `RelationshipController.java` - REST endpoints
- `FamilyRepository.java` - Family queries
- `FamilyChildRepository.java` - Child relationship queries
- `AddRelationshipRequest.java` - Request DTO

**Note:** Uses existing PersonController for person search (no duplicate endpoint)
- `PersonSearchResponse.java` - Search result DTO

### Frontend
- `persons/[personId]/family/page.tsx` - Family management page
- Updated `types/index.ts` - New type definitions
- Updated `lib/api.ts` - Relationship API methods

## Documentation References

- [GEDCOM Module Architecture](backend/GEDCOM.md)
- [Security Architecture](backend/SECURITY.md)
- [Person Module](backend/PERSON-MODULE.md)
