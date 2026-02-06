# Test Genealogy Endpoint
Write-Host "Testing GET /api/genealogy/persons/{personId}/relationships..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/genealogy/persons/550e8400-e29b-41d4-a716-446655440001/relationships" -Method Get -ContentType "application/json"
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host "Status Code:" $_.Exception.Response.StatusCode
    }
}
