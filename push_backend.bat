@echo off
title Push Backend Updates to GitHub
echo ========================================================
echo Pushing Backend to https://github.com/NithishKumar31/veoma_backend.git
echo ========================================================
echo.
cd /d "%~dp0"
git add backend
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update backend APIs and services
git commit -m "%commit_msg%"
git branch -D backend-latest 2>nul
git subtree split --prefix=backend -b backend-latest
git push https://github.com/NithishKumar31/veoma_backend.git backend-latest:main --force
echo.
echo Backend successfully pushed to GitHub!
pause
