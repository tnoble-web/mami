@echo off
setlocal

rem Double-click launcher for Windows. Runs from wherever this file lives, so it
rem works straight out of the downloaded folder with no command line needed.
cd /d "%~dp0"

title FRIDGE

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed yet, or Windows cannot find it.
  echo.
  echo   1. Go to https://nodejs.org
  echo   2. Click the big green LTS download button and install it
  echo   3. Close this window, then double-click this file again
  echo.
  pause
  exit /b 1
)

echo.
echo   Starting FRIDGE. Leave this window open while people use it.
echo   Press Ctrl+C, or just close this window, to stop it.
echo.

node --no-warnings bin\fridge.js %*

echo.
echo   FRIDGE has stopped.
echo.
pause
