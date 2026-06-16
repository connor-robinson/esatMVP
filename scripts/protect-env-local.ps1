# Keeps repo-root .env.local safe: backup + auto-restore if wiped (no read-only lock).
# Run from run_quality_gate_ui.bat on start, or manually after editing env.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env.local"
$Backup = Join-Path $Root ".env.local.backup"
$MinBytes = 80

function Ensure-Writable([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $item = Get-Item -LiteralPath $Path -Force
    if ($item.IsReadOnly) {
        $item.IsReadOnly = $false
    }
}

Ensure-Writable $EnvFile
Ensure-Writable $Backup

# If main file is missing/empty but backup exists, restore.
if ((Test-Path -LiteralPath $Backup) -and (
        -not (Test-Path -LiteralPath $EnvFile) -or
        ((Get-Item -LiteralPath $EnvFile -Force).Length -lt $MinBytes)
    )) {
    Write-Host "[protect-env] Restoring .env.local from .env.local.backup"
    Copy-Item -LiteralPath $Backup -Destination $EnvFile -Force
    Ensure-Writable $EnvFile
}

# Refresh backup when main file looks healthy.
if ((Test-Path -LiteralPath $EnvFile) -and ((Get-Item -LiteralPath $EnvFile -Force).Length -ge $MinBytes)) {
    Copy-Item -LiteralPath $EnvFile -Destination $Backup -Force
    Ensure-Writable $Backup
}

$size = if (Test-Path -LiteralPath $EnvFile) { (Get-Item -LiteralPath $EnvFile -Force).Length } else { 0 }
Write-Host "[protect-env] .env.local size=$size bytes (backup at .env.local.backup)"
