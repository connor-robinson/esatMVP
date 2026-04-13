@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo [1/2] Ensuring PyInstaller...
python -m pip install "pyinstaller>=6.0" -q
if errorlevel 1 (
  echo pip install failed
  exit /b 1
)
REM If PyInstaller says pathlib backport conflicts:  python -m pip uninstall pathlib -y

echo [2/2] Building ESATSimpleGenerator (onedir)...
python -m PyInstaller --noconfirm --clean ^
  --name ESATSimpleGenerator ^
  --windowed ^
  --onedir ^
  --collect-all google.genai ^
  --hidden-import pipeline_log ^
  --hidden-import project ^
  --hidden-import db_sync ^
  --hidden-import curriculum_parser ^
  --hidden-import math_paper_router ^
  --hidden-import correct_option_reconcile ^
  --hidden-import backup_manager ^
  --hidden-import dotenv ^
  --hidden-import supabase ^
  --hidden-import postgrest ^
  simple_generator_ui.py

if errorlevel 1 (
  echo Build failed.
  exit /b 1
)

echo.
echo Done: dist\ESATSimpleGenerator\ESATSimpleGenerator.exe
echo.
echo Deploy: copy EVERYTHING inside dist\ESATSimpleGenerator\ into this folder
echo        (esat_question_generator), merging with by_subject_prompts, schemas,
echo        curriculum, etc., so the .exe sits next to those folders.
echo        Keep .env.local next to the .exe (or two levels up as before).
echo.
endlocal
