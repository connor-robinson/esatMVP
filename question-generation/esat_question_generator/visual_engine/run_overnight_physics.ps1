# Resume overnight Physics: far top-up + strict QA until >=40 keepers.
$ErrorActionPreference = "Continue"
Set-Location "c:\Users\anson\Desktop\nocalcMVP2_real\question-generation\esat_question_generator"
$env:PYTHONIOENCODING = "utf-8"
$logDir = "visual_engine\review_data"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $logDir "overnight_physics_$stamp.log"

Write-Host "Logging to $log"
python -u -m visual_engine.overnight_physics_diagrams `
  --hours 6 `
  --min-keep 40 `
  --magnetism-n 20 `
  --general-n 0 `
  --skip-magnetism `
  *>&1 | Tee-Object -FilePath $log
