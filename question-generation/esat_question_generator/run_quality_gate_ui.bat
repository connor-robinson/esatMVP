@echo off

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\protect-env-local.ps1" 2>nul

set "PYTHONPATH=%~dp0"

streamlit run quality_gate\streamlit_app.py

