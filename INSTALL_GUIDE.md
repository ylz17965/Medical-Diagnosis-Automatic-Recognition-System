# RAG 本地安装指南

## 1. 安装 PostgreSQL 15+

### Windows
下载地址: https://www.postgresql.org/download/windows/

安装时记住你设置的密码（默认用户是 postgres）

### 安装 pgvector 扩展

1. 下载 pgvector: https://github.com/pgvector/pgvector/releases
2. 或者使用预编译版本: https://github.com/pgvector/pgvector-windows

## 2. 安装 Ollama

### Windows
下载地址: https://ollama.com/download/windows

安装后打开终端运行:
```powershell
# 下载对话模型 (约 4.7GB)
ollama pull qwen2.5:7b

# 下载嵌入模型 (约 274MB)
ollama pull nomic-embed-text
```

## 3. 创建数据库

```powershell
# 使用 psql 或 pgAdmin 创建数据库
psql -U postgres

# 在 psql 中执行:
CREATE DATABASE zhiliao;
\c zhiliao
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

## 4. 配置环境变量

编辑 `server/.env` 文件，修改数据库密码:
```
DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/zhiliao?schema=public"
```

## 5. 初始化数据库

```powershell
cd server
npx prisma generate
npx prisma db push
```

## 6. 启动服务

```powershell
# 启动 Ollama (如果没自动启动)
ollama serve

# 启动后端 (新终端)
cd server
npm run dev
```

## 7. 测试 RAG

访问 http://localhost:3001/docs 查看 API 文档

### 添加知识文档
```bash
curl -X POST http://localhost:3001/api/v1/knowledge/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "高血压健康指南",
    "content": "高血压是一种常见的慢性病，需要长期管理...",
    "source": "健康知识库",
    "category": "disease"
  }'
```

### RAG 对话
```bash
curl -X POST http://localhost:3001/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "content": "高血压患者应该注意什么？",
    "useRAG": true
  }'
```
