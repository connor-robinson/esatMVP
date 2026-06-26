@echo off
setlocal
cd /d "%~dp0..\.."

echo.
echo === Past Paper Conversion - PREVIEW ===
echo.

python scripts\past_paper_conversion\export_for_viewer.py --list-papers

set /p PAPER_ID=Paper ID blank=latest any paper: 
set /p SHUFFLE=Shuffle cards? y/N: 

set EXPORT_ARGS=--limit 24
if not "%PAPER_ID%"=="" set EXPORT_ARGS=%EXPORT_ARGS% --paper-id %PAPER_ID%
if /i "%SHUFFLE%"=="y" set EXPORT_ARGS=%EXPORT_ARGS% --shuffle

python scripts\past_paper_conversion\export_for_viewer.py %EXPORT_ARGS%
if errorlevel 1 (
  echo Export failed.
  pause
  exit /b 1
)

echo.
echo Starting local viewer at http://localhost:8765/viewer.html
echo Press Ctrl+C to stop the server when done.
echo.

cd scripts\past_paper_conversion
start "" http://localhost:8765/viewer.html
python -m http.server 8765
