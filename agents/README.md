# 医疗 AI 项目 Agent 集合

本项目集成了 [agency-agents](https://github.com/msitarzewski/agency-agents) 的专业 Agent 体系，为医疗 AI 项目提供开发支持和医疗专业服务。

## 📁 目录结构

```
agents/
├── engineering/           # 工程开发类 Agent
│   ├── engineering-frontend-developer.md      # Vue 3 前端开发
│   ├── engineering-backend-architect.md       # Node.js 后端架构
│   ├── engineering-ai-engineer.md             # RAG/AI 系统开发
│   ├── engineering-database-optimizer.md      # PostgreSQL 优化
│   ├── engineering-security-engineer.md       # 医疗数据安全
│   ├── engineering-code-reviewer.md           # 代码审查
│   ├── engineering-devops-automator.md        # CI/CD 部署
│   └── engineering-technical-writer.md        # 技术文档
│
├── medical/               # 医疗专业类 Agent
│   ├── medical-lung-cancer-specialist.md      # 肺癌筛查专家
│   ├── medical-hypertension-specialist.md     # 高血压管理专家
│   └── medical-tcm-specialist.md              # 中医专家
│
└── README.md              # 本文件
```

## 🚀 快速使用

### 方式 1: 在 AI 对话中激活

```
请激活【肺癌筛查专家】角色，帮我评估一个8mm肺结节
```

```
请激活【前端开发专家】角色，帮我优化 Vue 3 组件性能
```

### 方式 2: 在代码中使用

```typescript
import fs from 'fs'
import path from 'path'

function loadAgent(agentName: string): string {
  const agentPath = path.join(__dirname, 'agents', `${agentName}.md`)
  return fs.readFileSync(agentPath, 'utf-8')
}

// 加载肺癌专家 Agent
const lungCancerAgent = loadAgent('medical/medical-lung-cancer-specialist')
```

### 方式 3: 集成到 LLM 服务

```typescript
// 在 RAG 服务中使用
const systemPrompt = `
${lungCancerAgent}

用户问题: ${userQuestion}

请基于你的专业角色回答用户问题。
`
```

## 🎯 Agent 使用场景

### 开发阶段

| Agent | 使用场景 | 示例任务 |
|-------|---------|---------|
| 🎨 Frontend Developer | Vue 3 组件开发 | 优化 MessageBubble 性能 |
| 🏗️ Backend Architect | API 设计 | 设计 RAG 检索接口 |
| 🤖 AI Engineer | RAG 系统优化 | 改进向量检索精度 |
| 🗄️ Database Optimizer | PostgreSQL 优化 | 优化向量索引查询 |
| 🔒 Security Engineer | 医疗数据安全 | HIPAA 合规审计 |
| 👁️ Code Reviewer | PR 代码审查 | 审查新功能代码 |
| 🚀 DevOps Automator | CI/CD 部署 | 配置自动化部署 |
| 📚 Technical Writer | 技术文档 | 编写 API 文档 |

### 运行阶段（用户对话）

| Agent | 使用场景 | 触发关键词 |
|-------|---------|-----------|
| 🫁 肺癌筛查专家 | 肺结节评估、LDCT 筛查 | 肺结节、肺癌、CT、肺 |
| ❤️ 高血压管理专家 | 血压管理、用药建议 | 高血压、血压、降压药 |
| 🌿 中医专家 | 中医辨证、养生保健 | 中医、中药、针灸、体质 |

## 📋 Agent 详解

### 🫁 肺癌筛查专家

**专长**: Fleischner 2025 指南、肺结节评估、肺癌分期

**核心能力**:
- 肺结节风险分层
- Fleischner 指南应用
- 随访方案制定
- 多学科协作建议

**示例对话**:
```
用户: 我体检发现一个6mm肺结节，怎么办？
Agent: 您好！发现肺结节确实会让人担心，但请放心，大多数小结节是良性的...
```

### ❤️ 高血压管理专家

**专长**: 中国高血压防治指南2024、个体化用药、生活方式干预

**核心能力**:
- 血压评估与分层
- 个体化治疗方案
- 生活方式干预
- 并发症预防

**示例对话**:
```
用户: 我血压145/95，需要吃药吗？
Agent: 您好！根据您提供的血压值145/95 mmHg，属于1级高血压范围...
```

### 🌿 中医专家

**专长**: 辨证论治、中药方剂、针灸推拿、养生保健

**核心能力**:
- 四诊合参信息收集
- 八纲/脏腑辨证
- 中药方剂建议
- 穴位按摩指导

**示例对话**:
```
用户: 最近总是失眠，有什么中医方法吗？
Agent: 您好！失眠在中医称为"不寐"，需要辨证论治...
```

## 🔄 Agent 路由逻辑

```typescript
// 智能路由：根据用户问题选择合适的 Agent
function routeToAgent(userMessage: string): string {
  const keywords = {
    '肺结节|肺癌|CT|肺': 'medical-lung-cancer-specialist',
    '高血压|血压|降压': 'medical-hypertension-specialist',
    '中医|中药|针灸|体质': 'medical-tcm-specialist',
  }
  
  for (const [pattern, agent] of Object.entries(keywords)) {
    if (new RegExp(pattern).test(userMessage)) {
      return agent
    }
  }
  
  return 'default-medical-agent'
}
```

## 📚 扩展阅读

- [agency-agents 原项目](https://github.com/msitarzewski/agency-agents)
- [Fleischner 2025 指南](https://pubs.rsna.org/)
- [中国高血压防治指南2024](http://www.nhc.gov.cn/)

## 📄 许可证

本项目的 Agent 定义基于 [agency-agents](https://github.com/msitarzewski/agency-agents) 项目，遵循其开源许可证。
