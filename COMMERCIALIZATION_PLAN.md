# 智疗助手 - 商业化开发计划书

> 版本: 1.0  
> 日期: 2026-03-28  
> 状态: 规划阶段

---

## 一、项目概述

### 1.1 产品定位
智疗助手是一款面向个人用户的AI健康咨询平台，提供智能问诊、体检报告解读、用药指导等健康服务。

### 1.2 当前状态评估

| 维度 | 当前状态 | 商业标准 | 差距评估 |
|------|---------|---------|---------|
| 前端UI | 80% | 90% | 🟢 接近完成 |
| 安全性 | 20% | 90% | 🔴 严重不足 |
| 后端服务 | 0% | 100% | 🔴 完全缺失 |
| 数据库 | 0% | 100% | 🔴 完全缺失 |
| API接口 | 0% | 100% | 🔴 完全缺失 |
| 测试覆盖 | 0% | 70% | 🔴 完全缺失 |
| 部署运维 | 0% | 80% | 🔴 完全缺失 |

### 1.3 商业化目标
- **短期目标 (3个月)**: 完成MVP版本，支持真实用户注册和AI对话
- **中期目标 (6个月)**: 完善核心功能，支持付费订阅
- **长期目标 (12个月)**: 成为可盈利的商业产品

---

## 二、技术架构规划

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层 (Client)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Web App   │  │  iOS App    │  │ Android App │              │
│  │   (Vue 3)   │  │  (未来)      │  │   (未来)     │              │
│  └──────┬──────┘  └─────────────┘  └─────────────┘              │
└─────────┼───────────────────────────────────────────────────────┘
          │ HTTPS
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 网关层 (Gateway)                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Nginx / Kong API Gateway                                   ││
│  │  - SSL 终止  - 请求路由  - 限流  - 日志                       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     服务层 (Services)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Auth Service │ │ Chat Service │ │ User Service │             │
│  │   认证服务    │ │   对话服务    │ │   用户服务    │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ File Service │ │ AI Service   │ │ Payment Svc  │             │
│  │   文件服务    │ │   AI服务     │ │   支付服务    │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     数据层 (Data)                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  PostgreSQL  │ │    Redis     │ │  MinIO/OSS   │             │
│  │   主数据库    │ │   缓存/队列   │ │   文件存储    │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    第三方服务 (External)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  AI Provider │ │  SMS Service │ │ Payment Gate │             │
│  │  OpenAI/文心  │ │  阿里云短信   │ │  支付宝/微信  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **前端** | Vue 3 + TypeScript + Vite | 已实现 |
| **后端框架** | Node.js + Fastify | 高性能，内置校验 |
| **数据库** | PostgreSQL 15 | 关系型，ACID保证 |
| **缓存** | Redis 7 | 会话、限流、缓存 |
| **文件存储** | MinIO / 阿里云OSS | 体检报告、头像存储 |
| **AI服务** | OpenAI API / 百度文心 | 健康对话、报告解读 |
| **短信服务** | 阿里云短信 | 验证码发送 |
| **支付** | 支付宝/微信支付 | 订阅付费 |
| **容器化** | Docker + Docker Compose | 开发环境 |
| **编排** | Kubernetes (生产) | 弹性伸缩 |
| **监控** | Prometheus + Grafana | 性能监控 |
| **日志** | ELK Stack / Loki | 日志聚合 |

---

## 三、数据库架构设计

### 3.1 ER图概览

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │conversations│       │  messages   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ user_id(FK) │       │ id (PK)     │
│ email       │       │ id (PK)     │◄──────│ conv_id(FK) │
│ phone       │       │ title       │       │ role        │
│ password    │       │ type        │       │ content     │
│ nickname    │       │ created_at  │       │ sources     │
│ avatar      │       │ updated_at  │       │ created_at  │
│ ...         │       └─────────────┘       └─────────────┘
└─────────────┘
      │
      │1:N
      ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│health_records│      │ subscriptions│      │  payments   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ user_id(FK) │       │ user_id(FK) │       │ user_id(FK) │
│ type        │       │ plan        │       │ sub_id(FK)  │
│ file_url    │       │ status      │       │ amount      │
│ parsed_data │       │ start_date  │       │ status      │
│ created_at  │       │ end_date    │       │ created_at  │
└─────────────┘       └─────────────┘       └─────────────┘
```

### 3.2 核心表结构

#### 用户表 (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
```

#### 会话表 (conversations)

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  type VARCHAR(20) NOT NULL CHECK (type IN ('chat', 'search', 'report', 'drug')),
  model VARCHAR(50) DEFAULT 'gpt-4',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);
```

#### 消息表 (messages)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_role ON messages(role);
```

#### 订阅表 (subscriptions)

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

#### 健康档案表 (health_records)

```sql
CREATE TABLE health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('report', 'prescription', 'exam')),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  parsed_data JSONB,
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_records_user ON health_records(user_id);
CREATE INDEX idx_health_records_type ON health_records(type);
```

#### 验证码表 (verification_codes)

```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('phone', 'email')),
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register', 'login', 'reset_password')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_codes_target ON verification_codes(target);
CREATE INDEX idx_verification_codes_expires ON verification_codes(expires_at);
```

---

## 四、后端API架构

### 4.1 项目结构

```
server/
├── src/
│   ├── controllers/          # 控制器层
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── chat.controller.ts
│   │   ├── upload.controller.ts
│   │   └── subscription.controller.ts
│   ├── services/             # 服务层
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── chat.service.ts
│   │   ├── ai.service.ts
│   │   ├── sms.service.ts
│   │   └── payment.service.ts
│   ├── repositories/         # 数据访问层
│   │   ├── user.repository.ts
│   │   ├── conversation.repository.ts
│   │   └── message.repository.ts
│   ├── middleware/           # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── routes/               # 路由定义
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── chat.routes.ts
│   │   └── index.ts
│   ├── models/               # 数据模型
│   ├── types/                # TypeScript类型
│   ├── utils/                # 工具函数
│   ├── config/               # 配置
│   └── app.ts                # 应用入口
├── prisma/
│   └── schema.prisma         # 数据库Schema
├── tests/                    # 测试
├── docker-compose.yml
├── Dockerfile
└── package.json
```

### 4.2 API设计规范

#### 认证相关 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/v1/auth/register` | 用户注册 | ❌ |
| POST | `/api/v1/auth/login` | 用户登录 | ❌ |
| POST | `/api/v1/auth/logout` | 用户登出 | ✅ |
| POST | `/api/v1/auth/refresh` | 刷新Token | ✅ |
| POST | `/api/v1/auth/send-code` | 发送验证码 | ❌ |
| POST | `/api/v1/auth/reset-password` | 重置密码 | ❌ |

#### 用户相关 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/users/me` | 获取当前用户 | ✅ |
| PUT | `/api/v1/users/me` | 更新用户信息 | ✅ |
| PUT | `/api/v1/users/me/password` | 修改密码 | ✅ |
| POST | `/api/v1/users/me/avatar` | 上传头像 | ✅ |
| DELETE | `/api/v1/users/me` | 注销账号 | ✅ |

#### 对话相关 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/conversations` | 获取会话列表 | ✅ |
| POST | `/api/v1/conversations` | 创建会话 | ✅ |
| GET | `/api/v1/conversations/:id` | 获取会话详情 | ✅ |
| DELETE | `/api/v1/conversations/:id` | 删除会话 | ✅ |
| POST | `/api/v1/conversations/:id/messages` | 发送消息 | ✅ |
| GET | `/api/v1/conversations/:id/messages` | 获取消息列表 | ✅ |
| POST | `/api/v1/chat/stream` | 流式对话(SSE) | ✅ |

#### 文件相关 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/v1/upload` | 上传文件 | ✅ |
| GET | `/api/v1/upload/:id` | 获取文件 | ✅ |

### 4.3 API响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

---

## 五、安全改造方案

### 5.1 认证安全

#### 当前问题
```typescript
localStorage.setItem('token', userToken)  // ❌ 不安全
```

#### 改造方案

```typescript
// 使用 httpOnly Cookie + 双Token机制
// 后端设置Cookie
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
});

// 返回短期accessToken
return {
  accessToken,  // 15分钟过期
  user: userWithoutPassword
};
```

#### Token策略

| Token类型 | 存储位置 | 有效期 | 用途 |
|----------|---------|--------|------|
| Access Token | 内存 (Pinia Store) | 15分钟 | API认证 |
| Refresh Token | httpOnly Cookie | 7天 | 刷新Access Token |

### 5.2 密码安全

```typescript
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

// 密码哈希
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

// 密码验证
const verifyPassword = async (
  password: string, 
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

### 5.3 限流策略

```typescript
// 不同接口的限流配置
const rateLimitConfig = {
  // 认证接口 - 严格限制
  auth: {
    windowMs: 15 * 60 * 1000,  // 15分钟
    max: 5,                     // 最多5次
    skipSuccessfulRequests: true
  },
  // 普通API - 适中限制
  api: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  // AI对话 - 按订阅等级限制
  chat: {
    free: { windowMs: 60 * 60 * 1000, max: 10 },
    basic: { windowMs: 60 * 60 * 1000, max: 50 },
    pro: { windowMs: 60 * 60 * 1000, max: 200 }
  }
};
```

### 5.4 输入验证

```typescript
import { z } from 'zod';

// 用户注册验证
const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '无效的手机号'),
  password: z.string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/[0-9]/, '密码需包含数字'),
  code: z.string().length(6, '验证码为6位数字'),
  nickname: z.string().min(2).max(20).optional()
});

// 对话消息验证
const messageSchema = z.object({
  content: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  type: z.enum(['chat', 'search', 'report', 'drug']).optional()
});
```

### 5.5 安全检查清单

- [ ] 所有密码使用 bcrypt 哈希存储
- [ ] Token 使用 httpOnly Cookie 存储
- [ ] 实现 CSRF 保护
- [ ] 所有 API 实现限流
- [ ] 所有输入使用 Zod 验证
- [ ] SQL 注入防护 (使用参数化查询)
- [ ] XSS 防护 (内容转义)
- [ ] 文件上传类型和大小限制
- [ ] 敏感操作二次验证
- [ ] 操作日志记录

---

## 六、开发阶段规划

### 阶段一：基础设施 (第1-2周)

**目标**: 搭建后端基础框架

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| 初始化Node.js项目 | 0.5天 | P0 |
| 配置TypeScript + ESLint | 0.5天 | P0 |
| 设计数据库Schema | 1天 | P0 |
| 配置Prisma ORM | 0.5天 | P0 |
| Docker开发环境 | 1天 | P0 |
| 基础中间件 (日志/错误处理) | 1天 | P0 |
| 数据库迁移脚本 | 0.5天 | P0 |

**交付物**:
- 可运行的后端项目骨架
- 完整的数据库Schema
- Docker开发环境

### 阶段二：认证系统 (第3-4周)

**目标**: 完成用户认证全流程

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| 用户注册 (手机号+验证码) | 1天 | P0 |
| 用户登录 (双Token机制) | 1天 | P0 |
| 验证码发送 (阿里云短信) | 1天 | P0 |
| Token刷新机制 | 0.5天 | P0 |
| 密码重置 | 0.5天 | P0 |
| 用户信息管理 | 1天 | P0 |
| 前端认证改造 | 2天 | P0 |

**交付物**:
- 完整的认证API
- 安全的Token机制
- 前端认证流程改造

### 阶段三：核心功能 (第5-8周)

**目标**: 实现AI对话核心功能

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| 会话管理API | 2天 | P0 |
| 消息存储API | 1天 | P0 |
| AI服务集成 (OpenAI/文心) | 3天 | P0 |
| 流式对话 (SSE) | 2天 | P0 |
| 文件上传服务 | 2天 | P1 |
| 体检报告解析 | 3天 | P1 |
| 用药识别功能 | 2天 | P1 |
| 前端对接改造 | 3天 | P0 |

**交付物**:
- 可用的AI对话功能
- 文件上传和解析
- 前端完整对接

### 阶段四：商业化功能 (第9-12周)

**目标**: 支持付费订阅

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| 订阅计划设计 | 1天 | P1 |
| 支付集成 (支付宝/微信) | 3天 | P1 |
| 订阅管理API | 2天 | P1 |
| 使用量统计 | 2天 | P1 |
| 用户权益控制 | 2天 | P1 |
| 前端订阅页面 | 3天 | P1 |

**交付物**:
- 完整的订阅系统
- 支付功能
- 权益控制

### 阶段五：测试与优化 (第13-14周)

**目标**: 确保系统稳定性

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| 单元测试 | 3天 | P0 |
| 集成测试 | 2天 | P0 |
| E2E测试 | 2天 | P1 |
| 性能优化 | 2天 | P1 |
| 安全审计 | 2天 | P0 |

**交付物**:
- 测试覆盖率 > 70%
- 性能报告
- 安全审计报告

### 阶段六：部署上线 (第15-16周)

**目标**: 生产环境部署

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| CI/CD配置 | 2天 | P0 |
| 生产环境搭建 | 2天 | P0 |
| 监控告警配置 | 2天 | P0 |
| 数据备份策略 | 1天 | P0 |
| 灰度发布 | 2天 | P0 |
| 正式上线 | 1天 | P0 |

**交付物**:
- 生产环境
- 监控系统
- 运维文档

---

## 七、资源需求

### 7.1 人力资源

| 角色 | 人数 | 技能要求 | 工作内容 |
|------|------|---------|---------|
| 全栈开发 | 2 | Vue3, Node.js, PostgreSQL | 前后端开发 |
| 后端开发 | 1 | Node.js, 数据库, AI集成 | 核心服务开发 |
| 测试工程师 | 1 | 自动化测试, 性能测试 | 测试保障 |
| 运维工程师 | 0.5 | Docker, K8s, 监控 | 部署运维 |

### 7.2 基础设施成本 (月)

| 资源 | 配置 | 月费用估算 |
|------|------|-----------|
| 云服务器 | 4核8G × 2 | ¥600 |
| 数据库 | PostgreSQL 2核4G | ¥300 |
| Redis | 1G | ¥100 |
| 对象存储 | 100G | ¥50 |
| CDN流量 | 100G | ¥50 |
| AI API调用 | GPT-4 | ¥2000+ |
| 短信服务 | 1万条 | ¥50 |
| **合计** | | **~¥3150/月** |

### 7.3 第三方服务

| 服务 | 用途 | 费用模式 |
|------|------|---------|
| 阿里云短信 | 验证码发送 | 按量计费 |
| OpenAI API | AI对话 | 按Token计费 |
| 百度文心 | AI对话备选 | 按Token计费 |
| 支付宝/微信支付 | 收款 | 按笔费率 |

---

## 八、风险评估

| 风险 | 等级 | 影响 | 应对措施 |
|------|------|------|---------|
| AI API成本过高 | 高 | 影响盈利能力 | 实现多模型切换，优化Prompt |
| 数据安全事件 | 高 | 法律风险、用户流失 | 加密存储、安全审计、保险 |
| 服务可用性 | 中 | 用户体验 | 多可用区部署、自动扩缩容 |
| 合规风险 | 中 | 运营风险 | 医疗声明、隐私政策、资质申请 |
| 竞品压力 | 中 | 市场份额 | 差异化功能、用户体验优化 |

---

## 九、里程碑

| 里程碑 | 时间 | 交付标准 |
|--------|------|---------|
| **M1: 基础框架** | 第2周末 | 后端可运行，数据库就绪 |
| **M2: 认证完成** | 第4周末 | 用户可注册登录 |
| **M3: 核心功能** | 第8周末 | AI对话可用 |
| **M4: 商业化** | 第12周末 | 支付功能上线 |
| **M5: 测试完成** | 第14周末 | 测试覆盖达标 |
| **M6: 正式上线** | 第16周末 | 生产环境运行 |

---

## 十、下一步行动

1. **立即开始**: 初始化后端项目
2. **本周完成**: 数据库Schema设计和Docker环境
3. **下周目标**: 认证系统开发

---

> 本计划书将作为项目开发的指导文档，每两周进行一次回顾和调整。
