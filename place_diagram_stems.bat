@echo off
cd /d "%~dp0"

echo.
echo === Past Paper Diagram Placement (final run) ===
echo Step 1: AI decides where each stem diagram sits in the text (no recrop)
echo Step 2: Apply placements + normalize display width into live questions
echo.

cd question-generation

python -m past_paper_converter place-and-apply-stems --all --resume %*

echo.
pause
