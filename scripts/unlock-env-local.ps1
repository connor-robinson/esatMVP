# Temporarily unlock .env.local for editing. Re-run protect-env-local.ps1 when done.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env.local"
$Backup = Join-Path $Root ".env.local.backup"

foreach ($p in @($EnvFile, $Backup)) {
    if (Test-Path -LiteralPath $p) {
        (Get-Item -LiteralPath $p -Force).IsReadOnly = $false
    }
}
Write-Host "[unlock-env] .env.local is writable. After saving changes, run: scripts\protect-env-local.ps1"
