# Test login endpoint
Write-Host "`n========== Testing Admin Login ==========" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"username":"admin","password":"admin123"}'
    
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "Username: $($response.username)" -ForegroundColor Yellow
    Write-Host "Role: $($response.role)" -ForegroundColor Yellow
    Write-Host "MemberId: $($response.memberId)" -ForegroundColor Yellow
    Write-Host "Token: $($response.token.Substring(0,50))..." -ForegroundColor Gray
    
    if ($response.role -eq "ADMIN") {
        Write-Host "`n✅ SUCCESS: Role is ADMIN - Sidebar should show Members menu" -ForegroundColor Green
    } else {
        Write-Host "`n❌ FAILURE: Role is '$($response.role)' - Should be 'ADMIN'" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
