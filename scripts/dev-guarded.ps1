<#
.SYNOPSIS
  Поднимает панель (bridges/app) локально ПОД СТОРОЖЕМ и гарантированно гасит её за собой.

.DESCRIPTION
  🔒 ЗАЧЕМ СТОРОЖ. Turbopack на КАЖДУЮ ошибку компиляции порождает нового воркера
  `.next/dev/build/postcss.js` и не убирает упавших. Ошибка повторяется на каждой попытке —
  воркеры копятся за минуты. 2026-08-27 это дало 258 процессов и out-of-memory на машине
  с 7.7 ГБ. Предупреждения нет: в логе стоит бодрое «Ready».

  🔒 ГАСИТ ПРИЦЕЛЬНО. Только процессы, чья командная строка содержит `bridges\app`.
  «Убить все node» снесло бы и то, что владельцу нужно.

  🔒 APP_ENV_PATH ОБЯЗАТЕЛЕН. Иначе двери мастера пишут в `/opt/fractera/app/.env.local`,
  которого на Windows нет. По умолчанию — временный файл, создаётся заново на каждый запуск.

.PARAMETER Run
  Блок проверок. Выполняется, когда панель ответила. Панель гасится после него в любом случае.
  Без него скрипт держит панель, пока её не остановят (Ctrl+C).

.PARAMETER EnvFile
  Подставной `.env.local` слота. По умолчанию временный файл со строкой `NEXT_PUBLIC_SITE_NAME=Test`.

.PARAMETER Seed
  Строки, дописываемые в EnvFile до старта: `@('USER_START_MODE=starter')`.

.EXAMPLE
  .\scripts\dev-guarded.ps1
  # держит панель на http://localhost:3002 до Ctrl+C

.EXAMPLE
  .\scripts\dev-guarded.ps1 -Seed @('USER_START_MODE=starter') -Run {
      (Invoke-WebRequest 'http://localhost:3002/ru/github' -UseBasicParsing).Content.Length
  }
#>
[CmdletBinding()]
param(
  [scriptblock] $Run,
  [string] $EnvFile,
  [string[]] $Seed = @(),
  [string] $Url = 'http://localhost:3002/ru/github',
  [int] $MaxProcs = 25,
  [int] $WaitSec = 120
)

$ErrorActionPreference = 'Stop'
$appDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'bridges\app'
if (-not (Test-Path (Join-Path $appDir 'package.json'))) {
  throw "Не найдена панель: $appDir"
}

if (-not $EnvFile) { $EnvFile = Join-Path $env:TEMP 'fractera-dev-guarded.env.local' }
Set-Content -Path $EnvFile -Value (@('NEXT_PUBLIC_SITE_NAME=Test') + $Seed) -Encoding utf8
$env:APP_ENV_PATH = $EnvFile

$logFile = Join-Path $env:TEMP 'fractera-dev-guarded.log'
if (Test-Path $logFile) { Remove-Item $logFile -Force }

function Get-MyNode {
  @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like '*bridges\app*' })
}
function Stop-MyNode {
  Get-MyNode | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }
}

# Хвост прошлого запуска — гасим до старта: иначе порт занят, а виноватым выглядит код.
$stale = (Get-MyNode).Count
if ($stale -gt 0) { Write-Host "сторож: гашу хвост прошлого запуска ($stale)"; Stop-MyNode; Start-Sleep -Milliseconds 1200 }

Write-Host "сторож: поднимаю панель, окружение → $EnvFile"
$proc = Start-Process cmd.exe -ArgumentList "/c npm run dev > `"$logFile`" 2>&1" `
        -WorkingDirectory $appDir -WindowStyle Hidden -PassThru

$ready = $false
$exitCode = 1
try {
  $ticks = [int][math]::Ceiling($WaitSec / 3)
  for ($i = 1; $i -le $ticks; $i++) {
    Start-Sleep -Seconds 3
    $n = (Get-MyNode).Count
    if ($n -gt $MaxProcs) {
      Write-Host "СТОРОЖ СРАБОТАЛ: $n процессов за $($i*3)s — форк-бомба, гашу" -ForegroundColor Red
      Write-Host "смотри лог: $logFile"
      Select-String -Path $logFile -Pattern "Can't resolve|Module not found|Error" |
        Select-Object -First 5 | ForEach-Object { "  " + $_.Line.Trim() }
      break
    }
    try {
      Invoke-WebRequest $Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop | Out-Null
      $ready = $true
      Write-Host "сторож: панель ответила за $($i*3)s при $n процессах" -ForegroundColor Green
      break
    } catch { }
  }

  if (-not $ready) {
    if ((Get-MyNode).Count -le $MaxProcs) {
      Write-Host "СТОРОЖ: панель не ответила за ${WaitSec}s" -ForegroundColor Yellow
      Select-String -Path $logFile -Pattern "Can't resolve|Module not found|Error" |
        Select-Object -First 5 | ForEach-Object { "  " + $_.Line.Trim() }
    }
  } elseif ($Run) {
    & $Run
    $exitCode = 0
  } else {
    Write-Host "сторож: панель держится на $Url. Ctrl+C — остановить."
    while ($true) {
      Start-Sleep -Seconds 3
      $n = (Get-MyNode).Count
      if ($n -eq 0) { Write-Host "сторож: панель погасла сама"; break }
      if ($n -gt $MaxProcs) { Write-Host "СТОРОЖ СРАБОТАЛ: $n процессов — гашу" -ForegroundColor Red; break }
    }
    $exitCode = 0
  }
}
finally {
  # 🔒 Гасим ВСЕГДА: и после проверок, и после сработавшего сторожа, и после Ctrl+C.
  Stop-MyNode
  try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
  Start-Sleep -Milliseconds 1200
  $left = (Get-MyNode).Count
  Write-Host "сторож: после уборки моих процессов node — $left"
}

exit $exitCode
