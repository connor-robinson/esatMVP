# Database Backup Script for Supabase (PowerShell - Windows)
# Usage: .\backup_database.ps1

# Get current date for backup filenames
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = "backups_$Date"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Supabase Database Backup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get connection details from user
$DBHost = Read-Host "Enter Supabase DB Host (e.g., db.xxxxx.supabase.co)"
$SecurePassword = Read-Host "Enter Database Password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$DBPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
$DBName = Read-Host "Enter Database Name (usually 'postgres')"
if ([string]::IsNullOrWhiteSpace($DBName)) {
    $DBName = "postgres"
}

Write-Host ""
Write-Host "Starting backup..." -ForegroundColor Yellow

# Set PGPASSWORD environment variable for pg_dump
$env:PGPASSWORD = $DBPassword

# Backup 1: Schema only
Write-Host "1. Backing up database schema..." -ForegroundColor Yellow
$SchemaFile = "$BackupDir\schema_$Date.sql"
& pg_dump -h $DBHost -U postgres -d $DBName --schema-only --no-owner --no-privileges -F p | Out-File -FilePath $SchemaFile -Encoding UTF8

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Schema backup complete: $SchemaFile" -ForegroundColor Green
} else {
    Write-Host "   ✗ Schema backup failed" -ForegroundColor Red
}

# Backup 2: Data only (non-sensitive tables)
Write-Host "2. Backing up question data (non-sensitive)..." -ForegroundColor Yellow
$QuestionsFile = "$BackupDir\questions_data_$Date.sql"
& pg_dump -h $DBHost -U postgres -d $DBName --data-only --no-owner --no-privileges -t questions -t papers -t conversion_tables -t conversion_rows -F p | Out-File -FilePath $QuestionsFile -Encoding UTF8

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Questions data backup complete: $QuestionsFile" -ForegroundColor Green
} else {
    Write-Host "   ✗ Questions data backup failed" -ForegroundColor Red
}

# Backup 3: AI Generated Questions
Write-Host "3. Backing up AI generated questions..." -ForegroundColor Yellow
$AIQuestionsFile = "$BackupDir\ai_questions_$Date.sql"
& pg_dump -h $DBHost -U postgres -d $DBName --data-only --no-owner --no-privileges -t ai_generated_questions -F p | Out-File -FilePath $AIQuestionsFile -Encoding UTF8

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ AI questions backup complete: $AIQuestionsFile" -ForegroundColor Green
} else {
    Write-Host "   ✗ AI questions backup failed" -ForegroundColor Red
}

# Backup 4: All migrations
Write-Host "4. Copying migrations folder..." -ForegroundColor Yellow
if (Test-Path "supabase\migrations") {
    Copy-Item -Path "supabase\migrations" -Destination "$BackupDir\migrations" -Recurse -Force
    Write-Host "   ✓ Migrations copied" -ForegroundColor Green
} else {
    Write-Host "   ✗ Migrations folder not found" -ForegroundColor Red
}

# Clear password from memory
$env:PGPASSWORD = ""

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Backup Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Backup location: $BackupDir" -ForegroundColor Yellow
Write-Host ""
Get-ChildItem -Path $BackupDir | Format-Table Name, Length, LastWriteTime
Write-Host ""
Write-Host "Backup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "   - Do NOT commit backup files to git"
Write-Host "   - Store backups securely (encrypted)"
Write-Host "   - Delete backups after confirming dev environment is set up"
Write-Host ""
