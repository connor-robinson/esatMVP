@echo off
cd /d "%~dp0"

echo.
echo === Past Paper Conversion Studio ===
echo Opens a local review UI at http://127.0.0.1:8790/
echo.

python -m scripts.past_paper_studio.server %*

echo.
pause
