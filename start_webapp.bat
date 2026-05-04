@echo off
chcp 65001 > nul
title Meeting Assistant - Web App

echo.
echo  ========================================
echo   🤖 Meeting Assistant - Web App Launcher
echo  ========================================
echo.

:: Start FastAPI Backend in a new window
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "Meeting Assistant - Backend" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

:: Start Next.js Frontend in a new window
echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
start "Meeting Assistant - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak > nul

:: Open browser
echo.
echo  ✅ Both servers started!
echo  🌐 Opening browser at http://localhost:3000 ...
echo.
start "" "http://localhost:3000"

echo  Press any key to exit this launcher...
pause > nul
