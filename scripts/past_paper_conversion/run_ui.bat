@echo off
cd /d "%~dp0..\.."
echo.
echo Starting Past Paper Conversion UI...
echo Browser will open at http://127.0.0.1:8777
echo Press Ctrl+C to stop.
echo.
python scripts\past_paper_conversion\ui_server.py
pause
