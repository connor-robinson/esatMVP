# Download latest NSAA CI review artifact and import into local review.db
# Usage (from repo root):
#   powershell -File question-generation/esat_question_generator/visual_engine/scripts/fetch_latest_ci_artifact.ps1

param(
  [string]$OutDir = "$env:TEMP\nsaa-ci-artifact"
)

$ErrorActionPreference = "Stop"

Write-Host "Looking up latest successful NSAA visual batch run..."
$runsJson = gh run list --workflow "NSAA visual batch" --status success --limit 5 --json databaseId,displayTitle,createdAt
$runs = $runsJson | ConvertFrom-Json
if (-not $runs -or $runs.Count -eq 0) {
  throw "No successful workflow runs found. Run the workflow first from GitHub Actions."
}

$runId = $runs[0].databaseId
Write-Host "Using run $runId ($($runs[0].createdAt))"

if (Test-Path $OutDir) { Remove-Item -Recurse -Force $OutDir }
New-Item -ItemType Directory -Path $OutDir | Out-Null

$esat = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$questionGen = (Resolve-Path (Join-Path $esat "..")).Path
$env:PYTHONPATH = "$questionGen;$esat"

Push-Location $OutDir
try {
  gh run download $runId
  $tgz = Get-ChildItem -Recurse -Filter "nsaa-review-data.tgz" | Select-Object -First 1
  if (-not $tgz) { throw "nsaa-review-data.tgz not found in downloaded artifacts" }
  Write-Host "Importing $($tgz.FullName)"
  Push-Location $esat
  try {
    python -m visual_engine.scripts.import_ci_review_artifact $tgz.FullName
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}

Write-Host "Done. Open Streamlit review app to inspect imported items."
