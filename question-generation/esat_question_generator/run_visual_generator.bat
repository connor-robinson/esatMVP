@echo off
cd /d "%~dp0"
python visual_generator_ui.py
if errorlevel 1 pause
