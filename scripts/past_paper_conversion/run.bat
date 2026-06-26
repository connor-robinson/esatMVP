@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0..\.."

echo.
echo === Past Paper Conversion - RUN ===
echo.

python scripts\past_paper_conversion\export_for_viewer.py --list-papers

set /p PAPER_ID=Paper ID: 
if "%PAPER_ID%"=="" (
  echo Cancelled.
  pause
  exit /b 1
)

set /p LIMIT=Limit blank=all: 
set /p DRY=Dry run no DB writes? y/N: 

cd question-generation
set CMD=python -m past_paper_converter run --paper-id %PAPER_ID%
if not "%LIMIT%"=="" set CMD=!CMD! --limit %LIMIT%
if /i "%DRY%"=="y" set CMD=!CMD! --dry-run

echo.
echo Running: !CMD!
echo.
!CMD!
set EXIT_CODE=!ERRORLEVEL!
cd ..

echo.
node scripts\summarize_conversions.js

echo.
pause
exit /b %EXIT_CODE%
