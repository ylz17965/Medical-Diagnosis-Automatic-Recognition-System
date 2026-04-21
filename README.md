# 智疗助手 - 基于AI的医疗自助服务平台

一个基于阿里云百炼平台的 AI 医疗自助服务网页，专注于肺部疾病的智能诊断辅助，提供健康咨询、体检报告解读、用药指导、肺部CT 3D可视化、肺癌早筛等服务。

## 功能特性

| 功能模块 | 说明 | 图片识别 |
|---------|------|---------|
| 深度搜索 | 搜索权威医学资料并整合答案，支持文献引用 | 否 |
| 健康问答 | 回答常见健康问题，附带权威来源标注 | 否 |
| 报告解读 | 上传体检报告图片，解析异常指标 | 是 |
| 药盒识别 | 上传药盒图片，识别药品信息 | 是 |
| **肺部CT 3D可视化** | 上传DICOM/MHD文件，进行肺部CT体绘制可视化 | 否 |
| **深度学习分割** | 基于U-Net的肺部分割，支持WebGPU/WASM加速 | 否 |
| **症状分析** | 基于知识图谱的症状-疾病推理 | 否 |
| **肺癌早筛** | Fleischner指南结节管理、TNM分期、精准医疗推荐 | 否 |
| **高血压管理** | 血压记录、用药提醒、健康建议 | 否 |
| **区块链存证** | 诊断建议上链存证，保证数据可信 | 否 |

### 核心亮点

- **深度学习分割**: U-Net肺部分割模型，支持WebGPU加速推理
- **多格式支持**: DICOM、MHD/RAW医学影像格式
- **肺部专科知识图谱**: 30种肺部疾病、30种症状、30种药物、100条关系
- **专业医学知识库**: Fleischner指南、TNM分期、EGFR靶向治疗等10篇专业文档
- **文献引用系统**: 回答附带权威医学文献引用，显示影响因子和引用段落
- **可解释性**: 每个回答都有来源追溯，提升可信度
- **追问机制**: 智能追问收集关键信息，提供个性化建议
- **多轮对话**: 支持上下文记忆的连贯对话体验
- **区块链存证**: 诊断建议上链，保证数据不可篡改

## 技术栈

### 前端
| 技术 | 说明 |
|------|------|
| Vue 3 | 渐进式 JavaScript 框架 (Composition API + `<script setup>`) |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Pinia | 状态管理 |
| Vue Router | 路由管理 |
| VueUse | 组合式函数库 |
| VTK.js | 医学影像3D可视化 |
| ONNX Runtime Web | 深度学习推理引擎 |
| dicom-parser | DICOM文件解析 |

### 后端
| 技术 | 说明 |
|------|------|
| Fastify | 高性能 Node.js 框架 |
| TypeScript | 类型安全 |
| Prisma | ORM 数据库工具 |
| PostgreSQL | 关系型数据库 |
| pgvector | 向量存储扩展 |
| Pino | 日志框架 |

### AI 模型 (阿里云百炼)
| 模型 | 分工 | 对应功能 |
|------|------|---------|
| text-embedding-v3 | 文本向量化 | 构建 RAG 知识库 |
| qwen3-rerank | 检索结果重排序 | 提升答案准确性 |
| qwen-max | 复杂任务生成 | 深度搜索、报告解读、智能健康咨询 |
| qwen3.5-flash | 简单问答生成 | 日常健康问答（低成本） |
| qwen3-vl-plus | 视觉理解 | 药盒识别 |
| qwen-vl-ocr | OCR 文字提取 | 体检报告图片文字提取 |

## 环境要求

- **Node.js** >= 20.0.0
- **PostgreSQL** 14+ (需安装 pgvector 扩展)
- **Docker** & **Docker Compose** (可选，用于容器化部署)
- **npm** 或 **yarn**
- **Python** 3.9+ (可选，用于创建ONNX模型)

## 快速开始

### 方式一：Docker 部署（推荐）

#### 1. 克隆仓库

```bash
git clone https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System
```

#### 2. 配置环境变量

创建 `.env` 文件：

```env
DASHSCOPE_API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-key
```

#### 3. 启动服务

```bash
docker-compose up -d
```

服务启动后：
- **前端**: http://localhost
- **后端 API**: http://localhost:3000
- **数据库**: localhost:5432

#### 4. 停止服务

```bash
docker-compose down
```

### 方式二：一键部署脚本

#### 1. 克隆仓库

```bash
git clone https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System
```

#### 2. 运行部署脚本

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

脚本会自动完成：
- ✅ 检查 Node.js 环境
- ✅ 安装项目依赖
- ✅ 创建环境变量文件
- ✅ 初始化数据库
- ✅ 构建项目

#### 3. 配置 API Key

编辑 `server/.env` 文件，填入你的阿里云百炼 API Key：

```env
QWEN_API_KEY="your-api-key-here"
```

#### 4. 创建ONNX模型（可选）

如需深度学习分割功能：

```bash
# 使用conda环境
conda create -n onnx_env python=3.9 -y
conda activate onnx_env
pip install torch onnx
python web/scripts/create_model.py
```

#### 5. 启动服务

```bash
npm run dev
```

### 方式三：手动部署

#### 1. 克隆仓库

```bash
git clone https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`：

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

#### 4. 初始化数据库

确保 PostgreSQL 已安装 pgvector 扩展：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE zhiliao;
```

运行迁移：

```bash
npm run db:migrate
```

#### 5. 启动项目

```bash
npm run dev
```

#### 6. 访问应用

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3001
- **API 文档**: http://localhost:3001/docs

## 深度学习分割

### 模型信息

| 属性 | 值 |
|------|-----|
| 架构 | U-Net (ResNet34编码器) |
| 输入 | [batch, 1, 512, 512] |
| 输出 | [batch, 1, 512, 512] |
| 大小 | ~29 MB |
| Opset | 14 |

### 性能

| 后端 | 推理时间/slice | 硬件要求 |
|------|----------------|----------|
| WebGPU | ~50ms | GPU (Chrome 113+) |
| WASM | ~200ms | CPU (多线程) |
| 阈值分割 | ~5ms | CPU (后备方案) |

### 支持的影像格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| DICOM | .dcm | 医学影像标准格式 |
| MetaImage | .mhd, .mha | 头文件+数据文件 |
| Raw Data | .raw, .zraw | 原始二进制数据 |

## 知识图谱数据

### 数据统计

| 类型 | 数量 | 说明 |
|------|------|------|
| 疾病实体 | 30 | 肺部相关疾病（肺癌、肺结节、肺炎、COPD等） |
| 症状实体 | 30 | 咳嗽、咯血、呼吸困难、胸痛等 |
| 药物实体 | 30 | 靶向药物、抗生素、支气管扩张剂等 |
| 检查实体 | 12 | 胸部CT、肺功能、肿瘤标志物等 |
| 关系 | 100 | 疾病-症状、疾病-药物、疾病-检查等 |

### 肺部专科知识库

| 文档ID | 标题 | 类型 |
|--------|------|------|
| LK001 | 肺结节Fleischner学会指南（2017版） | 指南 |
| LK002 | 肺癌TNM分期（第8版） | 指南 |
| LK003 | 非小细胞肺癌EGFR突变检测与靶向治疗 | 临床 |
| LK004 | 肺结核诊断与治疗指南 | 指南 |
| LK005 | 慢性阻塞性肺疾病（COPD）诊治指南 | 指南 |
| LK006 | 支气管哮喘诊断与管理指南 | 指南 |
| LK007 | 肺栓塞诊断与治疗指南 | 指南 |
| LK008 | 肺炎诊断与治疗指南 | 指南 |
| LK009 | 肺纤维化与间质性肺病诊疗指南 | 指南 |
| LK010 | 肺癌免疫治疗进展 | 研究 |

## 测试覆盖

项目包含完整的单元测试：

```bash
# 运行测试
npm run test

# 运行测试覆盖率
npm run test:coverage
```

| 测试文件 | 测试数量 | 覆盖内容 |
|----------|----------|----------|
| rag.service.test.ts | 13 | RAG检索增强生成 |
| llm.service.test.ts | 13 | LLM服务 |
| lung-cancer.service.test.ts | 21 | 肺癌早筛推理 |
| blockchain.service.test.ts | 17 | 区块链存证 |
| credibility.service.test.ts | 10 | 可信度服务 |
| knowledge.test.ts | 23 | 知识图谱 |

## 团队协作

详细请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)

### 快速协作流程

```bash
# 1. Fork 仓库后克隆
git clone https://github.com/你的用户名/Medical-Diagnosis-Automatic-Recognition-System.git

# 2. 添加上游仓库
git remote add upstream https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git

# 3. 创建功能分支
git checkout -b feature/你的功能名称

# 4. 提交代码
git add .
git commit -m "feat: 功能描述"

# 5. 推送并创建 PR
git push origin feature/你的功能名称
```

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

### 症状分析
```
用户输入症状 → 知识图谱检索相关疾病 → 计算疾病概率 → 推荐检查项目和就诊科室
```

### 肺部CT分割
```
用户上传DICOM/MHD文件 → 解析影像数据 → ONNX Runtime推理 → 肺部分割 → 3D可视化
```

## 项目结构

```
├── web/                    # 前端项目
│   ├── public/
│   │   └── models/         # ONNX模型文件
│   │       └── lung_segmentation.onnx
│   ├── scripts/            # 脚本
│   │   └── create_model.py # 创建ONNX模型
│   ├── src/
│   │   ├── components/     # 组件
│   │   │   ├── base/       # 基础组件
│   │   │   ├── business/   # 业务组件
│   │   │   │   └── LungViewer/ # 肺部CT可视化模块
│   │   │   │       ├── core/   # 核心算法
│   │   │   │       │   ├── ONNXEngine.ts           # ONNX推理引擎
│   │   │   │       │   ├── DeepLearningSegmentation.ts # 深度学习分割
│   │   │   │       │   ├── SegmentationFactory.ts  # 分割工厂
│   │   │   │       │   └── VTKVolumeRenderer.ts    # VTK渲染器
│   │   │   │       ├── utils/  # 工具函数
│   │   │   │       │   ├── DicomLoader.ts  # DICOM加载器
│   │   │   │       │   ├── MHDLoader.ts    # MHD/RAW加载器
│   │   │   │       │   └── VolumeLoader.ts # 统一加载接口
│   │   │   │       └── config/  # 配置
│   │   │   │           └── performance.ts # 性能配置
│   │   │   ├── icons/      # 图标组件
│   │   │   └── navigation/ # 导航组件
│   │   ├── composables/    # 组合式函数
│   │   ├── layouts/        # 布局组件
│   │   ├── router/         # 路由配置
│   │   ├── services/       # API 服务
│   │   ├── stores/         # Pinia 状态
│   │   ├── styles/         # 样式文件
│   │   ├── utils/          # 工具函数
│   │   │   └── logger.ts   # 日志工具
│   │   └── views/          # 页面视图
│   ├── Dockerfile          # Docker 构建文件
│   ├── nginx.conf          # Nginx 配置
│   └── package.json
│
├── server/                 # 后端项目
│   ├── src/
│   │   ├── config/         # 配置
│   │   ├── data/           # 数据文件
│   │   ├── knowledge_graph/ # 知识图谱模块
│   │   ├── knowledge_base/ # 知识库模块
│   │   ├── middleware/     # 中间件
│   │   ├── repositories/   # 数据访问层
│   │   ├── routes/         # 路由
│   │   ├── services/       # 业务逻辑
│   │   │   ├── dialog/     # 对话状态机
│   │   │   ├── rag.service.ts        # RAG服务
│   │   │   ├── llm.service.ts        # LLM服务
│   │   │   ├── lung-cancer.service.ts # 肺癌服务
│   │   │   ├── blockchain.service.ts # 区块链服务
│   │   │   └── ...
│   │   ├── __tests__/      # 测试文件
│   │   ├── utils/          # 工具函数
│   │   │   └── logger.ts   # Pino日志
│   │   └── app.ts          # 入口文件
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   ├── Dockerfile          # Docker 构建文件
│   ├── vitest.config.ts    # 测试配置
│   └── package.json
│
├── docker-compose.yml      # Docker Compose 配置
├── init-db.sql             # 数据库初始化脚本
├── setup.sh                # Linux/Mac 部署脚本
├── setup.ps1               # Windows 部署脚本
├── PROJECT_DESCRIPTION.md  # 项目详细描述文档
├── CONTRIBUTING.md         # 团队协作指南
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
| `npm run test` | 运行测试 |
| `npm run test:coverage` | 运行测试覆盖率 |
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

### 肺癌早筛接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/lung-cancer/nodule/analyze` | POST | 肺结节分析 |
| `/api/v1/lung-cancer/staging` | POST | TNM分期判定 |
| `/api/v1/lung-cancer/screening-plan` | POST | 筛查计划生成 |
| `/api/v1/lung-cancer/precision-treatment` | POST | 精准医疗推荐 |

### 区块链存证接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/blockchain/attest` | POST | 上链存证 |
| `/api/v1/blockchain/verify` | POST | 验证存证 |
| `/api/v1/blockchain/status` | GET | 区块链状态 |

## 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `JWT_SECRET` | ✅ | JWT 签名密钥 |
| `COOKIE_SECRET` | ✅ | Cookie 签名密钥 |
| `QWEN_API_KEY` | ❌ | 阿里云百炼 API Key（不配置则运行演示模式） |
| `CORS_ORIGIN` | ✅ | 前端地址 |
| `LOG_LEVEL` | ❌ | 日志级别 (debug/info/warn/error) |

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

### Q: 深度学习分割不工作？

- 确保模型文件存在: `web/public/models/lung_segmentation.onnx`
- 运行 `python web/scripts/create_model.py` 创建模型
- 检查浏览器是否支持 WebGPU 或 WASM

### Q: 前端无法连接后端？

- 确认后端已启动
- 检查 CORS 配置是否正确
- 查看浏览器控制台错误信息

### Q: Docker 部署失败？

- 确保已安装 Docker 和 Docker Compose
- 检查端口是否被占用（80、3000、5432、6379）
- 查看 Docker 日志：`docker-compose logs`

## 风险与合规

- **医疗准确性**：所有回答必须包含免责声明，并标注信息来源
- **数据隐私**：不存储用户图片，传输加密，使用阿里云合规服务
- **成本控制**：利用免费额度，模型分层（Flash/Max），高频问题缓存

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解协作流程。

## 致谢

- [Vue.js](https://vuejs.org/)
- [Fastify](https://fastify.dev/)
- [Prisma](https://www.prisma.io/)
- [阿里云百炼](https://bailian.console.aliyun.com/)
- [pgvector](https://github.com/pgvector/pgvector)
- [VTK.js](https://kitware.github.io/vtk-js/)
- [ONNX Runtime Web](https://onnxruntime.ai/)
