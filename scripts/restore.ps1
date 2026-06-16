<#
.SYNOPSIS
  从 app.asar.bak 还原 Bruno 到汉化前的原始状态。

.PARAMETER AsarPath
  app.asar 的完整路径。默认探测常见安装位置。

.PARAMETER Force
  Bruno 正在运行时自动结束其进程。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 -Force
#>
[CmdletBinding()]
param(
  [string]$AsarPath,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
function Fail($m){ Write-Host "✗ $m" -ForegroundColor Red; exit 1 }
function Ok($m){ Write-Host "✓ $m" -ForegroundColor Green }
function Info($m){ Write-Host "  $m" -ForegroundColor Gray }

if (-not $AsarPath) {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Bruno\resources\app.asar",
    "$env:ProgramFiles\Bruno\resources\app.asar",
    "${env:ProgramFiles(x86)}\Bruno\resources\app.asar"
  )
  $AsarPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $AsarPath) { Fail "未找到 app.asar，请用 -AsarPath 指定。" }
}
$bak = "$AsarPath.bak"
if (-not (Test-Path $bak)) { Fail "找不到备份 $bak，无法还原。" }

$proc = Get-Process -Name 'Bruno' -ErrorAction SilentlyContinue
if ($proc) {
  if ($Force) { Stop-Process -Name 'Bruno' -Force; Start-Sleep -Milliseconds 1500 }
  else { Fail "Bruno 正在运行。请先关闭，或加 -Force。" }
}

Copy-Item $bak $AsarPath -Force
Ok "已从 app.asar.bak 还原原始 app.asar。"
Info "原生模块目录 app.asar.unpacked 未改动（汉化不影响它）。"
