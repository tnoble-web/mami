@echo off
setlocal

rem Double-click tool that removes every person and everything they've logged,
rem while leaving the drink list (names, limits, par levels) exactly as set up.
cd /d "%~dp0"

title FRIDGE - Clear data

echo.
echo   This removes every person and everything they've logged: all
echo   check-ins and all restocks. Every drink's stock count resets to 0.
echo.
echo   It does NOT touch drink names, daily limits, or par levels you've
echo   set up -- the fridge setup itself stays exactly as it is.
echo.
echo   Make sure the black FRIDGE window is closed before continuing.
echo.
set /p CONFIRM="  Type YES and press Enter to continue, or close this window to cancel: "

if /I not "%CONFIRM%"=="YES" (
  echo.
  echo   Cancelled. Nothing was changed.
  echo.
  pause
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js isn't installed. See start-windows.bat for setup steps.
  echo.
  pause
  exit /b 1
)

echo.
node --no-warnings scripts\clear-data.js

echo.
pause
