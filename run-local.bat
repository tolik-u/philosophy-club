@echo off
REM Run local dev environment: backend (Flask) + frontend (static file server)
REM Usage: run-local.bat
REM
REM NOTE: The frontend JS has apiBase hardcoded to production.
REM For local testing, temporarily change apiBase in docs\app.js and docs\admin.js
REM from "https://philosophy-club.onrender.com" to "http://localhost:8080"

setlocal

set SCRIPT_DIR=%~dp0

echo [*] Starting backend on http://localhost:8080 ...
cd /d "%SCRIPT_DIR%be"
if not exist "venv" (
    echo [*] Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -q -r requirements.txt

start "Backend" python app.py

echo [*] Starting frontend on http://localhost:8000 ...
cd /d "%SCRIPT_DIR%docs"
start "Frontend" python -m http.server 8000

echo.
echo =========================================
echo   Frontend: http://localhost:8000
echo   Backend:  http://localhost:8080
echo   Close the terminal windows to stop
echo =========================================
echo.

pause
