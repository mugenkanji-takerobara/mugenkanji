@echo off
chcp 65001 > nul
title きぼうかんじ 公開前チェック
cd /d "%~dp0"

echo.
echo ========================================
echo   きぼうかんじ 公開前チェック
echo ========================================
echo.

if not exist "%~dp0tools\check-release.ps1" (
  echo エラー:
  echo tools フォルダ、または check-release.ps1 がありません。
  echo ZIPをもう一度「すべて展開」してください。
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\check-release.ps1"

if errorlevel 1 (
  echo.
  echo 公開前チェック中にエラーが発生しました。
  echo.
  pause
  exit /b 1
)
