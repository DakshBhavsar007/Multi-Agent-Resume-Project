@echo off
title Developer Workspace Manager - CareerEngine / Vishleshan

echo ===================================================
echo [1/4] Stopping existing processes on ports 5173 and 8000...
echo ===================================================

:: Stop any process on 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo Killing process %%a on port 5173
    taskkill /f /pid %%a 2>nul
)

:: Stop any process on 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    echo Killing process %%a on port 8000
    taskkill /f /pid %%a 2>nul
)

echo.
echo ===================================================
echo [2/4] Checking Redis status on port 6379...
echo ===================================================
netstat -ano | findstr :6379 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo Redis is already running on port 6379.
) else (
    echo Redis is NOT running. Attempting to start redis-server...
    where redis-server >nul 2>nul
    if %errorlevel% equ 0 (
        start "Redis Server" cmd /k "redis-server"
    ) else (
        echo WARNING: 'redis-server' command is not in your system PATH.
        echo Please ensure Redis is running manually or check your installation.
    )
)

echo.
echo ===================================================
echo [3/5] Starting Django Backend on port 8000...
echo ===================================================
start "Django Backend (Port 8000)" cmd /k "cd backend && python manage.py runserver 0.0.0.0:8000"

echo.
echo ===================================================
echo [4/5] Starting Vite Frontend on port 5173...
echo ===================================================
start "Vite Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo [5/5] Starting Celery Worker...
echo ===================================================
start "Celery Worker" cmd /k "cd backend && celery -A workers.celery_worker worker --loglevel=info --pool=threads --concurrency=4"

echo.
echo ===================================================
echo All services launched!
echo - Frontend: http://localhost:5173
echo - Backend: http://127.0.0.1:8000
echo ===================================================
pause

