@echo off
echo ========================================
echo UPDATING STREAMWEAVER TO LATEST VERSION
echo ========================================
echo.

REM Go to the correct folder
cd /d "%~dp0"

echo [1/4] Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Deleting Next.js cache...
if exist ".next" (
    rmdir /s /q .next
    echo Cache deleted!
) else (
    echo No cache found.
)

echo [3/4] Pulling latest code from GitHub...
git fetch origin
git reset --hard origin/main

echo [4/4] Starting StreamWeaver...
echo.
start-streamweaver.bat
