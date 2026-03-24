@echo off
REM Step-by-step pipeline visualizer (Designer -> ... -> Classifier). Keep this window open for console logs.
cd /d "%~dp0"
python project.py --gui
if errorlevel 1 pause
