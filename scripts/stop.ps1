$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $rootDir '.backend.pid'
$stdoutLog = Join-Path $rootDir 'backend.stdout.log'
$stderrLog = Join-Path $rootDir 'backend.stderr.log'

if (-not (Test-Path $pidFile)) {
    Write-Host 'No backend PID file found. Nothing to stop.'
    exit 0
}

$backendPid = Get-Content $pidFile
if ($backendPid -and (Get-Process -Id $backendPid -ErrorAction SilentlyContinue)) {
    # uv runs uvicorn as a child process, so stop the whole tree.
    taskkill /PID $backendPid /T /F | Out-Null
    Write-Host "Stopped backend with PID $backendPid"
} else {
    Write-Host "Backend with PID $backendPid is not running."
}

Remove-Item $pidFile, $stdoutLog, $stderrLog -Force -ErrorAction SilentlyContinue
