$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $RepoRoot "assets-manifest.json"
$ResultPath = Join-Path $RepoRoot "公開前チェック結果.txt"

$RequiredCore = @(
    "index.html",
    "manual.html",
    "game-core.js",
    "game-board.js",
    "game-draw.js",
    "game-audio.js",
    "game-ui.js",
    "se_match.mp3",
    "se_drop.mp3",
    "se_bonus.mp3",
    "se_scene.mp3",
    "se_store.mp3",
    "retroparty.mp3",
    "retropark.mp3",
    "warayatakashi.mp3",
    "shamisen_intro.mp3",
    "future_teaser.mp4",
    "future_teaser_poster.jpg",
    "AUDIO_NOTICE.md",
    "o3.jpg",
    "lasta.png"
)

1..9 | ForEach-Object {
    $Number = $_.ToString("00")
    $Names = @(
        "sakura", "tulip", "green", "blue", "cloud",
        "detail", "city", "autumn", "night"
    )
    $RequiredCore += "toyama-castle-$Number-$($Names[$_ - 1]).jpg"
}

$Missing = New-Object System.Collections.Generic.List[string]

foreach ($File in $RequiredCore) {
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot $File) -PathType Leaf)) {
        $Missing.Add($File)
    }
}

if (Test-Path -LiteralPath $ManifestPath) {
    $Manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($Item in $Manifest.assets) {
        if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot $Item.target) -PathType Leaf)) {
            $Missing.Add($Item.target)
        }
    }
} else {
    $Missing.Add("assets-manifest.json")
}

$WrongNames = Get-ChildItem -LiteralPath $RepoRoot -File |
    Where-Object {
        $_.Name -match "\(\d+\)" -or
        $_.Name -match "\.(mp3|mp4|png|jpg|jpeg)\.(mp3|mp4|png|jpg|jpeg)$"
    } |
    Select-Object -ExpandProperty Name

$Lines = New-Object System.Collections.Generic.List[string]
$Lines.Add("きぼうかんじ　公開前チェック")
$Lines.Add("確認日時: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$Lines.Add("確認フォルダ: $RepoRoot")
$Lines.Add("")

if ($Missing.Count -eq 0) {
    $Lines.Add("結果: 公開に必要なファイルはすべてそろっています。")
} else {
    $Lines.Add("結果: 不足ファイルがあります。")
    $Lines.Add("")
    $Lines.Add("【不足ファイル】")
    ($Missing | Sort-Object -Unique) | ForEach-Object { $Lines.Add($_) }
}

if ($WrongNames.Count -gt 0) {
    $Lines.Add("")
    $Lines.Add("【名前を確認するファイル】")
    $WrongNames | ForEach-Object { $Lines.Add($_) }
}

$Lines | Set-Content -LiteralPath $ResultPath -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  きぼうかんじ 公開前チェック" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Missing.Count -eq 0) {
    Write-Host "必要なファイルはすべてそろっています。" -ForegroundColor Green
    Write-Host "GitHubへアップロードできます。" -ForegroundColor Green
} else {
    Write-Host "不足ファイルがあります。" -ForegroundColor Yellow
    ($Missing | Sort-Object -Unique) | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Yellow
    }
}

if ($WrongNames.Count -gt 0) {
    Write-Host ""
    Write-Host "ファイル名も確認してください。" -ForegroundColor Yellow
    $WrongNames | ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "結果を保存しました:"
Write-Host "  $ResultPath"
Write-Host ""
Read-Host "Enterキーで閉じる"
