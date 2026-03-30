#!/bin/bash

# 智疗助手 - 一键部署脚本 (Linux/Mac)
# 使用方法: chmod +x setup.sh && ./setup.sh

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=========================================="
echo -e "   智疗助手 - 环境初始化脚本"
echo -e "==========================================${NC}"
echo ""

# ========================================
# 步骤 1: 检查 Node.js
# ========================================
echo -e "${YELLOW}[1/6] 检查 Node.js 环境...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Node.js，请先安装 Node.js 20 或更高版本${NC}"
    echo -e "${YELLOW}下载地址: https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | tr -d 'v' | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}[错误] Node.js 版本过低，当前版本: $(node -v)${NC}"
    echo -e "${YELLOW}需要版本: v20.0.0 或更高${NC}"
    exit 1
fi

echo -e "${GREEN}[成功] Node.js 版本: $(node -v)${NC}"

# ========================================
# 步骤 2: 检查 npm
# ========================================
echo -e "${YELLOW}[2/6] 检查 npm...${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 npm${NC}"
    exit 1
fi

echo -e "${GREEN}[成功] npm 版本: $(npm -v)${NC}"

# ========================================
# 步骤 3: 安装依赖
# ========================================
echo -e "${YELLOW}[3/6] 安装项目依赖...${NC}"
echo -e "${GRAY}这可能需要几分钟，请耐心等待...${NC}"

npm install --legacy-peer-deps 2>&1 || {
    echo -e "${YELLOW}[警告] npm install 有警告，尝试继续...${NC}"
}

echo -e "${GREEN}[成功] 依赖安装完成${NC}"

# ========================================
# 步骤 4: 配置环境变量
# ========================================
echo -e "${YELLOW}[4/6] 配置环境变量...${NC}"

ENV_EXAMPLE="$SCRIPT_DIR/server/.env.example"
ENV_FILE="$SCRIPT_DIR/server/.env"

if [ ! -f "$ENV_EXAMPLE" ]; then
    echo -e "${RED}[错误] 找不到 server/.env.example 文件${NC}"
    exit 1
fi

if [ -f "$ENV_FILE" ]; then
    echo -e "${GRAY}[信息] server/.env 文件已存在${NC}"
else
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo -e "${GREEN}[成功] 已创建 server/.env 文件${NC}"
fi

echo -e "${YELLOW}[提示] 请稍后编辑 server/.env 配置你的 QWEN_API_KEY${NC}"

# ========================================
# 步骤 5: 数据库初始化提示
# ========================================
echo -e "${YELLOW}[5/6] 数据库初始化...${NC}"

echo ""
echo "请确保已完成以下步骤:"
echo -e "${GRAY}  1. 安装 PostgreSQL 数据库${NC}"
echo -e "${GRAY}  2. 安装 pgvector 扩展: CREATE EXTENSION IF NOT EXISTS vector;${NC}"
echo -e "${GRAY}  3. 创建数据库: CREATE DATABASE zhiliao;${NC}"
echo -e "${GRAY}  4. 配置 server/.env 中的 DATABASE_URL${NC}"
echo ""

read -p "是否已完成上述步骤并运行数据库迁移? (y/n): " db_ready

if [ "$db_ready" = "y" ] || [ "$db_ready" = "Y" ]; then
    echo -e "${GRAY}正在运行数据库迁移...${NC}"
    npm run db:migrate 2>&1 && {
        echo -e "${GREEN}[成功] 数据库迁移完成${NC}"
    } || {
        echo -e "${YELLOW}[警告] 数据库迁移失败，请检查数据库连接配置${NC}"
    }
else
    echo -e "${YELLOW}[跳过] 稍后请手动运行: npm run db:migrate${NC}"
fi

# ========================================
# 步骤 6: 构建项目
# ========================================
echo -e "${YELLOW}[6/6] 构建项目...${NC}"
echo -e "${GRAY}这可能需要几分钟...${NC}"

npm run build 2>&1 && {
    echo -e "${GREEN}[成功] 项目构建完成${NC}"
} || {
    echo -e "${YELLOW}[警告] 构建过程中有错误，但可以继续开发${NC}"
}

# ========================================
# 完成
# ========================================
echo ""
echo -e "${CYAN}=========================================="
echo -e "${GREEN}   环境初始化完成!${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo "后续步骤:"
echo -e "${GRAY}  1. 编辑 server/.env 配置 QWEN_API_KEY${NC}"
echo -e "${GRAY}  2. 运行 npm run dev 启动开发服务器${NC}"
echo -e "${GRAY}  3. 访问 http://localhost:5173${NC}"
echo ""
echo "常用命令:"
echo -e "${GRAY}  npm run dev          - 启动开发服务器${NC}"
echo -e "${GRAY}  npm run build        - 构建项目${NC}"
echo -e "${GRAY}  npm run db:migrate   - 数据库迁移${NC}"
echo -e "${GRAY}  npm run db:studio    - 打开数据库管理工具${NC}"
echo ""
