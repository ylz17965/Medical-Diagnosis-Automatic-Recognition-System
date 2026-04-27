# 智疗助手 (ZhiLiao Assistant)

> 基于 AI 的医疗自助服务平台 — 专注于肺部疾病的智能诊断辅助，提供健康咨询、体检报告解读、用药指导、肺部 CT 3D 可视化、肺癌早筛等服务。

![Node](https://img.shields.io/badge/Node-%3E%3D20.0.0-339933?logo=node.js)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

---

## 目录

- [功能特性](#功能特性)
- [架构总览](#架构总览)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始 — Docker 部署（生产）](#快速开始--docker-部署生产)
- [快速开始 — 手动部署（开发）](#快速开始--手动部署开发)
- [环境变量说明](#环境变量说明)
- [可用脚本](#可用脚本)
- [API 接口文档](#api-接口文档)
- [核心功能详解](#核心功能详解)
- [知识图谱](#知识图谱)
- [深度学习分割](#深度学习分割)
- [常见问题](#常见问题)

---

## 功能特性

| 功能模块 | 说明 | 图片识别 |
|---------|------|---------|
| 深度搜索 | 搜索权威医学资料并整合答案，支持文献引用 | 否 |
| 健康问答 | 回答常见健康问题，附带权威来源标注 | 否 |
| 报告解读 | 上传体检报告图片，解析异常指标 | 是 |
| 药盒识别 | 上传药盒图片，识别药品信息 | 是 |
| 肺部 CT 3D 可视化 | 上传 DICOM/MHD 文件，进行肺部 CT 体绘制可视化 | 否 |
| 深度学习分割 | 基于 U-Net 的肺部分割，支持 WebGPU/WASM 加速 | 否 |
| 症状分析 | 基于知识图谱的症状-疾病推理 | 否 |
| 肺癌早筛 | Fleischner 指南结节管理、TNM 分期、精准医疗推荐 | 否 |
| 区块链存证 | 诊断建议上链存证，保证数据可信 | 否 |

### 核心亮点

- **RAG 检索增强生成**：知识库向量检索 + 重排序 + LLM 生成，回答有据可查
- **多格式医学影像**：支持 DICOM、MHD/RAW 格式的 3D 体绘制
- **肺部专科知识图谱**：30 种肺部疾病、30 种症状、30 种药物、100+ 条关系
- **专业医学知识库**：Fleischner 指南、TNM 分期、EGFR 靶向治疗等专业文档
- **文献引用系统**：回答附带权威医学文献引用，显示影响因子和引用段落
- **可解释 AI**：每个回答都有来源追溯和置信度评分
- **对话状态机**：14 种意图识别 + 10 种状态管理，智能追问收集关键信息
- **联邦搜索**：支持多节点联合检索

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                       用户浏览器                              │
│  Vue 3 SPA · VTK.js 3D · ONNX Runtime Web · Web Speech     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/SSE (localhost:5173)
                           │ Vite Dev Proxy → localhost:3001
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Fastify 后端 (Node.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ 认证系统  │ │ 聊天服务  │ │ RAG 服务 │ │ 对话状态机     │ │
│  │ JWT+jwt  │ │ 流式SSE  │ │ 向量检索 │ │ 14意图/10状态  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ 知识图谱  │ │ 智能体   │ │ 联邦搜索  │ │ 评估测试框架   │ │
│  │ 30疾病   │ │ 路由分发  │ │ 差分隐私  │ │ SUS/自定义问卷 │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ │
└──────┬──────────────┬────────────────────┬──────────────────┘
       │              │                    │
       ▼              ▼                    ▼
┌──────────┐   ┌──────────┐   ┌──────────────────────┐
│PostgreSQL│   │  Redis   │   │  阿里云百炼 API      │
│16 + vec  │   │  7       │   │  qwen-max / flash    │
│pgvector  │   │  缓存    │   │  text-embedding-v3   │
└──────────┘   └──────────┘   │  qwen3-rerank / vl   │
                              └──────────────────────┘
```

---

## 技术栈

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue 3 | ^3.5 | Composition API + `<script setup lang="ts">` |
| TypeScript | 5.x | 严格模式 |
| Vite | 5.x | 构建工具（含开发代理配置） |
| Pinia | ^2.1 | 状态管理（user / conversation / settings） |
| Vue Router | ^4.3 | SPA 路由（含导航守卫） |
| VueUse | ^10.9 | 组合式工具库 |
| VTK.js | ^25.1 | 医学影像 3D 体绘制 |
| cornerstone3D | ^4.21 | DICOM 解析与渲染 |
| ONNX Runtime Web | — | 浏览器端深度学习推理 |
| Three.js | ^0.183 | 3D 渲染引擎 |
| marked + DOMPurify | — | Markdown 渲染 + XSS 防护 |

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Fastify | 5.x | 高性能 Node.js 框架 |
| TypeScript | 5.7 | strict 模式 |
| Prisma | ^5.10 | ORM + PostgreSQL |
| ioredis | ^5.10 | Redis 客户端 |
| OpenAI SDK | ^6.33 | 阿里云百炼兼容层 |
| LangChain | ^0.1 | LLM 编排框架 |
| Pino | ^8.19 | 结构化日志 |
| Zod | ^3.22 | Schema 验证 |
| bcryptjs | — | 密码哈希 |
| @fastify/jwt | — | JWT 双令牌认证 |

### 数据库

| 组件 | 说明 |
|------|------|
| PostgreSQL 16 | 关系型数据库（Prisma 托管 10 个模型） |
| pgvector | 向量扩展（1024 维余弦相似度，HNSW 索引） |
| Redis 7 | 缓存层（RAG 查询 / Embedding / 访客会话 / 速率限制） |

### AI 模型（阿里云百炼）

| 模型 | 分工 | 对应功能 |
|------|------|---------|
| text-embedding-v3 | 文本向量化（1024维） | 知识库语义检索 |
| qwen3-rerank | 检索结果重排序 | RAG 答案准确性提升 |
| qwen-max | 复杂推理生成 | 深度搜索、报告解读 |
| qwen3.5-flash | 轻量快速问答 | 日常健康问答 |
| qwen3-vl-plus | 视觉理解 | 药盒识别 |
| qwen-vl-ocr | OCR 文字提取 | 体检报告文字提取 |

---

## 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 20.0.0 | 运行时环境 |
| npm | >= 9 | 包管理器 |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 可选 | 方式一（推荐）：`docker compose up -d` 一键部署 |
| [PostgreSQL 16](https://www.postgresql.org/download/windows/) | 14+ | 方式二：手动部署时需要 |
| [Redis](https://redis.io/) | 7.x | 可通过 Docker 运行 |
| Python | 3.9+（可选） | 创建 ONNX 分割模型 |

---

## 快速开始

> **仓库地址**：https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System

提供三种部署方式，按推荐程度排序：

| # | 方式 | 适合场景 | 难度 |
|---|------|---------|------|
| 1 | **Docker 一键部署** | 部署到服务器 / 快速体验全部功能 | ⭐ |
| 2 | **一键部署脚本** | Windows / Linux 本地开发 | ⭐⭐ |
| 3 | **手动部署** | 深度开发 / 自定义配置 | ⭐⭐⭐ |

---

### 方式一：Docker 一键部署（推荐）

只需 Docker Desktop，无需安装任何其他依赖。

```bash
# 1. 克隆仓库
git clone https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System

# 2. 创建环境变量（参考 server/.env.example，填入你的 API Key）
#    编辑 server/.env.docker，修改以下三项：
#    QWEN_API_KEY=sk-your-api-key-here
#    JWT_SECRET=your-64-char-random-string
#    COOKIE_SECRET=your-64-char-random-string

# 3. 一键启动全部服务（PostgreSQL + Redis + 后端 + 前端）
docker compose up -d
```

启动后访问：

| 服务 | 地址 | 说明 |
|------|------|------|
| **前端** | http://localhost | 浏览器访问入口 |
| **后端 API** | http://localhost:3000 | Fastify 服务 |
| **API 文档** | http://localhost:3000/docs | Swagger 在线文档 |
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |

其他命令：

```bash
docker compose logs -f     # 查看实时日志
docker compose down        # 停止所有服务
```

> **提示**：如使用预构建镜像，也可用 `docker-compose.example.yml`（从 ghcr.io 拉取）。

---

### 方式二：一键部署脚本（本地开发）

项目内置了自动化设置脚本，帮你完成环境检查、依赖安装、配置生成等步骤。

#### Windows

```powershell
# 以管理员身份运行 PowerShell
.\setup.ps1
```

#### Linux / Mac

```bash
chmod +x setup.sh
./setup.sh
```

脚本自动完成：
- ✅ 检查 Node.js 环境
- ✅ 安装项目依赖
- ✅ 生成环境变量文件
- ✅ 初始化数据库（需 PostgreSQL 已就绪）
- ✅ 构建项目

完成后，配置 API Key 并启动：

```bash
# 编辑 server/.env，填入真实的阿里云百炼 API Key
# QWEN_API_KEY="sk-你的APIKey"

# 一键启动（自动检测 PostgreSQL → 启动 Docker → 启动 Redis → 启动前后端）
npm run dev
```

---

### 方式三：手动部署（深度开发）

分步操作，适合需要自定义配置的开发者。

#### 1. 克隆并安装

```bash
git clone https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System
npm install
```

#### 2. 配置环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，修改关键配置：

```env
DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/zhiliao?schema=public"
JWT_SECRET="your-32-char-random-string"
COOKIE_SECRET="your-32-char-random-string"
QWEN_API_KEY="sk-你的阿里云百炼APIKey"
CORS_ORIGIN="http://localhost:5173"
```

#### 3. 准备数据库

```sql
-- 创建数据库并启用向量扩展
CREATE DATABASE zhiliao;
CREATE EXTENSION IF NOT EXISTS vector;
```

```bash
# 初始化数据库表
npm run db:generate
npm run db:push

# 可选：创建 HNSW 向量索引（提升搜索性能）
npm run db:vector-index
```

#### 4. 启动

```bash
# 一键启动（自动检测并启动 PostgreSQL + Docker + Redis）
npm run dev
```

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |
| API 文档 | http://localhost:3001/docs |

#### 其他命令参考

```bash
npm run dev:quick      # 跳过依赖检查，仅启动前后端
npm run deps           # 仅启动基础设施（PostgreSQL + Redis）
npm run dev:web        # 仅启动前端
npm run dev:server     # 仅启动后端
npm run build          # 构建生产版本
npm run test           # 运行测试
```

---

## 环境变量说明

所有环境变量在 `server/.env` 中配置，完整模板见 [server/.env.example](server/.env.example)。

### 基础配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | `development` | 运行环境 |
| `PORT` | `3001` | 后端端口 |

### 数据库

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串，格式：`postgresql://user:password@host:port/db?schema=public` |

### Redis

| 变量 | 必填 | 说明 |
|------|------|------|
| `REDIS_URL` | ❌ | Redis 连接字符串，默认 `redis://localhost:6379`。未配置时缓存功能降级 |

### 认证

| 变量 | 必填 | 说明 |
|------|------|------|
| `JWT_SECRET` | ✅ | JWT 签名密钥（至少 32 位随机字符） |
| `JWT_EXPIRES_IN` | ❌ | Access Token 过期时间，默认 `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | ❌ | Refresh Token 过期时间，默认 `7d` |
| `COOKIE_SECRET` | ✅ | Cookie 签名密钥 |

### CORS

| 变量 | 必填 | 说明 |
|------|------|------|
| `CORS_ORIGIN` | ✅ | 前端地址，开发模式为 `http://localhost:5173` |

### 阿里云百炼 API

| 变量 | 必填 | 说明 |
|------|------|------|
| `QWEN_API_KEY` | ✅ | 阿里云百炼 API Key。不配置时系统以降级模式运行 |
| `QWEN_BASE_URL` | ❌ | API 端点，默认 `https://dashscope.aliyuncs.com/compatible-mode/v1` |

### AI 模型选择

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `QWEN_MODEL_COMPLEX` | `qwen-max` | 复杂任务（深度分析、报告解读） |
| `QWEN_MODEL_SIMPLE` | `qwen3.5-flash` | 简单问答（日常对话，低成本） |
| `QWEN_MODEL_EMBEDDING` | `text-embedding-v3` | 文本嵌入模型 |
| `QWEN_MODEL_RERANK` | `qwen3-rerank` | 重排序模型 |
| `QWEN_MODEL_VISION` | `qwen3-vl-plus` | 视觉模型 |
| `QWEN_MODEL_OCR` | `qwen-vl-ocr` | OCR 模型 |

### RAG 检索配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `EMBEDDING_DIMENSION` | `1024` | 向量维度 |
| `RAG_TOP_K` | `5` | 最终返回文档数 |
| `RAG_RERANK_TOP_K` | `10` | 重排序候选文档数 |
| `RAG_CHUNK_SIZE` | `512` | 文本分块大小（字符数） |
| `RAG_CHUNK_OVERLAP` | `128` | 分块重叠大小（字符数） |
| `RAG_SIMILARITY_THRESHOLD` | `0.7` | 向量相似度阈值 |

---

## 可用脚本

### 根项目（monorepo）

| 命令 | 说明 |
|------|------|
| `npm run dev` | **一键启动**：基础设施 → 前端 + 后端 |
| `npm run dev:quick` | 仅启动前端 + 后端（跳过依赖检查） |
| `npm run deps` | 仅启动基础设施（PostgreSQL + Docker + Redis） |
| `npm run dev:web` | 仅启动前端 Vite Dev Server |
| `npm run dev:server` | 仅启动后端 |
| `npm run build` | 构建前端 + 后端 |
| `npm run build:web` | 仅构建前端 |
| `npm run build:server` | 仅构建后端 |
| `npm run lint` | 代码检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run test` | 运行后端测试 |
| `npm run db:migrate` | 数据库迁移 |
| `npm run db:studio` | 打开 Prisma Studio |

### 后端工作区

| 命令 | 说明 |
|------|------|
| `npm run db:generate` | 生成 Prisma 客户端 |
| `npm run db:push` | 推送 Schema 到数据库 |
| `npm run db:seed` | 导入种子数据（知识图谱等） |
| `npm run db:vector-index` | 创建 HNSW 向量索引 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |

### 前端工作区

| 命令 | 说明 |
|------|------|
| `npm run preview` | 预览生产构建 |

---

## API 接口文档

> 基础路径：`/api`

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 手机号注册 | 否 |
| POST | `/api/auth/login` | 登录（手机验证码 / 邮箱+密码） | 否 |
| POST | `/api/auth/send-code` | 发送验证码 | 否 |
| POST | `/api/auth/refresh` | 刷新令牌 | 否 |
| POST | `/api/auth/reset-password` | 重置密码 | 否 |
| POST | `/api/auth/logout` | 登出 | 是 |

### 聊天

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/chat/message` | 发送消息 | 是 |
| GET | `/api/chat/history/:conversationId` | 获取对话历史 | 是 |
| POST | `/api/chat/stream` | 流式聊天（SSE） | 是 |
| DELETE | `/api/chat/conversation/:id` | 删除对话 | 是 |

### 对话管理

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/conversation/list` | 对话列表 | 是 |
| POST | `/api/conversation/create` | 创建对话 | 是 |
| PUT | `/api/conversation/:id` | 更新对话 | 是 |
| DELETE | `/api/conversation/:id` | 删除对话 | 是 |

### 用户

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/user/profile` | 获取个人资料 | 是 |
| PUT | `/api/user/profile` | 更新个人资料 | 是 |
| PUT | `/api/user/password` | 修改密码 | 是 |

### 知识库

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/knowledge/upload` | 上传知识文档 | 是 |
| GET | `/api/knowledge/documents` | 文档列表 | 是 |
| DELETE | `/api/knowledge/documents/:id` | 删除文档 | 是 |
| POST | `/api/knowledge/search` | 语义搜索知识库 | 是 |
| POST | `/api/knowledge/query` | 知识库问答 | 是 |

### 文件上传

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/upload/file` | 上传文件 | 是 |
| POST | `/api/upload/image` | 上传图片 | 是 |
| DELETE | `/api/upload/:id` | 删除文件 | 是 |

### 图片分析

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/image/analyze` | 图片分析（CT / 报告） | 是 |
| POST | `/api/image/ocr` | OCR 文字识别 | 是 |

### 智能体

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/agent/chat` | 多智能体对话 | 是 |
| GET | `/api/agent/status` | 智能体状态 | 是 |

### 仪表盘

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/dashboard/stats` | 统计概览 | 是 |
| GET | `/api/dashboard/activity` | 活动记录 | 是 |
| GET | `/api/dashboard/trends` | 趋势分析 | 是 |

### 对话系统（状态机）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/dialog/query` | 状态机驱动对话 | 否 |
| GET | `/api/dialog/status` | 查询对话状态 | 否 |

### 可解释 RAG

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/explainable-rag/query` | 可解释检索问答 | 是 |
| POST | `/api/explainable-rag/search` | 可解释检索 | 是 |

### 混合搜索

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/hybrid-search/search` | 向量 + 关键词混合搜索 | 是 |

### 联邦搜索

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/federated/search` | 多节点联邦搜索 | 是 |

### 知识图谱

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/knowledge-graph/diseases` | 疾病列表 | 否 |
| GET | `/api/knowledge-graph/diseases/:name` | 疾病详情 | 否 |
| POST | `/api/knowledge-graph/query` | 图谱查询 | 否 |
| GET | `/api/knowledge-graph/related` | 关联查询 | 否 |
| POST | `/api/knowledge-graph/reason` | 诊断推理 | 否 |

### 测试与评估（开发模式）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/test/run/all` | 运行全部测试 |
| POST | `/api/test/run/medical-exam` | 医学考试测试 |
| POST | `/api/test/run/dialogue` | 对话测试 |
| POST | `/api/test/run/edge-cases` | 边界测试 |
| GET | `/api/test/datasets/info` | 数据集信息 |
| GET | `/api/test/report/latest` | 最新测试报告 |

---

## 核心功能详解

### RAG 检索增强生成

```
用户查询 → text-embedding-v3 向量化
         → PostgreSQL pgvector 余弦相似度搜索（HNSW 索引）
         → qwen3-rerank 重排序
         → qwen-max / qwen3.5-flash 生成回答
         → 附带引用来源和置信度评分
```

RAG 相关文件：
- [rag.service.ts](server/src/services/rag.service.ts) — 核心 RAG 流程
- [embedding.service.ts](server/src/services/embedding.service.ts) — 文本嵌入
- [reranker.service.ts](server/src/services/reranker.service.ts) — 重排序
- [redis-cache.service.ts](server/src/services/redis-cache.service.ts) — 查询缓存

### 对话状态机

系统内置完整的医疗问诊对话状态机：

**10 种状态**：`INIT → SYMPTOM_COLLECTION → DIAGNOSIS → TREATMENT_INQUIRY → DRUG_INQUIRY → EXAMINATION_INQUIRY → CLARIFICATION → CONFIRMATION → COMPLETED → ERROR`

**14 种意图**：症状描述、疾病查询、药物查询、治疗查询、检查查询、紧急情况、澄清请求、确认、问候、一般问题、饮食建议、日常护理、报告解读、未知

相关文件：[services/dialog/](server/src/services/dialog/)

### 多智能体系统

| 智能体 | 职责 |
|--------|------|
| 路由智能体 | 分析用户意图，分发到专业子智能体 |
| 搜索智能体 | 知识库和向量检索 |
| 对话智能体 | 多轮对话管理 |
| 药物智能体 | 药物查询与安全审查 |
| 紧急检测智能体 | 识别紧急情况并触发安全协议 |

相关文件：[agent.service.ts](server/src/services/agent.service.ts)

### 可解释 RAG

提供检索结果的置信度评分、回答的可解释性说明和引用来源追踪，结合可信度评估服务确保医疗信息的可靠性。

相关文件：
- [explainable-rag.service.ts](server/src/services/explainable-rag.service.ts)
- [credibility.service.ts](server/src/services/credibility.service.ts)

### Redis 使用场景

| 场景 | 说明 |
|------|------|
| RAG 查询缓存 | 缓存向量检索结果，加速重复查询 |
| Embedding 缓存 | 缓存文本嵌入结果，避免重复计算 |
| 访客会话 | 未登录用户的访客消息临时存储 |
| 速率限制 | API 请求频率限制 |

Redis 服务降级：如果 Redis 未启动，系统不会崩溃，但上述缓存功能会失效。

---

## 知识图谱

内存图结构，覆盖肺部疾病专科领域。

### 数据统计

| 实体类型 | 数量 | 说明 |
|---------|------|------|
| 疾病 | 30 | 肺癌、肺结节、肺炎、COPD、哮喘等 |
| 症状 | 30 | 咳嗽、咯血、呼吸困难、胸痛等 |
| 药品 | 30 | 靶向药物、抗生素、支气管扩张剂等 |
| 检查 | 12 | 胸部 CT、肺功能、肿瘤标志物等 |
| 身体部位 | 10 | 肺、支气管、胸膜等 |
| 科室 | 10 | 呼吸内科、胸外科、肿瘤科等 |
| **关系** | **100+** | 疾病↔症状、疾病↔药物、疾病↔检查等 |

### 关系类型（含权重）

| 关系 | 说明 | 权重范围 |
|------|------|---------|
| `HAS_SYMPTOM` | 疾病有症状 | 0.6 - 0.95 |
| `TREATED_BY` | 疾病可用药治疗 | 0.7 - 0.95 |
| `NEEDS_EXAMINATION` | 疾病需要检查 | 0.7 - 0.95 |
| `BELONGS_TO_DEPARTMENT` | 疾病所属科室 | 0.85 - 1.0 |
| `LOCATED_AT` | 症状位于身体部位 | 0.85 - 0.95 |
| `HAS_SIDE_EFFECT` | 药物有副作用 | 0.2 - 0.7 |

### 覆盖疾病（30 种）

肺结节、肺癌、肺炎、慢阻肺（COPD）、哮喘、肺结核、肺栓塞、肺气肿、支气管扩张、肺纤维化、胸腔积液、气胸、肺脓肿、肺动脉高压、小细胞肺癌、非小细胞肺癌、肺腺癌、肺鳞癌、ARDS、睡眠呼吸暂停、肺曲霉病、肺隐球菌病、肺包虫病、肺吸虫病、肺错构瘤、肺炎球菌肺炎、支原体肺炎、病毒性肺炎、吸入性肺炎、间质性肺病

相关文件：[knowledge_graph/](server/src/knowledge_graph/)

---

## 深度学习分割

### 模型信息

| 属性 | 值 |
|------|-----|
| 架构 | U-Net（ResNet34 编码器） |
| 输入 | `[batch, 1, 512, 512]` |
| 输出 | `[batch, 1, 512, 512]` |
| 大小 | ~29 MB |
| Opset | 14 |
| 运行时 | ONNX Runtime Web（浏览器端推理） |

### 性能

| 后端 | 推理时间 / slice | 硬件要求 |
|------|-----------------|---------|
| WebGPU | ~50ms | GPU（Chrome 113+） |
| WASM | ~200ms | CPU（多线程） |
| 阈值分割（后备） | ~5ms | CPU |

### 支持的医学影像格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| DICOM | `.dcm` | 医学影像标准格式（含元数据） |
| MetaImage | `.mhd` / `.mha` | 头文件 + 数据文件 |
| Raw Data | `.raw` / `.zraw` | 原始二进制数据 |

### 模型部署

```bash
# 使用 conda 创建 Python 环境
conda create -n onnx_env python=3.9 -y
conda activate onnx_env
pip install torch onnx

# 生成 ONNX 模型
python web/scripts/create_model.py
```

模型文件输出到 `web/public/models/lung_segmentation.onnx`。

---

## 项目结构

```
Medical-Diagnosis-Automatic-Recognition-System/
├── web/                          # 前端 Vue 3 项目
│   ├── public/models/            # ONNX 模型文件
│   ├── src/
│   │   ├── components/
│   │   │   ├── base/             # UI 基础组件（7个）
│   │   │   ├── business/         # 业务组件
│   │   │   │   └── LungViewer/   # 肺部 CT 可视化模块
│   │   │   ├── icons/            # SVG 图标（34个）
│   │   │   └── navigation/       # 导航组件
│   │   ├── composables/          # 组合式函数
│   │   ├── layouts/              # 布局组件
│   │   ├── router/               # 路由（5个页面）
│   │   ├── services/             # API 客户端
│   │   ├── stores/               # Pinia 状态管理
│   │   ├── styles/               # 设计令牌 + 全局样式
│   │   ├── utils/                # 工具函数
│   │   └── views/                # 页面视图（5个）
│   ├── Dockerfile                # 多阶段 Docker 构建
│   └── nginx.conf                # Nginx 配置
│
├── server/                       # 后端 Node.js 项目
│   ├── prisma/
│   │   ├── schema.prisma         # 数据库模型（11个）
│   │   ├── migrations/           # 迁移文件
│   │   ├── seed.ts               # 种子数据
│   │   └── *.sql                 # 向量索引等 SQL
│   ├── src/
│   │   ├── config/               # 配置加载（Zod 验证）
│   │   ├── knowledge_graph/      # 知识图谱模块
│   │   ├── middleware/            # 中间件（JWT 认证 + 错误处理）
│   │   ├── repositories/         # 数据访问层
│   │   ├── routes/               # 路由（15 个路由文件）
│   │   ├── services/             # 业务逻辑（17 个服务）
│   │   │   └── dialog/           # 对话状态机
│   │   ├── tests/                # 评估框架
│   │   ├── types/                # Zod 验证 Schema
│   │   ├── utils/                # 日志工具
│   │   └── app.ts                # 应用入口
│   ├── Dockerfile                # 多阶段 Docker 构建
│   └── vitest.config.ts          # 测试配置
│
├── scripts/
│   └── start-dev.ps1             # Windows 开发环境启动脚本
├── docker-compose.yml            # Docker Compose 生产配置
├── docker-compose.example.yml    # Docker Compose 示例
├── init-db.sql                   # 数据库初始化 SQL
├── .env.example                  # 环境变量模板
└── package.json                  # Monorepo 根配置
```

---

## 获取 API Key

### 阿里云百炼

1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 注册 / 登录阿里云账号
3. 开通模型服务（搜索「模型服务灵积」或「百炼大模型」）
4. 在 API Key 管理页面创建密钥
5. 将密钥填入 `server/.env` 的 `QWEN_API_KEY` 字段

### 免费额度

阿里云百炼为新用户提供免费额度，足以支持开发和测试。具体额度请查阅阿里云官方文档。

---

## 常见问题

### Q: 数据库连接失败？

确认 PostgreSQL 已安装并运行：

```powershell
# Windows - 检查服务状态
Get-Service postgresql-x64-18

# 如未运行则启动
Start-Service postgresql-x64-18
```

确认 pgvector 扩展已安装：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

确认数据库已创建：

```sql
CREATE DATABASE zhiliao;
```

### Q: Redis 连接失败？

确认 Docker Desktop 已启动：

```bash
# 检查 Docker 是否可用
docker ps

# 启动 Redis 容器
docker compose up -d redis --wait

# 验证 Redis 运行中
docker ps --filter "name=zhiliao-redis"
```

如果 Redis 不可用，系统会降级运行（缓存功能失效），不会完全崩溃。

### Q: AI 回复显示演示模式？

这是因为没有配置 `QWEN_API_KEY`：

1. 获取阿里云百炼 API Key
2. 在 `server/.env` 中设置 `QWEN_API_KEY`
3. 重启后端服务

### Q: 前端无法连接后端？

- 确认后端已启动（`npm run dev:server`）
- 检查 CORS 配置 `CORS_ORIGIN` 是否为 `http://localhost:5173`
- Vite 开发代理将 `/api` 请求转发到 `localhost:3001`，配置见 `web/vite.config.ts`
- 查看浏览器控制台（F12）的网络请求错误信息

### Q: 图片识别失败？

- 确保已配置 `QWEN_API_KEY`
- 支持的图片格式：JPG、PNG、GIF、WEBP
- 图片大小不超过 10MB
- 后端启动时会加载视觉模型，等待几秒后再试

### Q: 深度学习分割不工作？

- 确保模型文件存在：`web/public/models/lung_segmentation.onnx`
- 运行 `python web/scripts/create_model.py` 创建模型
- 检查浏览器是否支持 WebGPU（Chrome 113+）或 WASM
- 不支持时系统会自动降级为阈值分割

### Q: Docker 部署失败？

```bash
# 查看所有容器状态
docker compose ps

# 查看日志
docker compose logs -f

# 检查端口占用
netstat -ano | findstr ":80 :3000 :5432 :6379"
```

### Q: 数据库迁移失败？

```bash
# 重新生成 Prisma 客户端
npm run db:generate

# 如果 schema 变更较大，使用 push 替代 migrate
npm run db:push
```

---

## 风险与合规

- **医疗准确性**：所有 AI 回答必须包含免责声明，并标注信息来源，不可替代专业医疗诊断
- **数据隐私**：用户图片不上传第三方服务器，传输加密，使用阿里云合规服务
- **成本控制**：模型分层（Flash 低成本 / Max 高质量），高频查询 Redis 缓存

---

## 许可证

MIT License

---

## 致谢

- [Vue.js](https://vuejs.org/) — 前端框架
- [Fastify](https://fastify.dev/) — Node.js Web 框架
- [Prisma](https://www.prisma.io/) — 数据库 ORM
- [阿里云百炼](https://bailian.console.aliyun.com/) — AI 模型服务
- [pgvector](https://github.com/pgvector/pgvector) — PostgreSQL 向量扩展
- [VTK.js](https://kitware.github.io/vtk-js/) — 3D 医学影像可视化
- [ONNX Runtime Web](https://onnxruntime.ai/) — 浏览器端深度学习推理
