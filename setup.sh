#!/bin/bash

# 智疗助手 - 一键部署脚本 (Linux/Mac)
# 使用方法: chmod +x setup.sh && ./setup.sh

set -e

echo "=========================================="
echo "   智疗助手 - 环境初始化脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
echo -e "${YELLOW}[1/6] 检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未安装 Node.js，请先安装 Node.js 20+${NC}"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}错误: Node.js 版本过低，需要 20+，当前版本: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"

# 检查 PostgreSQL
echo -e "${YELLOW}[2/6] 检查 PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}警告: 未检测到 psql，请确保 PostgreSQL 已安装并运行${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL 已安装${NC}"
fi

# 安装依赖
echo -e "${YELLOW}[3/6] 安装项目依赖...${NC}"
npm install
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 配置环境变量
echo -e "${YELLOW}[4/6] 配置环境变量...${NC}"
if [ ! -f "server/.env" ]; then
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        echo -e "${GREEN}✓ 已创建 server/.env 文件${NC}"
        echo -e "${YELLOW}  请编辑 server/.env 配置你的 API Key 和数据库连接${NC}"
    else
        echo -e "${RED}错误: 找不到 server/.env.example 文件${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ server/.env 已存在${NC}"
fi

# 初始化数据库
echo -e "${YELLOW}[5/6] 初始化数据库...${NC}"
echo -e "${YELLOW}  请确保已创建数据库并安装 pgvector 扩展:${NC}"
echo "  CREATE EXTENSION IF NOT EXISTS vector;"
echo "  CREATE DATABASE zhiliao;"
echo ""
read -p "是否已创建数据库? (y/n): " db_ready
if [ "$db_ready" = "y" ] || [ "$db_ready" = "Y" ]; then
    npm run db:migrate
    echo -e "${GREEN}✓ 数据库迁移完成${NC}"
else
    echo -e "${YELLOW}跳过数据库迁移，请稍后手动运行: npm run db:migrate${NC}"
fi

# 构建项目
echo -e "${YELLOW}[6/6] 构建项目...${NC}"
npm run build
echo -e "${GREEN}✓ 项目构建完成${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}   环境初始化完成!${NC}"
echo "=========================================="
echo ""
echo "后续步骤:"
echo "1. 编辑 server/.env 配置 QWEN_API_KEY"
echo "2. 运行 npm run dev 启动开发服务器"
echo "3. 访问 http://localhost:5173"
echo ""
