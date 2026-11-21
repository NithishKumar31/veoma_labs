@echo off
title Push Backend Updates to GitHub
echo ========================================================
echo Pushing Backend to https://github.com/NithishKumar31/veoma_backend.git
echo ========================================================
echo.
cd /d "%~dp0"
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update backend APIs and services
git subtree push --prefix=backend https://github.com/NithishKumar31/veoma_backend.git main
echo.
echo Backend successfully pushed to GitHub!
pause
