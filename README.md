# 智疗助手 - AI健康咨询平台

一个基于 AI 的智能健康咨询平台，提供健康咨询、体检报告解读、用药指导等服务。

## 功能特性

- 🤖 **AI 健康咨询** - 智能对话，解答健康问题
- 📋 **体检报告解读** - 上传体检报告，获取专业解读
- 💊 **用药指导** - 药物信息查询和用药建议
- 🔍 **智能搜索** - 医疗知识库检索

## 技术栈

### 前端
- Vue 3 + TypeScript
- Vite
- Pinia
- Vue Router

### 后端
- Node.js + Fastify
- Prisma ORM
- PostgreSQL + pgvector

### AI
- 通义千问 (Qwen) API
- RAG (检索增强生成)

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+ (with pgvector)
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System

# 安装依赖
npm install
cd web && npm install
cd ../server && npm install
```

### 配置

在 `server` 目录创建 `.env` 文件：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/zhiliao"
JWT_SECRET="your-jwt-secret"
QWEN_API_KEY="your-qwen-api-key"
```

### 运行

```bash
# 启动后端
cd server
npm run dev

# 启动前端（新终端）
cd web
npm run dev
```

访问 http://localhost:5173

## 部署

### Vercel 部署

1. Fork 本仓库
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署

## 项目结构

```
├── web/                 # 前端项目
│   ├── src/
│   │   ├── components/  # 组件
│   │   ├── views/       # 页面
│   │   ├── stores/      # 状态管理
│   │   └── services/    # API 服务
│   └── ...
├── server/              # 后端项目
│   ├── src/
│   │   ├── routes/      # 路由
│   │   ├── services/    # 业务逻辑
│   │   └── middleware/  # 中间件
│   └── ...
├── api/                 # Vercel Serverless Functions
└── vercel.json          # Vercel 配置
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
