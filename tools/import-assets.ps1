$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $RepoRoot "assets-manifest.json"

try {
    if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
        throw "assets-manifest.json が見つかりません。"
    }

    $Dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $Dialog.Description = "現在正常に動作している KIBOUKANJI_VER1_TEST フォルダを選んでください。"
    $Dialog.ShowNewFolderButton = $false

    if ($Dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
        Write-Host ""
        Write-Host "フォルダが選ばれなかったため、中止しました。" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Enterキーで閉じる"
        exit 0
    }

    $SourceRoot = $Dialog.SelectedPath

    # 間違った親フォルダを選んだときに止める
    $ExpectedFiles = @("index.html", "game-core.js", "game-audio.js")
    $MissingExpected = @(
        $ExpectedFiles | Where-Object {
            -not (Test-Path -LiteralPath (Join-Path $SourceRoot $_) -PathType Leaf)
        }
    )

    if ($MissingExpected.Count -gt 0) {
        [System.Windows.Forms.MessageBox]::Show(
            "選んだ場所は KIBOUKANJI_VER1_TEST フォルダではない可能性があります。`n`nindex.html、game-core.js、game-audio.js が入っているフォルダを選んでください。",
            "選択したフォルダを確認してください",
            "OK",
            "Warning"
        ) | Out-Null

        Write-Host ""
        Write-Host "素材取り込みを中止しました。" -ForegroundColor Yellow
        Write-Host "選んだ場所: $SourceRoot"
        Write-Host ""
        Read-Host "Enterキーで閉じる"
        exit 1
    }

    $Manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json

    function Find-AssetFile {
        param(
            [string]$Root,
            [string[]]$Candidates
        )

        foreach ($Candidate in $Candidates) {
            $Normalized = $Candidate.Replace("/", [IO.Path]::DirectorySeparatorChar)
            $Direct = Join-Path $Root $Normalized
            if (Test-Path -LiteralPath $Direct -PathType Leaf) {
                return (Get-Item -LiteralPath $Direct).FullName
            }
        }

        foreach ($Candidate in $Candidates) {
            $FileName = [IO.Path]::GetFileName($Candidate)
            $Found = Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -ieq $FileName } |
                Select-Object -First 1

            if ($Found) {
                return $Found.FullName
            }
        }

        return $null
    }

    $Copied = 0
    $Missing = New-Object System.Collections.Generic.List[string]

    Write-Host ""
    Write-Host "素材を取り込んでいます。" -ForegroundColor Cyan
    Write-Host "コピー元: $SourceRoot"
    Write-Host "コピー先: $RepoRoot"
    Write-Host ""

    foreach ($Item in $Manifest.assets) {
        $Source = Find-AssetFile -Root $SourceRoot -Candidates $Item.candidates
        $Destination = Join-Path $RepoRoot $Item.target

        if ($Source) {
            Copy-Item -LiteralPath $Source -Destination $Destination -Force
            Write-Host "コピー: $($Item.target)" -ForegroundColor Green
            $Copied++
        } else {
            Write-Host "見つかりません: $($Item.target)" -ForegroundColor Yellow
            $Missing.Add($Item.target)
        }
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "素材の取り込みが終了しました。" -ForegroundColor Cyan
    Write-Host "コピーできた素材: $Copied 個"
    Write-Host "見つからなかった素材: $($Missing.Count) 個"
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    if ($Missing.Count -gt 0) {
        Write-Host "見つからなかった素材は、02_公開前チェック.batでも確認できます。" -ForegroundColor Yellow
    } else {
        Write-Host "素材はすべて見つかりました。" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "次の操作:"
    Write-Host "この画面を閉じた後、同じフォルダにある"
    Write-Host "02_公開前チェック.bat をダブルクリックしてください。" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Enterキーで閉じる"
}
catch {
    Write-Host ""
    Write-Host "エラーが発生しました。" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Enterキーで閉じる"
    exit 1
}
