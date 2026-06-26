@echo off
cd /d "%~dp0"

:menu
cls
echo.
echo  Past Paper Conversion Tool
echo  ==========================
echo.
echo   1. Run conversion  (AI: image -^> text)
echo   2. Preview results (flip cards in browser)
echo   3. Status summary
echo   4. List paper IDs
echo   5. Exit
echo.
set /p CHOICE=Choose 1-5: 

if "%CHOICE%"=="1" (
  call scripts\past_paper_conversion\run.bat
  goto menu
)
if "%CHOICE%"=="2" (
  call scripts\past_paper_conversion\preview.bat
  goto menu
)
if "%CHOICE%"=="3" (
  node scripts\summarize_conversions.js
  echo.
  pause
  goto menu
)
if "%CHOICE%"=="4" (
  python scripts\past_paper_conversion\export_for_viewer.py --list-papers
  pause
  goto menu
)
if "%CHOICE%"=="5" exit /b 0

echo Invalid choice.
pause
goto menu
