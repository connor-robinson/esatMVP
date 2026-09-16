# Overnight Physics diagrams: wait for magnetism job, finish magnetism to ~20,
# generate 50 more, strict QA to >=40 keepers.
$ErrorActionPreference = "Continue"
Set-Location "c:\Users\anson\Desktop\nocalcMVP2_real\question-generation\esat_question_generator"
$logDir = "visual_engine\review_data"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $logDir "overnight_physics_$stamp.log"

Write-Host "Logging to $log"
python -u -m visual_engine.overnight_physics_diagrams `
  --hours 10 `
  --min-keep 40 `
  --magnetism-n 20 `
  --general-n 50 `
  --wait-for-magnetism `
  *>&1 | Tee-Object -FilePath $log
