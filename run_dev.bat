@echo off
title Veoma Labs - Development Mode
echo ========================================================
echo Starting Veoma Labs in Development Mode...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend API Server (Port 8000)...
start "Veoma Backend" .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

echo [2/2] Starting Frontend Vite Dev Server (Port 5173)...
cd frontend
start "Veoma Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

echo App is launching at http://localhost:5173
pause
