@echo off
title Veoma Labs Management System
echo ========================================================
echo Starting Veoma Labs Business Management System...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking Python Virtual Environment...
if not exist ".venv\Scripts\python.exe" (
    echo Error: Python virtual environment not found in .venv.
    pause
    exit /b
)

echo [2/2] Launching Server on http://localhost:8000 ...
start "" "http://localhost:8000"
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

pause
