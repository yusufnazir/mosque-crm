# Test Script: Family Relationship Management

Write-Host "=== Family Relationship Management Test Script ===" -ForegroundColor Green
Write-Host ""

$API_BASE = "http://localhost:8080/api"
$TOKEN = ""

# Function to get auth token
function Get-AuthToken {
    Write-Host "1. Logging in as admin..." -ForegroundColor Yellow
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $script:TOKEN = $response.token
    Write-Host "   ✓ Logged in successfully" -ForegroundColor Green
    Write-Host "   Token: $TOKEN" -ForegroundColor Gray
    Write-Host ""
}

# Function to create test persons
function Create-TestPersons {
    Write-Host "2. Creating test persons..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }

    # Create Father
    $father = @{
        firstName = "Ahmad"
        lastName = "Hassan"
        gender = "male"
        dateOfBirth = "1960-05-15"
        status = "ACTIVE"
    } | ConvertTo-Json

    $fatherResponse = Invoke-RestMethod -Uri "$API_BASE/persons" -Method Post -Body $father -Headers $headers -ContentType "application/json"
    Write-Host "   ✓ Created Father: Ahmad Hassan (ID: $($fatherResponse.id))" -ForegroundColor Green
    
    # Create Mother
    $mother = @{
        firstName = "Fatima"
        lastName = "Hassan"
        gender = "female"
        dateOfBirth = "1965-08-20"
        status = "ACTIVE"
    } | ConvertTo-Json

    $motherResponse = Invoke-RestMethod -Uri "$API_BASE/persons" -Method Post -Body $mother -Headers $headers -ContentType "application/json"
    Write-Host "   ✓ Created Mother: Fatima Hassan (ID: $($motherResponse.id))" -ForegroundColor Green

    # Create Child
    $child = @{
        firstName = "Yusuf"
        lastName = "Hassan"
        gender = "male"
        dateOfBirth = "1990-03-10"
        status = "ACTIVE"
    } | ConvertTo-Json

    $childResponse = Invoke-RestMethod -Uri "$API_BASE/persons" -Method Post -Body $child -Headers $headers -ContentType "application/json"
    Write-Host "   ✓ Created Child: Yusuf Hassan (ID: $($childResponse.id))" -ForegroundColor Green
    Write-Host ""

    return @{
        father = $fatherResponse.id
        mother = $motherResponse.id
        child = $childResponse.id
    }
}

# Function to test person search
function Test-PersonSearch {
    param($searchTerm)
    
    Write-Host "3. Testing person search..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }

    $searchResponse = Invoke-RestMethod -Uri "$API_BASE/persons/search?q=$searchTerm" -Method Get -Headers $headers
    Write-Host "   ✓ Found $($searchResponse.Count) persons matching '$searchTerm'" -ForegroundColor Green
    
    foreach ($person in $searchResponse) {
        Write-Host "     - $($person.fullName) (ID: $($person.id))" -ForegroundColor Gray
    }
    Write-Host ""
}

# Function to add father relationship
function Add-FatherRelationship {
    param($childId, $fatherId)
    
    Write-Host "4. Adding FATHER relationship..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }

    $relationshipBody = @{
        relatedPersonId = $fatherId
        relationshipType = "FATHER"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_BASE/genealogy/persons/$childId/relationships" -Method Post -Body $relationshipBody -Headers $headers -ContentType "application/json"
    Write-Host "   ✓ Added father relationship" -ForegroundColor Green
    Write-Host "     Relationship ID: $($response.relationshipId)" -ForegroundColor Gray
    Write-Host ""
}

# Function to add mother relationship
function Add-MotherRelationship {
    param($childId, $motherId)
    
    Write-Host "5. Adding MOTHER relationship..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }

    $relationshipBody = @{
        relatedPersonId = $motherId
        relationshipType = "MOTHER"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_BASE/genealogy/persons/$childId/relationships" -Method Post -Body $relationshipBody -Headers $headers -ContentType "application/json"
    Write-Host "   ✓ Added mother relationship" -ForegroundColor Green
    Write-Host "     Relationship ID: $($response.relationshipId)" -ForegroundColor Gray
    Write-Host ""
}

# Function to add spouse relationship
function Add-SpouseRelationship {
    param($person1Id, $person2Id)
    
    Write-Host "6. Adding SPOUSE relationship..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }

    $relationshipBody = @{
        relatedPersonId = $person2Id
        relationshipType = "SPOUSE"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_BASE/genealogy/persons/$person1Id/relationships" -Method Post -Body $relationshipBody -Headers $headers -ContentType "application/json"
    Write-Host "   ✓ Added spouse relationship" -ForegroundColor Green
    Write-Host "     Relationship ID: $($response.relationshipId)" -ForegroundColor Gray
    Write-Host ""
}

# Function to get all relationships
function Get-Relationships {
    param($personId, $personName)
    
    Write-Host "7. Getting relationships for $personName..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }

    $relationships = Invoke-RestMethod -Uri "$API_BASE/genealogy/persons/$personId/relationships" -Method Get -Headers $headers
    Write-Host "   ✓ Found $($relationships.Count) relationships" -ForegroundColor Green
    
    foreach ($rel in $relationships) {
        Write-Host "     - $($rel.relationshipType): $($rel.relatedPersonName)" -ForegroundColor Gray
    }
    Write-Host ""
    
    return $relationships
}

# Main execution
try {
    # Step 1: Login
    Get-AuthToken

    # Step 2: Create test persons
    $persons = Create-TestPersons

    # Step 3: Test search
    Test-PersonSearch -searchTerm "Hassan"

    # Step 4: Add father relationship
    Add-FatherRelationship -childId $persons.child -fatherId $persons.father

    # Step 5: Add mother relationship
    Add-MotherRelationship -childId $persons.child -motherId $persons.mother

    # Step 6: Add spouse relationship (between parents)
    Add-SpouseRelationship -person1Id $persons.father -person2Id $persons.mother

    # Step 7: Verify child's relationships
    $childRels = Get-Relationships -personId $persons.child -personName "Yusuf (Child)"

    # Step 8: Verify father's relationships
    $fatherRels = Get-Relationships -personId $persons.father -personName "Ahmad (Father)"

    # Summary
    Write-Host ""
    Write-Host "=== Test Summary ===" -ForegroundColor Green
    Write-Host "✓ Created 3 test persons" -ForegroundColor Green
    Write-Host "✓ Added FATHER relationship" -ForegroundColor Green
    Write-Host "✓ Added MOTHER relationship" -ForegroundColor Green
    Write-Host "✓ Added SPOUSE relationship" -ForegroundColor Green
    Write-Host "✓ Verified relationships" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test IDs for manual testing:" -ForegroundColor Yellow
    Write-Host "  Father: $($persons.father)" -ForegroundColor Gray
    Write-Host "  Mother: $($persons.mother)" -ForegroundColor Gray
    Write-Host "  Child:  $($persons.child)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Frontend URL:" -ForegroundColor Yellow
    Write-Host "  http://localhost:3000/persons/$($persons.child)/family" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Response Details:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
}
