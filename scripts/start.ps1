$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $rootDir 'backend'
$pidFile = Join-Path $rootDir '.backend.pid'
$stdoutLog = Join-Path $rootDir 'backend.stdout.log'
$stderrLog = Join-Path $rootDir 'backend.stderr.log'

if (Test-Path $pidFile) {
    $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
        Write-Host "Backend already running with PID $existingPid"
        exit 0
    }
}

Push-Location $backendDir
$process = Start-Process -FilePath 'uv' -ArgumentList 'run', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000' -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
$process.Id | Set-Content $pidFile
Pop-Location

Write-Host "Backend started with PID $($process.Id)"
