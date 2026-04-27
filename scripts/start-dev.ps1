param()

$ErrorActionPreference = "Continue"

function Write-OK { param([string]$m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn { param([string]$m) Write-Host "  [!!] $m" -ForegroundColor DarkYellow }
function Write-Info { param([string]$m) Write-Host "  [..] $m" -ForegroundColor DarkCyan }
function Write-Step { param([string]$m) Write-Host ""; Write-Host ">>> $m" -ForegroundColor Cyan }

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "    ZhiLiao Assistant - Starting Dev Env" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ==========================================
# Step 1: PostgreSQL
# ==========================================
Write-Step "[1/3] PostgreSQL Database"
$pgService = Get-Service -Name "postgresql-*" -ErrorAction SilentlyContinue
if (-not $pgService) {
    Write-Warn "PostgreSQL service not found. Make sure it is installed."
} elseif ($pgService.Status -eq 'Running') {
    Write-OK "PostgreSQL is already running"
} else {
    Write-Info "Starting PostgreSQL..."
    Start-Service -Name $pgService.Name
    Start-Sleep -Seconds 3
    $pgService.Refresh()
    if ($pgService.Status -eq 'Running') {
        Write-OK "PostgreSQL started"
    } else {
        Write-Warn "Failed to start PostgreSQL"
    }
}

# ==========================================
# Step 2: Docker Desktop
# ==========================================
Write-Step "[2/3] Docker Desktop"
function Test-DockerReady {
    $result = docker ps 2>&1
    return $LASTEXITCODE -eq 0
}

if (Test-DockerReady) {
    Write-OK "Docker is already running"
} else {
    $dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $dockerExe)) {
        Write-Warn "Docker Desktop not found. Please start Redis manually."
    } else {
        Write-Info "Starting Docker Desktop..."
        Start-Process -FilePath $dockerExe
        $ready = $false
        for ($i = 1; $i -le 40; $i++) {
            Start-Sleep -Seconds 3
            if (Test-DockerReady) {
                $ready = $true
                break
            }
            Write-Info "Waiting for Docker Desktop... ($i/40)"
        }
        if ($ready) {
            Write-OK "Docker Desktop is ready"
        } else {
            Write-Warn "Docker Desktop startup timed out"
        }
    }
}

# ==========================================
# Step 3: Redis Container
# ==========================================
Write-Step "[3/3] Redis Container"
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

$redisRunning = & docker ps --filter "name=zhiliao-redis" --format "{{.Names}}" 2> $null
if ($redisRunning -eq "zhiliao-redis") {
    Write-OK "Redis container is already running"
} else {
    Write-Info "Starting Redis container..."
    $output = & docker compose up -d redis --wait 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Redis container started"
    } else {
        Write-Warn "Failed to start Redis: $output"
    }
}

# ==========================================
# Done
# ==========================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  All services are ready!" -ForegroundColor Green
Write-Host "    PostgreSQL : localhost:5432" -ForegroundColor Green
Write-Host "    Redis      : localhost:6379" -ForegroundColor Green
Write-Host "    Frontend   : localhost:5173" -ForegroundColor Green
Write-Host "    Backend    : localhost:3001" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting Web and Server..." -ForegroundColor Cyan
