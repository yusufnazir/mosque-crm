# Quick Start Guide: Family Relationship Management

## Start the Application

### Backend (Spring Boot)
```bash
cd backend
mvn spring-boot:run
```
Backend will start at: http://localhost:8080

### Frontend (Next.js)
```bash
cd frontend
npm run dev
```
Frontend will start at: http://localhost:3000

## Login
1. Navigate to http://localhost:3000/login
2. Use credentials: `admin` / `admin123`
3. You'll be redirected to the dashboard

## Access Family Management

### Option 1: Direct URL
Navigate to: http://localhost:3000/persons/{personId}/family

Example with test data:
- http://localhost:3000/persons/550e8400-e29b-41d4-a716-446655440001/family

### Option 2: Run Test Script
```powershell
.\test-family-relationships.ps1
```

This script will:
1. Login as admin
2. Create 3 test persons (Father, Mother, Child)
3. Add family relationships
4. Verify relationships
5. Display URLs for manual testing

## Using the Feature

### Add a Relationship
1. Type a person's name in the search box
2. Wait for autocomplete results
3. Click a person from the dropdown
4. Select relationship type (FATHER, MOTHER, SPOUSE, CHILD)
5. Click "Add Relationship"

### Remove a Relationship
1. Find the relationship in the list
2. Click "Remove" button
3. Confirm deletion

### View Relationships
All relationships are displayed with:
- Icon (👨 Father, 👩 Mother, 💑 Spouse, 👶 Child)
- Related person's name
- Relationship type badge with color coding

## Test Data Available

The database includes 17 persons across 3 generations:

**Generation 1 (Grandparents):**
- Hassan Al-Rahman (550e8400-e29b-41d4-a716-446655440001)
- Zainab Al-Masri (550e8400-e29b-41d4-a716-446655440002)
- Mahmoud Ibrahim (550e8400-e29b-41d4-a716-446655440003)
- Khadija Al-Sham (550e8400-e29b-41d4-a716-446655440004)

**Generation 2 (Parents):**
- Ibrahim Al-Rahman (550e8400-e29b-41d4-a716-446655440005)
- Fatima Ibrahim (550e8400-e29b-41d4-a716-446655440006)
- Ahmed Al-Rahman (550e8400-e29b-41d4-a716-446655440007)
- And more...

**Generation 3 (Children):**
- Multiple children available for testing

## API Endpoints

### Search Persons
```
GET /api/persons/search?q={query}
```

### Get Relationships
```
GET /api/genealogy/persons/{personId}/relationships
```

### Add Relationship
```
POST /api/genealogy/persons/{personId}/relationships
Body: {
  "relatedPersonId": "uuid",
  "relationshipType": "FATHER|MOTHER|SPOUSE|CHILD"
}
```

### Remove Relationship
```
DELETE /api/genealogy/persons/{personId}/relationships/{relationshipId}
```

## Troubleshooting

### "Person not found"
- Verify the person UUID exists in the database
- Check the persons table: `SELECT * FROM persons;`

### Search returns no results
- Ensure persons have first_name or last_name
- Try searching with partial names

### Backend not starting
- Check Java 17 is installed
- Verify port 8080 is not in use
- Check backend logs for errors

### Frontend not connecting
- Verify backend is running on port 8080
- Check browser console for API errors
- Verify you're logged in with a valid token

## Next Steps

See [FAMILY-RELATIONSHIPS-FEATURE.md](FAMILY-RELATIONSHIPS-FEATURE.md) for:
- Complete architecture documentation
- GEDCOM relationship rules
- Database schema details
- Advanced testing scenarios
