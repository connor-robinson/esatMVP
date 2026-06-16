# Clear read-only on .env.local files (legacy — protect script no longer locks files).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
foreach ($name in @(".env.local", ".env.local.backup")) {
    $p = Join-Path $Root $name
    if (Test-Path -LiteralPath $p) {
        (Get-Item -LiteralPath $p -Force).IsReadOnly = $false
    }
}
Write-Host "[unlock-env] .env.local files are writable."
