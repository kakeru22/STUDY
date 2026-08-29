$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$port = 4174
$url = "http://127.0.0.1:$port/"

function Test-PortOpen {
  param([int]$TargetPort)

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect('127.0.0.1', $TargetPort, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne(300)
    if (-not $connected) {
      $client.Close()
      return $false
    }

    $client.EndConnect($async)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  throw 'node_modules not found. Run npm install first.'
}

if (-not (Test-Path (Join-Path $root 'dist/index.html'))) {
  Push-Location $root
  try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
      throw 'npm run build failed.'
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-PortOpen -TargetPort $port)) {
  $command = "Set-Location -LiteralPath '$root'; npm run local:serve"
  Start-Process powershell.exe -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command -WindowStyle Hidden

  $started = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    if (Test-PortOpen -TargetPort $port) {
      $started = $true
      break
    }
  }

  if (-not $started) {
    throw 'Failed to start local preview server.'
  }
}

Start-Process $url
