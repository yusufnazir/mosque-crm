#!/usr/bin/env pwsh
# =============================================================================
# Production Data Migration SQL Generator
# =============================================================================
# Generates a comprehensive SQL migration script from the production database
# to the new clean DDL schema.
# =============================================================================

$ErrorActionPreference = "Continue"

$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$mysqldumpExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$sqlFile = "d:\Workspaces\CURSOR01\mosque-crm\backend\src\main\resources\db\changelog\changes\dml\sql\200-prod-data-migration.sql"

# Create output directory
$sqlDir = Split-Path $sqlFile
New-Item -ItemType Directory -Path $sqlDir -Force | Out-Null

# Helper: run SQL query
function sql($q) {
    & $mysqlExe -h localhost -P 3307 -u mcrm -pmcrm mcrm -e $q --batch --raw 2>$null
}

# Helper: run SQL query and return data rows only (skip column headers)
function sqlData($q) {
    & $mysqlExe -h localhost -P 3307 -u mcrm -pmcrm mcrm --skip-column-names --batch --raw -e $q 2>$null | Where-Object { $_ -ne "" }
}

# Helper: get INSERT statements from mysqldump (uses temp file to preserve UTF-8)
function dumpInserts($table) {
    $tmpFile = [System.IO.Path]::GetTempFileName()
    & $mysqldumpExe -h localhost -P 3307 -u mcrm -pmcrm --no-create-info --complete-insert --skip-triggers --column-statistics=0 --skip-lock-tables --default-character-set=utf8mb4 "--result-file=$tmpFile" mcrm $table 2>$null
    $lines = [System.IO.File]::ReadAllLines($tmpFile, [System.Text.Encoding]::UTF8)
    Remove-Item $tmpFile -Force
    ($lines | Where-Object { $_ -match "^INSERT" }) -join "`n"
}

# Helper: rename mosque_id columns in INSERT statement
function renameMosqueId($insertSql) {
    $insertSql = $insertSql -replace '`mosque_id`', '`organization_id`'
    $insertSql = $insertSql -replace '`selected_mosque_id`', '`selected_organization_id`'
    return $insertSql
}

# Helper: make INSERT IGNORE
function makeIgnore($insertSql) {
    return $insertSql -replace 'INSERT INTO', 'INSERT IGNORE INTO'
}

Write-Host "Starting migration SQL generation..." -ForegroundColor Green

# =============================================================================
# BUILD THE SQL FILE
# =============================================================================
$sb = [System.Text.StringBuilder]::new()

[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- PRODUCTION DATA MIGRATION")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- Migrates production data from old schema to new clean DDL schema.")
[void]$sb.AppendLine("-- Key transformations:")
[void]$sb.AppendLine("--   mosque_id -> organization_id")
[void]$sb.AppendLine("--   selected_mosque_id -> selected_organization_id")
[void]$sb.AppendLine("--   Dropped columns: persons.notes, persons.active, configurations.description,")
[void]$sb.AppendLine("--                     configurations.category, gedcom_family_children.pedigree")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("SET FOREIGN_KEY_CHECKS = 0;")
[void]$sb.AppendLine("SET @OLD_SQL_MODE = @@SQL_MODE;")
[void]$sb.AppendLine("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';")
[void]$sb.AppendLine("")

# =============================================================================
# 1. ORGANIZATIONS
# =============================================================================
Write-Host "  [1/11] Organizations..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 1. ORGANIZATIONS (3 rows)")
[void]$sb.AppendLine("-- =============================================================================")
$insert = makeIgnore (dumpInserts "organizations")
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 2. CURRENCIES (INSERT IGNORE - seed has 19, production has 60)
# =============================================================================
Write-Host "  [2/11] Currencies..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 2. CURRENCIES (60 rows, INSERT IGNORE to complement seed data)")
[void]$sb.AppendLine("-- =============================================================================")
$insert = makeIgnore (dumpInserts "currencies")
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 3. USERS & SECURITY
# =============================================================================
Write-Host "  [3/11] Users & Security..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 3. USERS & SECURITY")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("")

# Users (6 rows) - rename mosque_id columns, use ON DUPLICATE KEY UPDATE to preserve production passwords
[void]$sb.AppendLine("-- Users (6 rows)")
$insert = renameMosqueId (dumpInserts "users")
# Convert to INSERT ... ON DUPLICATE KEY UPDATE for users to preserve production data
$insert = $insert -replace 'INSERT INTO', 'INSERT INTO'
# Actually, use REPLACE INTO to ensure production data takes precedence
$insert = $insert -replace 'INSERT INTO', 'REPLACE INTO'
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")

# User roles (11 rows) - composite PK (user_id, role_id), no id column; rename mosque_id
[void]$sb.AppendLine("-- User roles (11 rows)")
$urQuery = @"
SELECT CONCAT(
  '(',
  user_id, ', ',
  role_id, ', ',
  IFNULL(mosque_id, 'NULL'), ', ',
  IFNULL(QUOTE(start_date), 'NULL'), ', ',
  IFNULL(QUOTE(end_date), 'NULL'),
  ')')
FROM user_roles ORDER BY user_id, role_id
"@
$urRows = sqlData $urQuery
if ($urRows -and $urRows.Count -gt 0) {
    $values = ($urRows -join ",`n")
    [void]$sb.AppendLine("INSERT IGNORE INTO ``user_roles`` (``user_id``, ``role_id``, ``organization_id``, ``start_date``, ``end_date``) VALUES")
    [void]$sb.AppendLine("$values;")
} else {
    # Fallback: if mosque_id column no longer exists, query with new column name
    $urQuery2 = @"
SELECT CONCAT(
  '(',
  user_id, ', ',
  role_id, ', ',
  IFNULL(organization_id, 'NULL'), ', ',
  IFNULL(QUOTE(start_date), 'NULL'), ', ',
  IFNULL(QUOTE(end_date), 'NULL'),
  ')')
FROM user_roles ORDER BY user_id, role_id
"@
    $urRows2 = sqlData $urQuery2
    if ($urRows2 -and $urRows2.Count -gt 0) {
        $values = ($urRows2 -join ",`n")
        [void]$sb.AppendLine("INSERT IGNORE INTO ``user_roles`` (``user_id``, ``role_id``, ``organization_id``, ``start_date``, ``end_date``) VALUES")
        [void]$sb.AppendLine("$values;")
    }
}
[void]$sb.AppendLine("")

# User preferences (5 rows) - no mosque_id column
[void]$sb.AppendLine("-- User preferences (5 rows)")
$insert = makeIgnore (dumpInserts "user_preferences")
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")

# User member link (5 rows) - rename mosque_id
[void]$sb.AppendLine("-- User-member links (5 rows)")
$insert = makeIgnore (renameMosqueId (dumpInserts "user_member_link"))
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 4. CONFIGURATIONS (6 rows) - CUSTOM: drop description, category columns
# =============================================================================
Write-Host "  [4/11] Configurations..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 4. CONFIGURATIONS (6 rows) - dropped: description, category")
[void]$sb.AppendLine("-- =============================================================================")
# Use custom SQL to select only the columns that exist in the new schema
$configQuery = @"
SELECT CONCAT(
  '(',
  id, ', ',
  QUOTE(name), ', ',
  IFNULL(QUOTE(value), 'NULL'), ', ',
  IFNULL(mosque_id, 'NULL'), ', ',
  QUOTE(created_at), ', ',
  QUOTE(updated_at),
  ')')
FROM configurations ORDER BY id
"@
$configRows = sqlData $configQuery
if ($configRows) {
    $values = ($configRows -join ",`n")
    [void]$sb.AppendLine("INSERT IGNORE INTO ``configurations`` (``id``, ``name``, ``value``, ``organization_id``, ``created_at``, ``updated_at``) VALUES")
    [void]$sb.AppendLine("$values;")
}
[void]$sb.AppendLine("")
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 5. ORGANIZATION FINANCE (org_currencies, exchange_rates, org_subscriptions)
# =============================================================================
Write-Host "  [5/11] Org finance..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 5. ORGANIZATION FINANCE")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("")

# Organization currencies (3 rows) - already uses organization_id
[void]$sb.AppendLine("-- Organization currencies (3 rows)")
$insert = makeIgnore (dumpInserts "organization_currencies")
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")

# Exchange rates (1 row) - rename mosque_id
[void]$sb.AppendLine("-- Exchange rates (1 row)")
$insert = makeIgnore (renameMosqueId (dumpInserts "exchange_rates"))
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")

# Organization subscriptions (4 rows) - already uses organization_id
[void]$sb.AppendLine("-- Organization subscriptions (4 rows)")
$insert = makeIgnore (dumpInserts "organization_subscriptions")
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 6. PERSONS & MEMBERSHIPS
# =============================================================================
Write-Host "  [6/11] Persons & Memberships..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 6. PERSONS & MEMBERSHIPS")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("")

# Persons (383 rows) - CUSTOM: drop notes, active; rename mosque_id; add NULL for id_number, profile_image_key
$personsQuery = @"
SELECT CONCAT(
  '(',
  id, ', ',
  QUOTE(first_name), ', ',
  QUOTE(last_name), ', ',
  IFNULL(QUOTE(gender), 'NULL'), ', ',
  IFNULL(QUOTE(date_of_birth), 'NULL'), ', ',
  IFNULL(QUOTE(date_of_death), 'NULL'), ', ',
  IFNULL(QUOTE(email), 'NULL'), ', ',
  IFNULL(QUOTE(phone), 'NULL'), ', ',
  IFNULL(QUOTE(address), 'NULL'), ', ',
  IFNULL(QUOTE(city), 'NULL'), ', ',
  IFNULL(QUOTE(country), 'NULL'), ', ',
  IFNULL(QUOTE(postal_code), 'NULL'), ', ',
  QUOTE(status), ', ',
  'NULL, ',
  IFNULL(QUOTE(hash), 'NULL'), ', ',
  'NULL, ',
  IFNULL(mosque_id, 'NULL'), ', ',
  IFNULL(QUOTE(created_at), 'NULL'), ', ',
  IFNULL(QUOTE(updated_at), 'NULL'),
  ')')
FROM persons ORDER BY id
"@
[void]$sb.AppendLine("-- Persons (383 rows)")
$personRows = sqlData $personsQuery
if ($personRows -and $personRows.Count -gt 0) {
    [void]$sb.AppendLine("INSERT IGNORE INTO ``persons`` (``id``, ``first_name``, ``last_name``, ``gender``, ``date_of_birth``, ``date_of_death``, ``email``, ``phone``, ``address``, ``city``, ``country``, ``postal_code``, ``status``, ``id_number``, ``hash``, ``profile_image_key``, ``organization_id``, ``created_at``, ``updated_at``) VALUES")
    $values = ($personRows -join ",`n")
    [void]$sb.AppendLine("$values;")
}
[void]$sb.AppendLine("")

# Memberships (379 rows) - rename mosque_id
[void]$sb.AppendLine("-- Memberships (379 rows)")
$insert = makeIgnore (renameMosqueId (dumpInserts "memberships"))
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 7. CONTRIBUTIONS & PAYMENTS
# =============================================================================
Write-Host "  [7/11] Contributions & Payments..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 7. CONTRIBUTIONS & PAYMENTS")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("")

# Contribution types (4 rows) - rename mosque_id
[void]$sb.AppendLine("-- Contribution types (4 rows)")
$insert = makeIgnore (renameMosqueId (dumpInserts "contribution_types"))
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")

# Contribution type translations (8 rows) - no mosque_id
[void]$sb.AppendLine("-- Contribution type translations (8 rows)")
$insert = makeIgnore (dumpInserts "contribution_type_translations")
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")

# Contribution obligations (1 row) - rename mosque_id
# Check the actual table name first
$hasContribObligations = sql "SELECT COUNT(*) AS c FROM contribution_obligations" | Select-Object -Last 1
if ($hasContribObligations -and [int]$hasContribObligations.Trim() -gt 0) {
    [void]$sb.AppendLine("-- Contribution obligations")
    $insert = makeIgnore (renameMosqueId (dumpInserts "contribution_obligations"))
    [void]$sb.AppendLine($insert)
    [void]$sb.AppendLine("")
}

# Member contribution assignments (1 row) - rename mosque_id
$hasAssignments = sql "SELECT COUNT(*) AS c FROM member_contribution_assignments" | Select-Object -Last 1
if ($hasAssignments -and [int]$hasAssignments.Trim() -gt 0) {
    [void]$sb.AppendLine("-- Member contribution assignments")
    $insert = makeIgnore (renameMosqueId (dumpInserts "member_contribution_assignments"))
    [void]$sb.AppendLine($insert)
    [void]$sb.AppendLine("")
}

# Member payments (1380 rows) - rename mosque_id
[void]$sb.AppendLine("-- Member payments (1380 rows)")
$insert = makeIgnore (renameMosqueId (dumpInserts "member_payments"))
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 8. GEDCOM (Genealogy)
# =============================================================================
Write-Host "  [8/11] GEDCOM..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 8. GEDCOM (Genealogy)")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("")

# Gedcom individuals (379 rows) - rename mosque_id
[void]$sb.AppendLine("-- GEDCOM individuals (379 rows)")
$insert = makeIgnore (renameMosqueId (dumpInserts "gedcom_individuals"))
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")

# Gedcom families (98 rows) - rename mosque_id
[void]$sb.AppendLine("-- GEDCOM families (98 rows)")
$insert = makeIgnore (renameMosqueId (dumpInserts "gedcom_families"))
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")

# Gedcom family children (88 rows) - CUSTOM: drop pedigree, rename mosque_id
[void]$sb.AppendLine("-- GEDCOM family children (88 rows)")
$childQuery = @"
SELECT CONCAT(
  '(',
  id, ', ',
  QUOTE(family_id), ', ',
  QUOTE(child_id), ', ',
  IFNULL(QUOTE(relationship_type), '''BIOLOGICAL'''), ', ',
  IFNULL(birth_order, 'NULL'), ', ',
  IFNULL(mosque_id, 'NULL'),
  ')')
FROM gedcom_family_children ORDER BY id
"@
$childRows = sqlData $childQuery
if ($childRows -and $childRows.Count -gt 0) {
    [void]$sb.AppendLine("INSERT IGNORE INTO ``gedcom_family_children`` (``id``, ``family_id``, ``child_id``, ``relationship_type``, ``birth_order``, ``organization_id``) VALUES")
    $values = ($childRows -join ",`n")
    [void]$sb.AppendLine("$values;")
}
[void]$sb.AppendLine("")

# Gedcom person links (379 rows) - rename mosque_id
[void]$sb.AppendLine("-- GEDCOM person links (379 rows)")
$insert = makeIgnore (renameMosqueId (dumpInserts "gedcom_person_links"))
[void]$sb.AppendLine($insert)
[void]$sb.AppendLine("")
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 9. GROUPS
# =============================================================================
Write-Host "  [9/11] Groups..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 9. GROUPS")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("")

# Groups (1 row) - rename mosque_id
[void]$sb.AppendLine("-- Groups (1 row)")
$insert = makeIgnore (renameMosqueId (dumpInserts "groups"))
if ($insert) { [void]$sb.AppendLine($insert) }
[void]$sb.AppendLine("")

# Group translations (2 rows)
[void]$sb.AppendLine("-- Group translations (2 rows)")
$insert = makeIgnore (dumpInserts "group_translations")
if ($insert) { [void]$sb.AppendLine($insert) }
[void]$sb.AppendLine("")

# Group roles (4 rows) - rename mosque_id
[void]$sb.AppendLine("-- Group roles (4 rows)")
$insert = makeIgnore (renameMosqueId (dumpInserts "group_roles"))
if ($insert) { [void]$sb.AppendLine($insert) }
[void]$sb.AppendLine("")

# Group role translations (8 rows)
[void]$sb.AppendLine("-- Group role translations (8 rows)")
$insert = makeIgnore (dumpInserts "group_role_translations")
if ($insert) { [void]$sb.AppendLine($insert) }
[void]$sb.AppendLine("")
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 10. DISTRIBUTION
# =============================================================================
Write-Host "  [10/11] Distribution..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 10. DISTRIBUTION")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("")

foreach ($table in @("distribution_events", "parcel_categories", "non_member_recipients", "member_distribution_registrations", "parcel_distributions")) {
    $count = (sql "SELECT COUNT(*) AS c FROM $table" | Select-Object -Skip 1).Trim()
    if ([int]$count -gt 0) {
        [void]$sb.AppendLine("-- $table ($count rows)")
        $insert = makeIgnore (dumpInserts $table)
        if ($insert) { [void]$sb.AppendLine($insert) }
        [void]$sb.AppendLine("")
    }
}
Write-Host " done" -ForegroundColor Green

# =============================================================================
# 11. SEQUENCES (update high-water marks)
# =============================================================================
Write-Host "  [11/11] Sequences..." -NoNewline
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("-- 11. SEQUENCES (update high-water marks)")
[void]$sb.AppendLine("-- =============================================================================")
[void]$sb.AppendLine("")

# Get all sequence values and generate UPDATE statements with correct column names
$seqQuery = "SELECT CONCAT('UPDATE sequences_ SET PK_VALUE = ', PK_VALUE, ' WHERE PK_NAME = ', QUOTE(PK_NAME), ' AND PK_VALUE < ', PK_VALUE, ';') FROM sequences_ ORDER BY PK_NAME"
$seqUpdates = sqlData $seqQuery
foreach ($upd in $seqUpdates) {
    [void]$sb.AppendLine($upd)
}
[void]$sb.AppendLine("")

# Footer
[void]$sb.AppendLine("SET SQL_MODE = @OLD_SQL_MODE;")
[void]$sb.AppendLine("SET FOREIGN_KEY_CHECKS = 1;")

# Write to file
# Write to file with UTF-8 encoding (no BOM)
[System.IO.File]::WriteAllText($sqlFile, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
$fileSize = (Get-Item $sqlFile).Length
Write-Host ""
Write-Host "Migration SQL generated: $sqlFile" -ForegroundColor Green
Write-Host "File size: $([math]::Round($fileSize / 1024, 1)) KB" -ForegroundColor Cyan
