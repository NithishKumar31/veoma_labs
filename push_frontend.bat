@echo off
title Push Frontend Updates to GitHub
echo ========================================================
echo Pushing Frontend to https://github.com/NithishKumar31/veoma_frontend.git
echo ========================================================
echo.
cd /d "%~dp0frontend"
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update frontend components and styles
git add .
git commit -m "%commit_msg%"
git push origin main
echo.
echo Frontend successfully pushed to GitHub!
pause
