# 智疗助手

AI健康咨询平台 - 前后端分离架构，支持 RAG 知识库检索

## 项目结构

```
zhi-liao-assistant/
├── web/                    # 前端项目 (Vue 3 + Vite)
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── composables/    # 组合式函数
│   │   ├── layouts/        # 布局组件
│   │   ├── router/         # 路由配置
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── styles/         # 样式文件
│   │   └── views/          # 页面视图
│   ├── public/             # 静态资源
│   └── package.json
│
├── server/                 # 后端项目 (Node.js + Fastify)
│   ├── src/
│   │   ├── config/         # 配置
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── repositories/   # 数据访问层
│   │   ├── routes/         # 路由
│   │   ├── services/       # 服务层
│   │   │   ├── llm.service.ts      # LLM 服务
│   │   │   ├── rag.service.ts      # RAG 服务
│   │   │   └── embedding.service.ts # Embedding 服务
│   │   ├── types/          # 类型定义
│   │   └── utils/          # 工具函数
│   ├── prisma/             # 数据库 Schema
│   └── package.json
│
├── docker-compose.yml      # Docker 开发环境
└── package.json            # 根 package.json (workspaces)
```

## RAG 系统架构

```
用户查询
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                      LLM Service                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  1. 接收用户问题                                         ││
│  │  2. 调用 RAG Service 检索相关文档                         ││
│  │  3. 构建带上下文的 Prompt                                 ││
│  │  4. 调用 Ollama 生成回复                                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                      RAG Service                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  1. 问题向量化 (Embedding)                               ││
│  │  2. 向量相似度搜索 (PostgreSQL pgvector)                  ││
│  │  3. 返回 Top-K 相关文档片段                               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Knowledge Base                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 健康知识库    │  │ 药品信息库   │  │ 体检报告库   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- Docker & Docker Compose
- (可选) NVIDIA GPU - 用于加速 LLM 推理

### 安装依赖

```bash
# 安装所有依赖
npm install

# 或分别安装
npm install --workspace=web
npm install --workspace=server
```

### 启动开发环境

```bash
# 1. 启动 Docker 服务 (PostgreSQL, Redis, Ollama, MinIO)
docker-compose up -d

# 2. 复制环境变量配置
cp server/.env.example server/.env

# 3. 初始化数据库 (需要先启用 pgvector 扩展)
docker exec -it zhiliao-postgres psql -U postgres -d zhiliao -c "CREATE EXTENSION IF NOT EXISTS vector;"
npm run db:migrate

# 4. 下载 LLM 模型 (首次运行需要)
docker exec -it zhiliao-ollama ollama pull qwen2.5:7b
docker exec -it zhiliao-ollama ollama pull nomic-embed-text

# 5. 启动前后端开发服务器
npm run dev
```

### 单独启动

```bash
# 仅启动前端
npm run dev:web

# 仅启动后端
npm run dev:server
```

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run build` | 构建前后端生产版本 |
| `npm run lint` | 代码检查 |
| `npm run typecheck` | 类型检查 |
| `npm run db:migrate` | 数据库迁移 |
| `npm run db:studio` | 打开 Prisma Studio |

## 端口

| 服务 | 端口 |
|------|------|
| 前端 | 3000 |
| 后端 API | 3001 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Ollama | 11434 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

## API 文档

启动后端后访问: http://localhost:3001/docs

### 核心 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/chat/stream` | 流式对话 (支持 RAG) |
| POST | `/api/v1/knowledge/documents` | 添加知识文档 |
| POST | `/api/v1/knowledge/search` | 知识库搜索 |
| GET | `/api/v1/knowledge/stats` | 知识库统计 |
| GET | `/api/v1/chat/health` | LLM 服务健康检查 |

## RAG 使用示例

### 添加知识文档

```bash
curl -X POST http://localhost:3001/api/v1/knowledge/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "高血压健康指南",
    "content": "高血压是一种常见的慢性病...",
    "source": "健康知识库",
    "category": "disease"
  }'
```

### 批量导入知识

```bash
curl -X POST http://localhost:3001/api/v1/knowledge/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "documents": [
      {
        "title": "文档1",
        "content": "内容1",
        "source": "来源1",
        "category": "general"
      }
    ]
  }'
```

### 对话时使用 RAG

```bash
curl -X POST http://localhost:3001/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "高血压患者应该注意什么？",
    "type": "CHAT",
    "useRAG": true
  }'
```

## LLM 配置

### 支持的 LLM 提供商

| 提供商 | 说明 | 配置 |
|--------|------|------|
| Ollama | 本地免费开源 (推荐) | `LLM_PROVIDER=ollama` |
| OpenAI | OpenAI API | `LLM_PROVIDER=openai` |
| HuggingFace | HuggingFace API | `LLM_PROVIDER=huggingface` |

### 推荐模型

| 用途 | 模型 | 大小 |
|------|------|------|
| 对话生成 | qwen2.5:7b | 4.7GB |
| 对话生成 | llama3.1:8b | 4.9GB |
| 文本嵌入 | nomic-embed-text | 274MB |
| 文本嵌入 | bge-m3 | 2.2GB |

### 无 GPU 环境

如果没有 GPU，可以使用 CPU 模式运行 Ollama：

```yaml
# docker-compose.yml 移除 GPU 配置
ollama:
  image: ollama/ollama:latest
  # 删除 deploy.resources 部分
```

或使用较小的模型：

```bash
docker exec -it zhiliao-ollama ollama pull qwen2.5:1.5b
```

## 技术栈

### 前端
- Vue 3 + Composition API
- TypeScript
- Vite
- Pinia
- Vue Router
- VueUse

### 后端
- Node.js
- Fastify
- Prisma
- PostgreSQL + pgvector
- Redis
- JWT

### AI/ML
- Ollama (本地 LLM)
- pgvector (向量存储)
- RAG (检索增强生成)

## 许可证

MIT
