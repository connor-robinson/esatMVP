# Overnight Physics diagrams: skip magnetism (already done), generate 50 more,
# strict QA across magnetism+general to >=40 keepers.
$ErrorActionPreference = "Continue"
Set-Location "c:\Users\anson\Desktop\nocalcMVP2_real\question-generation\esat_question_generator"
$logDir = "visual_engine\review_data"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $logDir "overnight_physics_$stamp.log"

Write-Host "Logging to $log"
python -u -m visual_engine.overnight_physics_diagrams `
  --hours 8 `
  --min-keep 40 `
  --magnetism-n 20 `
  --general-n 50 `
  --skip-magnetism `
  *>&1 | Tee-Object -FilePath $log
