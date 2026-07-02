@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  Upload the current Linux build to SteamPipe (AppID 4815180, depot 4815183).
REM
REM  Can be run from Windows — steamcmd uploads cross-platform.
REM
REM  Prereqs:
REM    1. Build the Linux desktop app first:   npm run electron:build:linux
REM       (produces release\linux-unpacked which the VDF points at)
REM    2. Have steamcmd available. Set STEAMCMD to its full path, or place
REM       steamcmd.exe on PATH. Default install: C:\steamcmd\steamcmd.exe
REM
REM  Usage:
REM    steam\upload-linux.bat <builder_account_name>
REM
REM  After upload, promote the build from the Steamworks Builds page:
REM    https://partner.steamgames.com/apps/builds/4815180
REM ─────────────────────────────────────────────────────────────────────────────
setlocal

if "%~1"=="" (
  echo Usage: steam\upload-linux.bat ^<builder_account_name^>
  exit /b 1
)

set "BUILDER=%~1"
set "SCRIPT_DIR=%~dp0"
set "VDF=%SCRIPT_DIR%app_build_linux.vdf"

if not defined STEAMCMD set "STEAMCMD=C:\steamcmd\steamcmd.exe"

if not exist "%SCRIPT_DIR%..\release\linux-unpacked\" (
  echo [upload-linux] release\linux-unpacked not found. Run "npm run electron:build:linux" first.
  exit /b 1
)

echo [upload-linux] Running SteamPipe build for AppID 4815180 (Linux depot 4815183)...
"%STEAMCMD%" +login "%BUILDER%" +run_app_build "%VDF%" +quit
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo [upload-linux] steamcmd exited with code %RC%.
  exit /b %RC%
)

echo [upload-linux] Done. Promote the build to a branch from the Steamworks Builds page:
echo              https://partner.steamgames.com/apps/builds/4815180
endlocal
