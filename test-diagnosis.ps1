# Direct database query test
Write-Host "`n========== Database Query Test ==========" -ForegroundColor Cyan

# Check user_roles table
Write-Host "`nQuery: SELECT * FROM user_roles WHERE user_id = 1" -ForegroundColor Yellow
Write-Host "Expected: user_id=1, role_id=1" -ForegroundColor Gray

# Since we can't query MariaDB directly from PowerShell easily, 
# let's check what Hibernate is actually querying by looking at the logs
Write-Host "`nPlease check the backend terminal for these Hibernate queries:" -ForegroundColor Yellow
Write-Host "  - select r1_0.user_id, r1_1.id... from user_roles r1_0" -ForegroundColor Gray
Write-Host "`nIf you see this query AFTER login, check if it returns role_id=1" -ForegroundColor Yellow

Write-Host "`n========================================`n" -ForegroundColor Cyan

Write-Host "Let's test the API with more detail..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"username":"admin","password":"admin123"}' `
        -UseBasicParsing
    
    $json = $response.Content | ConvertFrom-Json
    
    Write-Host "`n✅ Response received:" -ForegroundColor Green
    Write-Host "Role returned: '$($json.role)'" -ForegroundColor Yellow
    
    # Check if role is coming as empty/null and defaulting
    if ($json.role -eq "MEMBER" -and $json.username -eq "admin") {
        Write-Host "`n⚠️  DIAGNOSIS: Backend is returning 'MEMBER' as DEFAULT" -ForegroundColor Red
        Write-Host "This means user.getRoles() is returning EMPTY SET" -ForegroundColor Red
        Write-Host "Even though database has the data, Hibernate is NOT loading it!" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
