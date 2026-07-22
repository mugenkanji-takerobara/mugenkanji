@echo off
chcp 65001 > nul
title きぼうかんじ スマートフォン確認サーバー
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0kiboukanji-server.ps1"
echo.
echo サーバーを終了しました。
pause
