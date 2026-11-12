@echo off
setlocal
title Preparation de CMS Temps pour Windows

echo ============================================================
echo   CMS Temps - Preparation et creation de l'installateur
echo ============================================================
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\installer-windows.ps1"
set "CMS_EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%CMS_EXIT_CODE%"=="0" (
  echo Une erreur a interrompu la preparation.
  echo Consultez le message ci-dessus avant de fermer cette fenetre.
) else (
  echo Operation terminee avec succes.
)
echo.
pause
exit /b %CMS_EXIT_CODE%
