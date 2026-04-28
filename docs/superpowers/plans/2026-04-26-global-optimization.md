# 智疗助手全局优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将所有前端 mock/测试实现对接真实后端 API，加固后端安全，新建 Dashboard API，改造模拟服务，清理调试残留

**Architecture:** 分层渐进式 - 后端安全层 → 后端数据层 → 前端对接层 → 清理层

**Tech Stack:** Vue 3 + TypeScript + Pinia (前端), Fastify + Prisma + TypeScript (后端)

---

## Layer 1: 后端安全加固

### Task 1: 为 lung-cancer 路由添加认证中间件

**Files:**
- Modify: `server/src/routes/lung-cancer.routes.ts`

- [ ] **Step 1: 读取当前路由文件，找到路由注册位置**
- [ ] **Step 2: 在所有路由定义前添加 `onRequest: [fastify.authenticate]` 预处理，与 user.routes.ts 保持一致**
- [ ] **Step 3: 验证 TypeScript 编译通过**

### Task 2: 为 hypertension 路由添加认证中间件

**Files:**
- Modify: `server/src/routes/hypertension.routes.ts`

- [ ] **Step 1: 读取当前路由文件**
- [ ] **Step 2: 添加 authenticate 中间件**
- [ ] **Step 3: 验证编译通过**

### Task 3: 为 digital-twin 路由添加认证中间件

**Files:**
- Modify: `server/src/routes/digital-twin.routes.ts`

- [ ] **Step 1: 读取当前路由文件**
- [ ] **Step 2: 添加 authenticate 中间件**
- [ ] **Step 3: 验证编译通过**

### Task 4: 为 blockchain 路由添加认证中间件

**Files:**
- Modify: `server/src/routes/blockchain.routes.ts`

- [ ] **Step 1: 读取当前路由文件**
- [ ] **Step 2: 添加 authenticate 中间件**
- [ ] **Step 3: 验证编译通过**

---

## Layer 2: 后端数据层

### Task 5: 新建 Dashboard 路由和服务

**Files:**
- Create: `server/src/routes/dashboard.routes.ts`
- Create: `server/src/services/dashboard.service.ts`
- Modify: `server/src/app.ts` (注册新路由)

- [ ] **Step 1: 创建 dashboard.service.ts，实现 getStats/getConsultationTrend/getDiseaseDistribution/getRecentActivities/getFeatureStats**
- [ ] **Step 2: 创建 dashboard.routes.ts，定义 5 个 GET 端点，添加 authenticate 中间件**
- [ ] **Step 3: 在 app.ts 中注册 dashboard 路由**
- [ ] **Step 4: 验证编译通过**

### Task 6: 为模拟服务添加演示标注

**Files:**
- Modify: `server/src/services/blockchain.service.ts`
- Modify: `server/src/services/digital-twin.service.ts`
- Modify: `server/src/services/federated.service.ts`

- [ ] **Step 1: 在 blockchain.service.ts 的所有公开方法返回值中添加 `isSimulated: true` 字段**
- [ ] **Step 2: 在 digital-twin.service.ts 中移除不存在的 meshUrl，添加 `isSimulated: true`**
- [ ] **Step 3: 在 federated.service.ts 中添加 `isSimulated: true`**
- [ ] **Step 4: 验证编译通过**

---

## Layer 3: 前端对接层

### Task 7: 修复 Login.vue - 移除验证码提示

**Files:**
- Modify: `web/src/views/Login.vue`

- [ ] **Step 1: 移除模板中 3 处 "模拟验证码：123456" 提示文字**
- [ ] **Step 2: 验证页面正常渲染**

### Task 8: 修复 usePasswordModal.ts - 对接真实 API

**Files:**
- Modify: `web/src/composables/usePasswordModal.ts`

- [ ] **Step 1: 导入 userApi**
- [ ] **Step 2: 将 submit 函数中的 setTimeout + 硬编码密码校验替换为调用 userApi.changePassword**
- [ ] **Step 3: 处理 API 错误响应，显示后端返回的错误信息**
- [ ] **Step 4: 验证编译通过**

### Task 9: 修复 useAvatarModal.ts - 对接文件上传 API

**Files:**
- Modify: `web/src/composables/useAvatarModal.ts`

- [ ] **Step 1: 修改 changeAvatar 函数签名，接收 File 参数而非自动生成**
- [ ] **Step 2: 调用 userApi.uploadAvatar 上传文件**
- [ ] **Step 3: 上传成功后用返回的 avatarUrl 更新用户信息**
- [ ] **Step 4: 验证编译通过**

### Task 10: 修复 Profile.vue 头像上传交互

**Files:**
- Modify: `web/src/views/Profile.vue`

- [ ] **Step 1: 修改头像更换弹窗，添加文件选择 input**
- [ ] **Step 2: 调用修改后的 useAvatarModal.changeAvatar 传入选择的文件**
- [ ] **Step 3: saveEdit 函数调用 userApi.updateProfile 对接后端**
- [ ] **Step 4: handleLogout 函数调用 authApi.logout 对接后端**
- [ ] **Step 5: 验证编译通过**

### Task 11: 修复 useDeleteAccountModal.ts - 对接真实 API

**Files:**
- Modify: `web/src/composables/useDeleteAccountModal.ts`

- [ ] **Step 1: 导入 userApi 和 router**
- [ ] **Step 2: 将 confirm 函数中的 setTimeout 替换为调用 userApi.deleteAccount**
- [ ] **Step 3: 删除成功后调用 userStore.logout() 并跳转到登录页**
- [ ] **Step 4: 验证编译通过**

### Task 12: 修复 LungCancerScreening.vue - 对接后端 API

**Files:**
- Modify: `web/src/views/LungCancerScreening.vue`

- [ ] **Step 1: 导入 lungCancerApi**
- [ ] **Step 2: 将 analyzeNodule 函数中的前端本地计算逻辑替换为调用 lungCancerApi.analyzeNodule**
- [ ] **Step 3: 将请求参数组装为后端期望的格式（patientId, noduleData, patientHistory）**
- [ ] **Step 4: 处理 API 响应，将后端返回的风险评估结果映射到页面展示**
- [ ] **Step 5: 添加错误处理，API 失败时显示用户可见的错误提示**
- [ ] **Step 6: 验证编译通过**

### Task 13: 修复 HypertensionManagement.vue - 对接后端 API

**Files:**
- Modify: `web/src/views/HypertensionManagement.vue`

- [ ] **Step 1: 导入 hypertensionApi**
- [ ] **Step 2: 将 analyzeBP 函数中的前端本地计算替换为调用 hypertensionApi.analyzeBP**
- [ ] **Step 3: 将风险评估逻辑替换为调用 hypertensionApi.assessRisk**
- [ ] **Step 4: 将用药建议逻辑替换为调用 hypertensionApi.generateTreatmentPlan**
- [ ] **Step 5: 处理 API 响应和错误**
- [ ] **Step 6: 验证编译通过**

### Task 14: 修复 Dashboard.vue - 对接后端 API

**Files:**
- Modify: `web/src/views/Dashboard.vue`

- [ ] **Step 1: 导入 dashboardApi**
- [ ] **Step 2: 将硬编码统计数据替换为 dashboardApi.getStats() 返回值**
- [ ] **Step 3: 将随机趋势数据替换为 dashboardApi.getConsultationTrend()**
- [ ] **Step 4: 将硬编码疾病分布替换为 dashboardApi.getDiseaseDistribution()**
- [ ] **Step 5: 将硬编码活动列表替换为 dashboardApi.getRecentActivities()**
- [ ] **Step 6: 移除每3秒随机更新数据的定时器**
- [ ] **Step 7: 添加加载状态和错误处理**
- [ ] **Step 8: 验证编译通过**

### Task 15: 修复 DigitalTwin.vue - 添加错误提示和 fallback 标注

**Files:**
- Modify: `web/src/views/DigitalTwin.vue`

- [ ] **Step 1: 在 catch 块中添加用户可见的错误提示（使用 useToast）**
- [ ] **Step 2: 当 API 返回 isSimulated: true 时，在页面显示"演示模式"标注**
- [ ] **Step 3: 修复 overallHealthScore 在 indicators 为空时 NaN 的问题**
- [ ] **Step 4: 验证编译通过**

---

## Layer 4: 清理层

### Task 16: 清理 console.log 调试残留

**Files:**
- Modify: `web/src/utils/mhdParser.ts`
- Modify: `web/src/composables/useVTKVolumeRenderer.ts`
- Modify: `server/src/services/reranker.service.ts`

- [ ] **Step 1: 移除 mhdParser.ts 中 5 处 console.log**
- [ ] **Step 2: 移除 useVTKVolumeRenderer.ts 中 3 处 console.log**
- [ ] **Step 3: 将 reranker.service.ts 中 console.log 替换为 logger.info**
- [ ] **Step 4: 验证编译通过**

---

## Final: 构建验证

### Task 17: 运行完整构建和类型检查

- [ ] **Step 1: 运行前端 `npm run build` 确保无编译错误**
- [ ] **Step 2: 运行后端 TypeScript 编译检查**
- [ ] **Step 3: 修复任何发现的问题**
