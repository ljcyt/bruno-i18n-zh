<#
.SYNOPSIS
  把简体中文汉化注入 Bruno 的 app.asar（仅翻译，不修改授权）。

.DESCRIPTION
  - 自动定位 Bruno 安装目录的 app.asar（也可用 -AsarPath 指定）
  - 首次运行会备份为 app.asar.bak（原始版，仅保留一次）
  - 解包 → 注入 i18n.js + 在 index.html 中插入 <script> → 追加菜单本地化
  - 用 --unpack "*.node" 重新打包，保持原生模块在 app.asar.unpacked
  本脚本只处理翻译相关文件，绝不读取或修改 license 相关代码。

.PARAMETER AsarPath
  app.asar 的完整路径。默认探测常见安装位置。

.PARAMETER Force
  Bruno 正在运行时，自动结束其进程后再打补丁。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\apply.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\apply.ps1 -AsarPath "D:\Apps\Bruno\resources\app.asar" -Force
#>
[CmdletBinding()]
param(
  [string]$AsarPath,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$i18nSrc  = Join-Path $repoRoot 'src\i18n.js'
$menuSrc  = Join-Path $repoRoot 'src\menu-zh.js'

function Fail($msg) { Write-Host "✗ $msg" -ForegroundColor Red; exit 1 }
function Info($msg) { Write-Host "  $msg" -ForegroundColor Gray }
function Ok($msg)   { Write-Host "✓ $msg" -ForegroundColor Green }

# --- 0. 前置检查 ---
if (-not (Test-Path $i18nSrc)) { Fail "找不到 $i18nSrc，请先运行 ``node build.js``。" }
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { Fail "未找到 npx（需要 Node.js）。请先安装 Node.js。" }

# --- 1. 定位 app.asar ---
if (-not $AsarPath) {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Bruno\resources\app.asar",
    "$env:ProgramFiles\Bruno\resources\app.asar",
    "${env:ProgramFiles(x86)}\Bruno\resources\app.asar"
  )
  $AsarPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $AsarPath) {
    Fail "未能自动找到 app.asar，请用 -AsarPath 指定。探测过：`n   $($candidates -join "`n   ")"
  }
}
if (-not (Test-Path $AsarPath)) { Fail "指定的 app.asar 不存在：$AsarPath" }
$resDir = Split-Path -Parent $AsarPath
Ok "找到 app.asar：$AsarPath"

# --- 2. 检查 Bruno 是否运行 ---
$proc = Get-Process -Name 'Bruno' -ErrorAction SilentlyContinue
if ($proc) {
  if ($Force) {
    Info "Bruno 正在运行，正在结束进程…"
    Stop-Process -Name 'Bruno' -Force
    Start-Sleep -Milliseconds 1500
    if (Get-Process -Name 'Bruno' -ErrorAction SilentlyContinue) { Fail "无法结束 Bruno 进程。" }
  } else {
    Fail "Bruno 正在运行。请先关闭它，或加 -Force 让脚本自动结束（注意保存未保存内容）。"
  }
}

# --- 3. 备份（仅一次，保留原始版本）---
$bak = "$AsarPath.bak"
if (-not (Test-Path $bak)) {
  Copy-Item $AsarPath $bak -Force
  Ok "已备份原始 app.asar → app.asar.bak"
} else {
  Info "app.asar.bak 已存在，保留原始备份不覆盖。"
}

# --- 4. 解包到临时目录 ---
$work = Join-Path ([System.IO.Path]::GetTempPath()) ("bruno-i18n-" + [System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $work | Out-Null
Info "解包到临时目录…"
& npx --yes @electron/asar extract $AsarPath $work
if (-not $?) { Fail "解包失败。" }

# --- 5. 注入 i18n.js ---
$jsDir = Join-Path $work 'web\static\js'
if (-not (Test-Path $jsDir)) { Fail "未找到 web\static\js，可能不是受支持的 Bruno 版本结构。" }
Copy-Item $i18nSrc (Join-Path $jsDir 'i18n.js') -Force
Ok "已写入 web\static\js\i18n.js"

# --- 6. 在 index.html 注入 <script>（幂等）---
$indexHtml = Join-Path $work 'web\index.html'
if (-not (Test-Path $indexHtml)) { Fail "未找到 web\index.html。" }
$html = [System.IO.File]::ReadAllText($indexHtml, [System.Text.Encoding]::UTF8)
$tag = '<script defer src="static/js/i18n.js"></script>'
if ($html.Contains('static/js/i18n.js')) {
  Info "index.html 已包含 i18n.js 引用，跳过注入。"
} else {
  # 在主 bundle（index.<hash>.js）之前插入，确保 setter 补丁先于 React 安装
  $m = [regex]::Match($html, '<script[^>]*src="static/js/index\.[^"]*\.js"[^>]*></script>')
  if ($m.Success) {
    $html = $html.Insert($m.Index, $tag)
  } else {
    # 兜底：插到 </head> 前
    $html = $html -replace '</head>', "$tag</head>"
  }
  [System.IO.File]::WriteAllText($indexHtml, $html, (New-Object System.Text.UTF8Encoding($false)))
  Ok "已在 index.html 注入 i18n.js 引用"
}

# --- 7. 追加菜单本地化（幂等）---
$menuTpl = Join-Path $work 'src\app\menu-template.js'
if (Test-Path $menuTpl) {
  $menu = [System.IO.File]::ReadAllText($menuTpl, [System.Text.Encoding]::UTF8)
  if ($menu.Contains('BRUNO_I18N_ZH_MENU')) {
    Info "menu-template.js 已本地化，跳过。"
  } else {
    $snippet = [System.IO.File]::ReadAllText($menuSrc, [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText($menuTpl, $menu + "`n" + $snippet, (New-Object System.Text.UTF8Encoding($false)))
    Ok "已追加菜单本地化到 menu-template.js"
  }
} else {
  Info "未找到 menu-template.js，跳过菜单本地化（不影响界面翻译）。"
}

# --- 8. 重新打包 ---
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("app.asar." + [System.IO.Path]::GetRandomFileName())
Info "重新打包（--unpack `"*.node`"）…"
& npx --yes @electron/asar pack $work $stage --unpack "*.node"
if (-not $?) { Fail "打包失败。" }

# --- 9. 安装：替换 app.asar 与原生 unpacked ---
Copy-Item $stage $AsarPath -Force
$stageUnpacked = "$stage.unpacked"
$resUnpacked = Join-Path $resDir 'app.asar.unpacked'
if (Test-Path $stageUnpacked) {
  if (-not (Test-Path $resUnpacked)) { New-Item -ItemType Directory $resUnpacked | Out-Null }
  Copy-Item "$stageUnpacked\*" $resUnpacked -Recurse -Force
}
Ok "已安装汉化版 app.asar"

# --- 10. 清理 ---
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $stage -Force -ErrorAction SilentlyContinue
Remove-Item $stageUnpacked -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Ok "完成！启动 Bruno 即可看到中文界面。"
Info "如需还原，运行 scripts\restore.ps1（或把 app.asar.bak 改回 app.asar）。"
