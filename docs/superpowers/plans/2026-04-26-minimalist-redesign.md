# 智疗助手 - 极简化改造计划

## 目标

将当前臃肿的医疗AI助手前端精简为极简风格，删除非核心功能，统一设计语言，提升交互体验。

## 设计原则

- **极简主义 (Minimalism)**: 去除一切不必要的装饰和功能，保留核心价值
- **内容优先**: 让内容成为焦点，UI服务于内容
- **一致性**: 统一的设计语言、间距、圆角、阴影
- **少即是多**: 每个页面只做一件事，做好一件事

---

## Phase 1: 删除非核心功能

### Task 1.1: 删除 UserTest 页面及相关组件

**删除文件:**
- `web/src/views/UserTest.vue`
- `web/src/components/business/SUSSurvey.vue`
- `web/src/components/business/CustomSurvey.vue`
- `web/src/services/analytics.ts`

**修改文件:**
- `web/src/router/index.ts` - 移除 `/user-test` 路由
- `web/src/components/business/index.ts` - 移除 SUSSurvey/CustomSurvey 导出

### Task 1.2: 删除 Dashboard 页面

**删除文件:**
- `web/src/views/Dashboard.vue`

**修改文件:**
- `web/src/router/index.ts` - 移除 `/dashboard` 路由
- `web/src/services/api.ts` - 移除 dashboardApi 相关代码（如存在）

### Task 1.3: 清理 Sidebar 中已删除页面的导航项

**修改文件:**
- `web/src/components/navigation/Sidebar.vue` - 移除 Dashboard、UserTest 导航链接

---

## Phase 2: 极简化核心页面

### Task 2.1: 极简化 Login 页面

**当前问题:** 复杂的滑动面板设计（form-card + overlay-panel），注册/登录/忘记密码三合一，代码量大(~1170行)

**改造方案:**
- 移除滑动面板设计，改为简洁居中卡片
- 登录/注册用 tab 切换，忘记密码用独立步骤
- 移除渐变背景动画，使用纯色/微渐变
- 减少过渡动画，保持简洁
- 保留手机号+验证码登录和邮箱+密码登录

**修改文件:**
- `web/src/views/Login.vue` - 完全重写为极简设计

### Task 2.2: 极简化 Chat 欢迎界面

**当前问题:** 7个功能入口(search, qa, report, drug, lung, heart, lung-ct)，信息过载

**改造方案:**
- 减少功能入口到3个核心: 健康咨询(search)、报告解读(report)、用药指导(drug)
- 移除快捷问题区域，简化欢迎文案
- 肺癌早筛和高血压管理通过侧边栏导航访问
- LungVolume3D 从 Chat 页面移除（仅保留在 LungCTView）

**修改文件:**
- `web/src/views/Chat.vue` - 简化欢迎区域和功能入口
- `web/src/components/business/FeatureEntry.vue` - 调整为3个核心功能

### Task 2.3: 极简化 Sidebar 导航

**当前问题:** 导航项过多（肺部CT、肺癌早筛、高血压管理、健康仪表盘），对话列表+导航菜单混合

**改造方案:**
- 保留: 新建对话、对话列表、设置、退出登录
- 导航精简为: 肺癌早筛、高血压管理（移除Dashboard和UserTest）
- 移除"编辑资料"按钮（在Profile页面编辑即可）
- 简化对话删除确认流程

**修改文件:**
- `web/src/components/navigation/Sidebar.vue` - 精简导航

### Task 2.4: 极简化 Profile 页面

**当前问题:** 4个设置分区（个人信息、通知设置、隐私安全、外观设置），功能过多

**改造方案:**
- 合并为2个分区: 个人信息、账号设置
- 移除"健康档案"占位区域
- 通知设置简化为开关
- 主题切换保留但简化UI
- 移除独立的密码修改Modal，整合到账号设置中

**修改文件:**
- `web/src/views/Profile.vue` - 简化分区和布局

### Task 2.5: 极简化 LungCTView 页面

**当前问题:** 大量硬编码样式，emoji作为图标，UI风格与其他页面不一致

**改造方案:**
- 使用CSS变量替换硬编码颜色
- 用SVG图标替换emoji
- 简化工具栏布局
- 统一圆角、间距、阴影

**修改文件:**
- `web/src/views/LungCTView.vue` - 统一设计语言

### Task 2.6: 极简化 LungCancerScreening 和 HypertensionManagement

**当前问题:** 两个页面结构相似但样式重复，表单项过多

**改造方案:**
- 保持功能不变，统一设计语言
- 使用CSS变量替换硬编码颜色
- 简化表单布局
- 优化结果展示区域

**修改文件:**
- `web/src/views/LungCancerScreening.vue` - 统一样式
- `web/src/views/HypertensionManagement.vue` - 统一样式

---

## Phase 3: 统一极简设计语言

### Task 3.1: 更新 CSS 变量和全局样式

**改造方案:**
- 简化 variables.css，移除不常用的变量
- 统一极简风格: 更大的留白、更轻的阴影、更少的边框
- 优化 main.css 中的全局样式
- 确保深色模式一致性

**修改文件:**
- `web/src/styles/variables.css` - 精简变量
- `web/src/styles/main.css` - 优化全局样式

### Task 3.2: 清理未使用的组件和图标

**删除/清理:**
- 移除不再使用的图标组件
- 清理 components/business/index.ts 导出
- 清理 composables 中不再使用的 composable

**修改文件:**
- `web/src/components/icons/` - 移除未使用图标
- `web/src/components/business/index.ts` - 清理导出
- `web/src/composables/index.ts` - 清理导出

---

## Phase 4: 验证

### Task 4.1: 构建验证

- 运行 `npm run typecheck` 确保无类型错误
- 运行 `npm run build` 确保构建成功
- 检查所有路由正常工作
- 检查深色/浅色模式切换正常

---

## 极简设计规范

### 颜色
- 主色: `--color-primary` (#007AFF) 保持不变
- 背景: 更多的白色/浅灰留白
- 文字: 主文字 `--color-text-primary`，辅助文字 `--color-text-secondary`
- 减少渐变使用，偏好纯色

### 间距
- 页面内边距: `--spacing-6` (1.5rem)
- 卡片内边距: `--spacing-6`
- 元素间距: `--spacing-4` ~ `--spacing-6`
- 更大的呼吸空间

### 圆角
- 卡片: `--radius-xl` (20px)
- 按钮: `--radius-lg` (16px) 或 `--radius-full`
- 输入框: `--radius-lg`

### 阴影
- 轻阴影为主: `--shadow-sm`
- 悬浮状态: `--shadow-md`
- 避免重阴影

### 动画
- 保持简洁: 仅使用 fade 过渡
- 时长: 200-300ms
- 尊重 `prefers-reduced-motion`

### 图标
- 全部使用 SVG 图标，不使用 emoji
- 统一图标大小: 20px (默认), 24px (大)

### 排版
- 标题: 简洁，不加装饰
- 正文: 16px, line-height 1.5
- 辅助文字: 14px, 浅灰色
