@echo off

cd /d C:\Dev\xva-platform

echo ============================
echo Snapshot + Sync Starting...
echo ============================

:: Create timestamp
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set ts=%%i

set branch=snapshot-%ts%

echo.
echo Creating snapshot branch: %branch%
git checkout -b %branch%

echo.
echo Adding changes...
git add .

echo.
echo Committing snapshot...
git commit -m "snapshot %ts%"

echo.
echo Pushing snapshot branch...
git push origin %branch%

echo.
echo Switching back to main...
git checkout main

echo.
echo Syncing main...
git add .
git commit -m "sync %ts%"
git push origin main

echo.
echo ============================
echo Snapshot + Sync Complete
echo ============================

pause