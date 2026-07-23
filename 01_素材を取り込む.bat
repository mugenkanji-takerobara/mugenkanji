@echo off
chcp 65001 > nul
title きぼうかんじ 素材取り込み
cd /d "%~dp0"

echo.
echo ========================================
echo   きぼうかんじ 素材取り込み
echo ========================================
echo.

if not exist "%~dp0tools\import-assets.ps1" (
  echo エラー:
  echo tools フォルダ、または import-assets.ps1 がありません。
  echo ZIPの中身を一つずつ移動せず、
  echo 「すべて展開」で作られたフォルダをそのまま使ってください。
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0assets-manifest.json" (
  echo エラー:
  echo assets-manifest.json がありません。
  echo ZIPをもう一度「すべて展開」してください。
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\import-assets.ps1"

if errorlevel 1 (
  echo.
  echo 素材取り込み中にエラーが発生しました。
  echo 表示された内容をご確認ください。
  echo.
  pause
  exit /b 1
)
