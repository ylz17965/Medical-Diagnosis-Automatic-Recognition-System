# 智疗助手 - AI医疗自助服务平台

一个基于阿里云百炼平台的 AI 医疗自助服务网页，提供健康咨询、体检报告解读、用药指导等服务。

## 功能特性

| 功能模块 | 说明 | 图片识别 |
|---------|------|---------|
| 深度搜索 | 搜索权威医学资料并整合答案 | 否 |
| 健康问答 | 回答常见健康问题 | 否 |
| 报告解读 | 上传体检报告图片，解析异常指标 | 是 |
| 药盒识别 | 上传药盒图片，识别药品信息 | 是 |

## 技术栈

### 前端
| 技术 | 说明 |
|------|------|
| Vue 3 | 渐进式 JavaScript 框架 (Composition API) |
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

### AI 模型 (阿里云百炼)
| 模型 | 分工 | 对应功能 |
|------|------|---------|
| text-embedding-v3 | 文本向量化 | 构建 RAG 知识库 |
| qwen3-rerank | 检索结果重排序 | 提升答案准确性 |
| qwen-max | 复杂任务生成 | 深度搜索、报告解读、智能健康咨询 |
| qwen3.5-flash | 简单问答生成 | 日常健康问答（低成本） |
| qwen3-vl-plus | 视觉理解 | 药盒识别 |
| qwen-vl-ocr | OCR 文字提取 | 体检报告图片文字提取 |

## 功能流程

### 深度搜索 / 健康问答 / 智能健康咨询
```
用户输入文本问题 → text-embedding-v3 向量化 → 检索知识库 → qwen3-rerank 重排序 → 根据问题复杂度选择 qwen-max 或 qwen3.5-flash 生成答案
```

### 报告解读
```
用户上传体检报告图片 → qwen-vl-ocr 提取文字 → 结构化解析 → 异常指标作为查询 → RAG 流程 → qwen-max 生成解读
```

### 药盒识别
```
用户上传药盒图片 → qwen3-vl-plus 识别药品名称、成分等 → 将药品名作为查询 → RAG 检索药品说明书库 → qwen-max 生成用药指导
```

## 环境要求

- **Node.js** >= 20.0.0
- **PostgreSQL** 14+ (需安装 pgvector 扩展)
- **npm** 或 **yarn**

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System
```

### 2. 安装依赖

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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zhiliao?schema=public"

# JWT 配置
JWT_SECRET="your-64-character-random-string-here"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Cookie 配置
COOKIE_SECRET="your-64-character-random-string-here"

# CORS
CORS_ORIGIN="http://localhost:5173"

# 阿里云百炼 API 配置
QWEN_API_KEY="your-qwen-api-key"
QWEN_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"

# 模型配置
QWEN_MODEL_COMPLEX="qwen-max"
QWEN_MODEL_SIMPLE="qwen3.5-flash"
QWEN_MODEL_EMBEDDING="text-embedding-v3"
QWEN_MODEL_RERANK="qwen3-rerank"
QWEN_MODEL_VISION="qwen3-vl-plus"
QWEN_MODEL_OCR="qwen-vl-ocr"

# 向量嵌入配置
EMBEDDING_DIMENSION=1024

# RAG 配置
RAG_TOP_K=5
RAG_RERANK_TOP_K=20
RAG_CHUNK_SIZE=512
RAG_CHUNK_OVERLAP=128
RAG_SIMILARITY_THRESHOLD=0.7
```

### 4. 初始化数据库

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
│   │   ├── composables/    # 组合式函数
│   │   ├── layouts/        # 布局组件
│   │   ├── router/         # 路由配置
│   │   ├── services/       # API 服务
│   │   ├── stores/         # Pinia 状态
│   │   ├── styles/         # 样式文件
│   │   └── views/          # 页面视图
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
│   │   └── app.ts          # 入口文件
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   ├── .env.example
│   └── package.json
│
├── package.json            # 根配置 (workspaces)
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

## API 接口

### 聊天接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/chat/stream` | POST | 流式聊天（SSE） |
| `/api/v1/chat/complete` | POST | 完整聊天响应 |
| `/api/v1/chat/health` | GET | 检查服务状态 |

### 图片识别接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/image/analyze` | POST | 综合图片分析（支持药盒和报告） |
| `/api/v1/image/recognize-drug` | POST | 药盒识别 |
| `/api/v1/image/extract-report` | POST | 体检报告提取 |

### 知识库接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/knowledge/documents` | GET | 获取文档列表 |
| `/api/v1/knowledge/documents` | POST | 添加文档 |
| `/api/v1/knowledge/documents/:id` | DELETE | 删除文档 |

## 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `JWT_SECRET` | ✅ | JWT 签名密钥 |
| `COOKIE_SECRET` | ✅ | Cookie 签名密钥 |
| `QWEN_API_KEY` | ❌ | 阿里云百炼 API Key（不配置则运行演示模式） |
| `CORS_ORIGIN` | ✅ | 前端地址 |

## 获取 API Key

### 阿里云百炼

1. 访问 [阿里云百炼](https://bailian.console.aliyun.com/)
2. 注册/登录账号
3. 开通模型服务
4. 创建 API Key

## 常见问题

### Q: 数据库连接失败？

确保 PostgreSQL 已启动，且 pgvector 扩展已安装：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Q: AI 回复显示演示模式？

这是因为没有配置 `QWEN_API_KEY`。要启用完整 AI 功能：

1. 获取阿里云百炼 API Key
2. 在 `server/.env` 中设置 `QWEN_API_KEY=your-api-key`
3. 重启后端服务

### Q: 图片识别失败？

- 确保已配置 `QWEN_API_KEY`
- 检查图片格式（支持 JPG、PNG、GIF、WEBP）
- 确保图片大小不超过 10MB

### Q: 前端无法连接后端？

- 确认后端已启动
- 检查 CORS 配置是否正确
- 查看浏览器控制台错误信息

## 风险与合规

- **医疗准确性**：所有回答必须包含免责声明，并标注信息来源
- **数据隐私**：不存储用户图片，传输加密，使用阿里云合规服务
- **成本控制**：利用免费额度，模型分层（Flash/Max），高频问题缓存

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- [Vue.js](https://vuejs.org/)
- [Fastify](https://fastify.dev/)
- [Prisma](https://www.prisma.io/)
- [阿里云百炼](https://bailian.console.aliyun.com/)
- [pgvector](https://github.com/pgvector/pgvector)
