# Keeps repo-root .env.local safe: backup + read-only + auto-restore if wiped.
# Run automatically from run_quality_gate_ui.bat, or manually after editing env.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env.local"
$Backup = Join-Path $Root ".env.local.backup"
$MinBytes = 80

function Set-ReadOnlyFlag([string]$Path, [bool]$ReadOnly) {
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $item = Get-Item -LiteralPath $Path -Force
    if ($ReadOnly) {
        $item.IsReadOnly = $true
    } else {
        $item.IsReadOnly = $false
    }
}

# If main file is missing/empty but backup exists, restore.
if ((Test-Path -LiteralPath $Backup) -and (
        -not (Test-Path -LiteralPath $EnvFile) -or
        ((Get-Item -LiteralPath $EnvFile -Force).Length -lt $MinBytes)
    )) {
    Write-Host "[protect-env] Restoring .env.local from .env.local.backup"
    Copy-Item -LiteralPath $Backup -Destination $EnvFile -Force
}

# Refresh backup when main file looks healthy.
if ((Test-Path -LiteralPath $EnvFile) -and ((Get-Item -LiteralPath $EnvFile -Force).Length -ge $MinBytes)) {
    Set-ReadOnlyFlag $Backup $false
    Copy-Item -LiteralPath $EnvFile -Destination $Backup -Force
}

Set-ReadOnlyFlag $EnvFile $true
Set-ReadOnlyFlag $Backup $true

$size = if (Test-Path -LiteralPath $EnvFile) { (Get-Item -LiteralPath $EnvFile -Force).Length } else { 0 }
Write-Host "[protect-env] .env.local size=$size bytes (read-only). To edit: scripts\unlock-env-local.ps1"
