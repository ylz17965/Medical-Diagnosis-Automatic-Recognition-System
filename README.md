# 智疗助手 - AI健康咨询平台

一个基于 AI 的智能健康咨询平台，提供健康咨询、体检报告解读、用药指导等服务。

## 功能特性

- 🤖 **AI 健康咨询** - 智能对话，解答健康问题
- 📋 **体检报告解读** - 上传体检报告，获取专业解读
- 💊 **用药指导** - 药物信息查询和用药建议
- 🔍 **智能搜索** - 医疗知识库检索
- 🔐 **用户认证** - 安全的登录注册系统
- 📱 **响应式设计** - 支持多种设备

## 技术栈

### 前端
| 技术 | 说明 |
|------|------|
| Vue 3 | 渐进式 JavaScript 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Pinia | 状态管理 |
| Vue Router | 路由管理 |
| VueUse | 组合式函数库 |

### 后端
| 技术 | 说明 |
|------|------|
| Fastify | 高性能 Node.js 框架 |
| TypeScript | 类型安全 |
| Prisma | ORM 数据库工具 |
| PostgreSQL | 关系型数据库 |
| pgvector | 向量存储扩展 |
| Redis | 缓存（可选） |
| LangChain | LLM 应用框架 |

### AI / LLM
| 技术 | 说明 |
|------|------|
| 通义千问 (Qwen) | LLM 提供商 |
| @xenova/transformers | 向量嵌入 |
| RAG | 检索增强生成 |

## 环境要求

- **Node.js** >= 20.0.0
- **PostgreSQL** 14+ (需安装 pgvector 扩展)
- **Redis** (可选，用于缓存)
- **npm** 或 **yarn**

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System
```

### 2. 安装依赖

项目使用 npm workspaces，只需一条命令：

```bash
npm install
```

### 3. 配置环境变量

复制环境变量示例文件：

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，填入你的配置：

```env
# 服务配置
NODE_ENV=development
PORT=3001

# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/zhiliao"

# JWT 配置
JWT_SECRET="your-64-character-random-string-here"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Cookie 配置
COOKIE_SECRET="your-64-character-random-string-here"

# CORS
CORS_ORIGIN="http://localhost:5173"

# LLM 配置
LLM_PROVIDER="qwen"
QWEN_API_KEY="your-qwen-api-key"

# 向量嵌入配置
EMBEDDING_PROVIDER="qwen"
EMBEDDING_DIMENSION=768

# RAG 配置
RAG_TOP_K=5
RAG_CHUNK_SIZE=500
RAG_CHUNK_OVERLAP=50
```

### 4. 初始化数据库

**方式一：使用 Docker（推荐）**

```bash
# 启动 PostgreSQL 和 Redis
docker-compose up -d postgres redis

# 等待数据库启动后，运行迁移
npm run db:migrate
```

**方式二：使用现有数据库**

确保 PostgreSQL 已安装 pgvector 扩展：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

创建数据库：

```sql
CREATE DATABASE zhiliao;
```

运行数据库迁移：

```bash
npm run db:migrate
```

或使用 Prisma Studio 可视化管理：

```bash
npm run db:studio
```

### 5. 启动项目

```bash
# 同时启动前端和后端
npm run dev
```

或分别启动：

```bash
# 终端 1 - 启动后端
npm run dev:server

# 终端 2 - 启动前端
npm run dev:web
```

### 6. 访问应用

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3001
- **API 文档**: http://localhost:3001/docs

## 演示模式

⚠️ **重要说明**：此项目默认运行在演示模式下。

如果没有配置 `QWEN_API_KEY`，AI 聊天功能将返回演示提示，不会调用真实的 LLM API。这样可以：

- ✅ 安全地分享代码到 GitHub
- ✅ 让其他人克隆项目并运行
- ✅ 保护你的 API Key 不被泄露

要启用完整的 AI 功能，请配置 `QWEN_API_KEY`。

## 项目结构

```
├── web/                    # 前端项目
│   ├── src/
│   │   ├── components/     # 组件
│   │   │   ├── base/       # 基础组件
│   │   │   ├── business/   # 业务组件
│   │   │   ├── icons/      # 图标组件
│   │   │   └── navigation/ # 导航组件
│   │   ├── composables/    # 组合式函数
│   │   ├── layouts/        # 布局组件
│   │   ├── router/         # 路由配置
│   │   ├── services/       # API 服务
│   │   ├── stores/         # Pinia 状态
│   │   ├── styles/         # 样式文件
│   │   └── views/          # 页面视图
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                 # 后端项目
│   ├── src/
│   │   ├── config/         # 配置
│   │   ├── middleware/     # 中间件
│   │   ├── repositories/   # 数据访问层
│   │   ├── routes/         # 路由
│   │   ├── services/       # 业务逻辑
│   │   ├── types/          # 类型定义
│   │   └── app.ts          # 入口文件
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   ├── .env.example
│   └── package.json
│
├── package.json            # 根配置 (workspaces)
├── netlify.toml            # Netlify 部署配置
├── docker-compose.yml      # Docker 配置
└── README.md
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前端和后端 |
| `npm run dev:web` | 仅启动前端 |
| `npm run dev:server` | 仅启动后端 |
| `npm run build` | 构建前后端 |
| `npm run build:web` | 仅构建前端 |
| `npm run lint` | 代码检查 |
| `npm run typecheck` | 类型检查 |
| `npm run db:migrate` | 数据库迁移 |
| `npm run db:studio` | 打开 Prisma Studio |

## 部署

### 前端部署 (Netlify)

1. Fork 本仓库
2. 在 Netlify 导入项目
3. 配置构建命令和发布目录：
   - **Build command**: `npm install && npm run build:web`
   - **Publish directory**: `web/dist`
4. 部署

### 后端部署

后端需要部署到支持 Node.js 的平台：

| 平台 | 说明 |
|------|------|
| Render | 免费 PostgreSQL |
| Railway | 支持 Redis |
| Fly.io | Docker 部署 |
| 自建服务器 | 完全控制 |

### 使用 Docker

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `JWT_SECRET` | ✅ | JWT 签名密钥 |
| `COOKIE_SECRET` | ✅ | Cookie 签名密钥 |
| `QWEN_API_KEY` | ❌ | 通义千问 API Key（不配置则运行演示模式） |
| `CORS_ORIGIN` | ✅ | 前端地址 |
| `REDIS_URL` | ❌ | Redis 连接字符串 |
| `LLM_PROVIDER` | ❌ | LLM 提供商 (默认 qwen) |

## 获取 API Key

### 通义千问 (Qwen)

1. 访问 [阿里云百炼](https://bailian.console.aliyun.com/)
2. 注册/登录账号
3. 创建应用获取 API Key

## 常见问题

### Q: 数据库连接失败？

确保 PostgreSQL 已启动，且 pgvector 扩展已安装：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Q: AI 回复显示演示模式？

这是因为没有配置 `QWEN_API_KEY`。要启用完整 AI 功能：

1. 获取通义千问 API Key
2. 在 `server/.env` 中设置 `QWEN_API_KEY=your-api-key`
3. 重启后端服务

### Q: 前端无法连接后端？

- 确认后端已启动
- 检查 CORS 配置是否正确
- 查看浏览器控制台错误信息

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- [Vue.js](https://vuejs.org/)
- [Fastify](https://fastify.dev/)
- [Prisma](https://www.prisma.io/)
- [LangChain](https://js.langchain.com/)
- [通义千问](https://tongyi.aliyun.com/)
