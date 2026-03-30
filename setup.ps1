# 智疗助手 - 一键部署脚本 (Windows PowerShell)
# 使用方法: .\setup.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   智疗助手 - 环境初始化脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "[1/6] 检查 Node.js 环境..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    $nodeVersionNum = [int]($nodeVersion -replace 'v(\d+).*', '$1')
    if ($nodeVersionNum -lt 20) {
        Write-Host "错误: Node.js 版本过低，需要 20+，当前版本: $nodeVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: 未安装 Node.js，请先安装 Node.js 20+" -ForegroundColor Red
    exit 1
}

# 检查 PostgreSQL
Write-Host "[2/6] 检查 PostgreSQL..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version
    Write-Host "✓ PostgreSQL 已安装: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "警告: 未检测到 psql，请确保 PostgreSQL 已安装并运行" -ForegroundColor Yellow
}

# 安装依赖
Write-Host "[3/6] 安装项目依赖..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 依赖安装失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 依赖安装完成" -ForegroundColor Green

# 配置环境变量
Write-Host "[4/6] 配置环境变量..." -ForegroundColor Yellow
if (-not (Test-Path "server\.env")) {
    if (Test-Path "server\.env.example") {
        Copy-Item "server\.env.example" "server\.env"
        Write-Host "✓ 已创建 server\.env 文件" -ForegroundColor Green
        Write-Host "  请编辑 server\.env 配置你的 API Key 和数据库连接" -ForegroundColor Yellow
    } else {
        Write-Host "错误: 找不到 server\.env.example 文件" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ server\.env 已存在" -ForegroundColor Green
}

# 初始化数据库
Write-Host "[5/6] 初始化数据库..." -ForegroundColor Yellow
Write-Host "  请确保已创建数据库并安装 pgvector 扩展:" -ForegroundColor Yellow
Write-Host "  CREATE EXTENSION IF NOT EXISTS vector;"
Write-Host "  CREATE DATABASE zhiliao;"
Write-Host ""
$dbReady = Read-Host "是否已创建数据库? (y/n)"
if ($dbReady -eq "y" -or $dbReady -eq "Y") {
    npm run db:migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 数据库迁移完成" -ForegroundColor Green
    } else {
        Write-Host "警告: 数据库迁移失败，请检查数据库连接配置" -ForegroundColor Yellow
    }
} else {
    Write-Host "跳过数据库迁移，请稍后手动运行: npm run db:migrate" -ForegroundColor Yellow
}

# 构建项目
Write-Host "[6/6] 构建项目..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "警告: 构建过程中有错误，但可以继续开发" -ForegroundColor Yellow
} else {
    Write-Host "✓ 项目构建完成" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   环境初始化完成!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "后续步骤:"
Write-Host "1. 编辑 server\.env 配置 QWEN_API_KEY"
Write-Host "2. 运行 npm run dev 启动开发服务器"
Write-Host "3. 访问 http://localhost:5173"
Write-Host ""
