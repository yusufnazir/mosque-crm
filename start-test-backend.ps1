<#
.SYNOPSIS
    Starts the Spring Boot backend with the "test" profile.

.DESCRIPTION
    The test profile uses:
      - Database:  mcrm-test  (your local MariaDB, separate from the dev database)
      - Port:      8201        (dev backend stays on 8200 — both can run simultaneously)
      - Liquibase: drop-first=true  (schema + seed data rebuilt every time this starts)

    First-time setup (run ONCE, skip afterwards):
      mysql -u root -p -P 3307 --protocol=TCP < scripts\create-test-db.sql

    After the test backend is ready, in a second terminal:
      cd frontend && npm run dev:test

    Then run the tests:
      cd frontend && npm run test:e2e

.EXAMPLE
    .\start-test-backend.ps1
#>

$backendDir = Join-Path $PSScriptRoot "backend"
$setupSql   = Join-Path $PSScriptRoot "scripts\create-test-db.sql"

if (-not (Test-Path $backendDir)) {
    Write-Error "Backend directory not found: $backendDir"
    exit 1
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Starting TEST backend" -ForegroundColor Cyan
Write-Host "    Profile  : test" -ForegroundColor Cyan
Write-Host "    Database : mcrm-test  (local MariaDB, port 3307)" -ForegroundColor Cyan
Write-Host "    Port     : 8201" -ForegroundColor Cyan
Write-Host "    Liquibase: drop-first=true  (clean schema every start)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# ── First-time setup hint ────────────────────────────────────────────────────
# Try to connect to mcrm-test as the app user.  If it fails, the database
# probably doesn't exist yet and the user needs to run the setup script.
$mysqlExe = Get-Command mysql -ErrorAction SilentlyContinue
if ($mysqlExe) {
    $testResult = & mysql -u mcrm -pmcrm -P 3307 --protocol=TCP `
        -e "USE \`mcrm-test\`;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: mcrm-test database not found or mcrm user lacks access." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Run this one-time setup command with your MariaDB root password:" -ForegroundColor Yellow
        Write-Host "  mysql -u root -p -P 3307 --protocol=TCP < `"$setupSql`"" -ForegroundColor White
        Write-Host ""
        Write-Host "Press Enter to continue anyway (Spring will try createDatabaseIfNotExist=true)..."
        Read-Host | Out-Null
    }
} else {
    Write-Host "NOTE: 'mysql' client not found in PATH — skipping first-run database check." -ForegroundColor DarkGray
    Write-Host "      If this is your first run, execute:  mysql -u root -p < scripts\create-test-db.sql" -ForegroundColor DarkGray
    Write-Host ""
}

Write-Host "After the backend is ready, start the test frontend in another terminal:" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor White
Write-Host "  npm run dev:test" -ForegroundColor White
Write-Host ""
Write-Host "Then run the E2E tests:" -ForegroundColor Yellow
Write-Host "  npm run test:e2e" -ForegroundColor White
Write-Host ""

Push-Location $backendDir
try {
    mvn spring-boot:run "-Dspring-boot.run.profiles=test"
} finally {
    Pop-Location
}
