param([int]$Port = 8000)
$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))

function Get-ContentType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".htm"  { "text/html; charset=utf-8" }
    ".js"   { "text/javascript; charset=utf-8" }
    ".css"  { "text/css; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png"  { "image/png" }
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".gif"  { "image/gif" }
    ".webp" { "image/webp" }
    ".svg"  { "image/svg+xml" }
    ".mp3"  { "audio/mpeg" }
    ".wav"  { "audio/wav" }
    ".ogg"  { "audio/ogg" }
    ".ico"  { "image/x-icon" }
    default  { "application/octet-stream" }
  }
}

function Send-Response($Stream,[int]$Code,[string]$Text,[byte[]]$Body,[string]$Type,[bool]$HeadOnly=$false) {
  if ($null -eq $Body) { $Body = [byte[]]::new(0) }
  $Header = @(
    "HTTP/1.1 $Code $Text",
    "Content-Type: $Type",
    "Content-Length: $($Body.Length)",
    "Cache-Control: no-store, no-cache, must-revalidate",
    "Connection: close",
    "",
    ""
  ) -join "`r`n"
  $HeaderBytes=[System.Text.Encoding]::ASCII.GetBytes($Header)
  $Stream.Write($HeaderBytes,0,$HeaderBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) { $Stream.Write($Body,0,$Body.Length) }
  $Stream.Flush()
}

$Listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any,$Port)
try { $Listener.Start() }
catch {
  Write-Host ""
  Write-Host "ポート $Port を開始できませんでした。" -ForegroundColor Red
  Write-Host "別の画面ですでにサーバーが動いていないか確認してください。"
  Read-Host "Enterキーで終了"
  exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  きぼうかんじ スマートフォン確認サーバー" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "公開しているフォルダ:"
Write-Host "  $Root" -ForegroundColor Yellow
Write-Host ""
Write-Host "スマートフォンで次のアドレスを開いてください:" -ForegroundColor Green

$Addresses=[System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
  Where-Object { $_.OperationalStatus -eq [System.Net.NetworkInformation.OperationalStatus]::Up } |
  ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
  Where-Object {
    $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
    -not $_.Address.ToString().StartsWith("127.") -and
    -not $_.Address.ToString().StartsWith("169.254.")
  } |
  ForEach-Object { $_.Address.ToString() } |
  Sort-Object -Unique

foreach ($Address in $Addresses) {
  Write-Host "  http://${Address}:$Port/" -ForegroundColor Yellow
}
if (-not $Addresses) {
  Write-Host "  アドレスを自動取得できませんでした。別のPowerShellで ipconfig を実行してください。" -ForegroundColor Red
}

Write-Host ""
Write-Host "確認中は、この黒い画面を閉じないでください。"
Write-Host "終了するときは Ctrl キーを押しながら C キーを押します。"
Write-Host ""

try {
  while ($true) {
    $Client=$Listener.AcceptTcpClient()
    $Reader=$null; $Stream=$null
    try {
      $Stream=$Client.GetStream()
      $Reader=[System.IO.StreamReader]::new($Stream,[System.Text.Encoding]::ASCII,$false,4096,$true)
      $RequestLine=$Reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($RequestLine)) { continue }
      do { $Line=$Reader.ReadLine() } while ($null -ne $Line -and $Line -ne "")
      $Parts=$RequestLine.Split(" ")
      if ($Parts.Count -lt 2) { continue }
      $Method=$Parts[0].ToUpperInvariant()
      $HeadOnly=$Method -eq "HEAD"
      if ($Method -ne "GET" -and -not $HeadOnly) {
        Send-Response $Stream 405 "Method Not Allowed" ([Text.Encoding]::UTF8.GetBytes("この方法には対応していません。")) "text/plain; charset=utf-8"
        continue
      }
      $Target=$Parts[1].Split("?")[0]
      $Decoded=[Uri]::UnescapeDataString($Target)
      $Relative=$Decoded.TrimStart("/").Replace("/",[IO.Path]::DirectorySeparatorChar)
      if ([string]::IsNullOrWhiteSpace($Relative)) { $Relative="index.html" }
      $Candidate=[IO.Path]::GetFullPath((Join-Path $Root $Relative))
      if (-not $Candidate.StartsWith($Root,[StringComparison]::OrdinalIgnoreCase)) {
        Send-Response $Stream 403 "Forbidden" ([Text.Encoding]::UTF8.GetBytes("この場所は表示できません。")) "text/plain; charset=utf-8" $HeadOnly
        continue
      }
      if (Test-Path $Candidate -PathType Container) { $Candidate=Join-Path $Candidate "index.html" }
      if (-not (Test-Path $Candidate -PathType Leaf)) {
        Send-Response $Stream 404 "Not Found" ([Text.Encoding]::UTF8.GetBytes("ファイルが見つかりません。")) "text/plain; charset=utf-8" $HeadOnly
        continue
      }
      $Bytes=[IO.File]::ReadAllBytes($Candidate)
      Send-Response $Stream 200 "OK" $Bytes (Get-ContentType $Candidate) $HeadOnly
      Write-Host "$(Get-Date -Format 'HH:mm:ss')  $Method  $Decoded"
    }
    catch { Write-Host "エラー: $($_.Exception.Message)" -ForegroundColor Red }
    finally {
      if ($Reader) { $Reader.Dispose() }
      if ($Stream) { $Stream.Dispose() }
      $Client.Close()
    }
  }
}
finally { $Listener.Stop() }
