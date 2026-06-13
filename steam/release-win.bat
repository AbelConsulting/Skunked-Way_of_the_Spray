@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  One-shot Windows release: build the Electron app AND upload it to SteamPipe.
REM  Skunked: Way of the Spray (AppID 4815180)
REM
REM  Usage:
REM    steam\release-win.bat <builder_account_name>
REM
REM  Steps:
REM    1. npm run electron:build:win   -> release\win-unpacked + NSIS installer
REM    2. steam\upload.bat             -> SteamPipe upload of release\win-unpacked
REM
REM  Prereqs: Node deps installed, steamcmd available (set STEAMCMD or on PATH).
REM  After it finishes, promote the build from the Steamworks Builds page.
REM ─────────────────────────────────────────────────────────────────────────────
setlocal

if "%~1"=="" (
  echo Usage: steam\release-win.bat ^<builder_account_name^>
  exit /b 1
)

set "BUILDER=%~1"
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."

pushd "%REPO_ROOT%"

echo [release-win] (1/2) Building Windows desktop app...
call npm run electron:build:win
if errorlevel 1 (
  echo [release-win] electron:build:win failed.
  popd & exit /b 1
)

echo [release-win] (2/2) Uploading to SteamPipe...
call "%SCRIPT_DIR%upload.bat" "%BUILDER%"
set "RC=%ERRORLEVEL%"

popd
endlocal & exit /b %RC%
