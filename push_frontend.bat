@echo off
title Push Frontend Updates to GitHub
echo ========================================================
echo Pushing Frontend to https://github.com/NithishKumar31/veoma_frontend.git
echo ========================================================
echo.
cd /d "%~dp0frontend"
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update frontend components and styles

echo [1/3] Pushing source code to main branch...
git add .
git commit -m "%commit_msg%"
git push origin main

echo [2/3] Building production assets...
call npm run build

echo [3/3] Deploying to GitHub Pages (gh-pages branch)...
cd /d "%~dp0frontend\dist"
if exist ".git" rd /s /q ".git"
git init >nul
git config user.name "Nithish Kumar"
git config user.email "nithiskumar72009@gmail.com"
git checkout -b gh-pages >nul
git add -A
git commit -m "Deploy to GitHub Pages" >nul
git push https://github.com/NithishKumar31/veoma_frontend.git gh-pages --force >nul
if exist ".git" rd /s /q ".git"
cd /d "%~dp0frontend"

echo.
echo ========================================================
echo Frontend and GitHub Pages successfully updated!
echo Live Site: https://nithishkumar31.github.io/veoma_frontend/
echo ========================================================
pause
