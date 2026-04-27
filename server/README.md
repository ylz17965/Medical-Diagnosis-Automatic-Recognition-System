# 智疗助手 - 后端服务

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
# Windows PowerShell
copy .env.example .env

# Linux/macOS
cp .env.example .env
```

然后编辑 `.env` 文件，**必须修改以下两项**：

- `DATABASE_URL` - 你的 PostgreSQL 数据库连接字符串
- `QWEN_API_KEY` - 阿里云百炼平台 [API Key](https://bailian.console.aliyun.com/)

> **提示**：不配置 API Key 也能运行，会返回演示模式的回复

### 3. 初始化数据库

```bash
npm run db:generate    # 生成 Prisma 客户端
npm run db:push        # 推送数据库结构
npm run db:vector-index  # 创建向量搜索索引（需要 PostgreSQL 安装 pgvector 扩展）
```

### 4. 启动服务

```bash
npm run dev
```

服务将在 `http://localhost:3001` 启动

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（热更新） |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务 |
| `npm run db:generate` | 生成 Prisma 客户端 |
| `npm run db:push` | 推送数据库结构 |
| `npm run db:studio` | 打开数据库管理界面 |
| `npm run db:vector-index` | 创建向量搜索索引 |
