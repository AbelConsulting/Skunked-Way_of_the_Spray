@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  Upload a COMBINED Windows + macOS + Linux build to SteamPipe in one shot
REM  (AppID 4815180). This is the recommended release path: it ships all three
REM  depots in a single build so the live "default" branch always satisfies
REM  the Steamworks "All Depots Attached" release-checklist item.
REM
REM  Prereqs — build each platform first and make sure the output folders
REM  below exist (copy artifacts here if platforms were built on separate
REM  machines/CI runners):
REM    release\win-unpacked      (npm run electron:build:win)
REM    release\mac               (npm run electron:build:mac, signed+notarized)
REM    release\linux-unpacked    (npm run electron:build:linux)
REM
REM  Have steamcmd available. Set STEAMCMD to its full path, or place
REM  steamcmd.exe on PATH.
REM
REM  Usage:
REM    steam\upload-all.bat <builder_account_name>
REM ─────────────────────────────────────────────────────────────────────────────
setlocal

if "%~1"=="" (
  echo Usage: steam\upload-all.bat ^<builder_account_name^>
  exit /b 1
)

set "BUILDER=%~1"
set "SCRIPT_DIR=%~dp0"
set "VDF=%SCRIPT_DIR%app_build_4815180_all.vdf"

if not defined STEAMCMD set "STEAMCMD=steamcmd"

set "MISSING=0"

if not exist "%SCRIPT_DIR%..\release\win-unpacked\" (
  echo [upload-all] MISSING release\win-unpacked. Run "npm run electron:build:win" first.
  set "MISSING=1"
)
if not exist "%SCRIPT_DIR%..\release\mac\" (
  echo [upload-all] MISSING release\mac. Run "npm run electron:build:mac" first ^(on macOS^).
  set "MISSING=1"
)
if not exist "%SCRIPT_DIR%..\release\linux-unpacked\" (
  echo [upload-all] MISSING release\linux-unpacked. Run "npm run electron:build:linux" first.
  set "MISSING=1"
)

if "%MISSING%"=="1" (
  echo [upload-all] Aborting: one or more platform builds are missing.
  exit /b 1
)

echo [upload-all] Running combined SteamPipe build for AppID 4815180 (all 3 depots)...
"%STEAMCMD%" +login "%BUILDER%" +run_app_build "%VDF%" +quit
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo [upload-all] steamcmd exited with code %RC%.
  exit /b %RC%
)

echo [upload-all] Done. Promote the build to the "default" branch from the Steamworks Builds page:
echo              https://partner.steamgames.com/apps/builds/4815180
endlocal
