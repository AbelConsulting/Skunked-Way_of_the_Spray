@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  Upload the current Windows build to SteamPipe (AppID 4815180).
REM
REM  Prereqs:
REM    1. Build the desktop app first:   npm run electron:build:win
REM       (produces release\win-unpacked which the VDF points at)
REM    2. Have steamcmd available. Set STEAMCMD to its full path, or place
REM       steamcmd.exe on PATH. The Steamworks SDK ships it under
REM       tools\ContentBuilder\builder\steamcmd.exe
REM
REM  Usage:
REM    steam\upload.bat <builder_account_name>
REM
REM  You will be prompted for the password + Steam Guard code on first login;
REM  steamcmd then caches the session for subsequent uploads.
REM ─────────────────────────────────────────────────────────────────────────────
setlocal

if "%~1"=="" (
  echo Usage: steam\upload.bat ^<builder_account_name^>
  exit /b 1
)

set "BUILDER=%~1"
set "SCRIPT_DIR=%~dp0"
set "VDF=%SCRIPT_DIR%app_build_4815180.vdf"

if not defined STEAMCMD set "STEAMCMD=steamcmd"

if not exist "%SCRIPT_DIR%..\release\win-unpacked\" (
  echo [upload] release\win-unpacked not found. Run "npm run electron:build:win" first.
  exit /b 1
)

echo [upload] Running SteamPipe build for AppID 4815180...
"%STEAMCMD%" +login "%BUILDER%" +run_app_build "%VDF%" +quit
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo [upload] steamcmd exited with code %RC%.
  exit /b %RC%
)

echo [upload] Done. Promote the build to a branch from the Steamworks Builds page:
echo          https://partner.steamgames.com/apps/builds/4815180
endlocal
