# 智疗助手 - 一键部署脚本 (Windows PowerShell)
# 使用方法: 右键点击 -> 使用 PowerShell 运行
# 或在 PowerShell 中执行: .\setup.ps1

# 设置错误时继续执行
$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   智疗助手 - 环境初始化脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 获取脚本所在目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# ========================================
# 步骤 1: 检查 Node.js
# ========================================
Write-Host "[1/6] 检查 Node.js 环境..." -ForegroundColor Yellow

$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "[错误] 未检测到 Node.js，请先安装 Node.js 20 或更高版本" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按 Enter 键退出"
    exit 1
}

$nodeVersion = (node -v).Trim()
$nodeVersionNum = [int]($nodeVersion -replace "v(\d+).*", '$1')

if ($nodeVersionNum -lt 20) {
    Write-Host "[错误] Node.js 版本过低，当前版本: $nodeVersion" -ForegroundColor Red
    Write-Host "需要版本: v20.0.0 或更高" -ForegroundColor Yellow
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host "[成功] Node.js 版本: $nodeVersion" -ForegroundColor Green

# ========================================
# 步骤 2: 检查 npm
# ========================================
Write-Host "[2/6] 检查 npm..." -ForegroundColor Yellow

$npmPath = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmPath) {
    Write-Host "[错误] 未检测到 npm" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}

$npmVersion = (npm -v).Trim()
Write-Host "[成功] npm 版本: $npmVersion" -ForegroundColor Green

# ========================================
# 步骤 3: 安装依赖
# ========================================
Write-Host "[3/6] 安装项目依赖..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟，请耐心等待..." -ForegroundColor Gray

npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "[警告] npm install 返回非零退出码，尝试继续..." -ForegroundColor Yellow
}

Write-Host "[成功] 依赖安装完成" -ForegroundColor Green

# ========================================
# 步骤 4: 配置环境变量
# ========================================
Write-Host "[4/6] 配置环境变量..." -ForegroundColor Yellow

$envExamplePath = Join-Path $ScriptDir "server\.env.example"
$envPath = Join-Path $ScriptDir "server\.env"

if (-not (Test-Path $envExamplePath)) {
    Write-Host "[错误] 找不到 server\.env.example 文件" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}

if (Test-Path $envPath) {
    Write-Host "[信息] server\.env 文件已存在" -ForegroundColor Gray
} else {
    Copy-Item $envExamplePath $envPath -Force
    Write-Host "[成功] 已创建 server\.env 文件" -ForegroundColor Green
}

Write-Host "[提示] 请稍后编辑 server\.env 配置你的 QWEN_API_KEY" -ForegroundColor Yellow

# ========================================
# 步骤 5: 数据库初始化提示
# ========================================
Write-Host "[5/6] 数据库初始化..." -ForegroundColor Yellow

Write-Host ""
Write-Host "请确保已完成以下步骤:" -ForegroundColor White
Write-Host "  1. 安装 PostgreSQL 数据库" -ForegroundColor Gray
Write-Host "  2. 安装 pgvector 扩展: CREATE EXTENSION IF NOT EXISTS vector;" -ForegroundColor Gray
Write-Host "  3. 创建数据库: CREATE DATABASE zhiliao;" -ForegroundColor Gray
Write-Host "  4. 配置 server\.env 中的 DATABASE_URL" -ForegroundColor Gray
Write-Host ""

$dbReady = Read-Host "是否已完成上述步骤并运行数据库迁移? (y/n)"

if ($dbReady -eq "y" -or $dbReady -eq "Y") {
    Write-Host "正在运行数据库迁移..." -ForegroundColor Gray
    npm run db:migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[成功] 数据库迁移完成" -ForegroundColor Green
    } else {
        Write-Host "[警告] 数据库迁移失败，请检查数据库连接配置" -ForegroundColor Yellow
    }
} else {
    Write-Host "[跳过] 稍后请手动运行: npm run db:migrate" -ForegroundColor Yellow
}

# ========================================
# 步骤 6: 构建项目
# ========================================
Write-Host "[6/6] 构建项目..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟..." -ForegroundColor Gray

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[警告] 构建过程中有错误，但可以继续开发" -ForegroundColor Yellow
} else {
    Write-Host "[成功] 项目构建完成" -ForegroundColor Green
}

# ========================================
# 完成
# ========================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   环境初始化完成!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "功能模块:" -ForegroundColor White
Write-Host "  - 健康问答: AI医疗咨询" -ForegroundColor Gray
Write-Host "  - 报告解读: 体检报告分析" -ForegroundColor Gray
Write-Host "  - 肺部CT 3D可视化: DICOM/MHD文件体绘制" -ForegroundColor Gray
Write-Host ""
Write-Host "后续步骤:" -ForegroundColor White
Write-Host "  1. 编辑 server\.env 配置 QWEN_API_KEY" -ForegroundColor Gray
Write-Host "  2. 运行 npm run dev 启动开发服务器" -ForegroundColor Gray
Write-Host "  3. 访问 http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "肺部CT测试数据:" -ForegroundColor White
Write-Host "  - LUNA16: https://luna16.grand-challenge.org/Data/" -ForegroundColor Gray
Write-Host "  - LIDC-IDRI: https://www.cancerimagingarchive.net/collection/lidc-idri/" -ForegroundColor Gray
Write-Host ""
Write-Host "常用命令:" -ForegroundColor White
Write-Host "  npm run dev          - 启动开发服务器" -ForegroundColor Gray
Write-Host "  npm run build        - 构建项目" -ForegroundColor Gray
Write-Host "  npm run db:migrate   - 数据库迁移" -ForegroundColor Gray
Write-Host "  npm run db:studio    - 打开数据库管理工具" -ForegroundColor Gray
Write-Host ""

Read-Host "按 Enter 键退出"
