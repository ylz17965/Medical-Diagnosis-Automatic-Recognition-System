# 团队协作指南

本文档帮助团队成员快速上手项目并正确进行版本控制。

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System
```

### 2. 运行一键部署脚本

**Windows:**
```powershell
.\setup.ps1
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### 3. 配置 API Key

编辑 `server/.env` 文件，填入你的 `QWEN_API_KEY`。

### 4. 启动开发服务器

```bash
npm run dev
```

## 版本控制工作流

### 推荐的 Git 工作流

我们使用 **Fork + Pull Request** 模式进行协作：

```
你的 Fork → 你的分支 → Pull Request → 主仓库
```

### 详细步骤

#### 步骤 1: Fork 仓库

1. 在 GitHub 页面点击右上角 "Fork" 按钮
2. 创建你自己的 Fork 仓库

#### 步骤 2: 克隆你的 Fork

```bash
# 替换为你的 GitHub 用户名
git clone https://github.com/你的用户名/Medical-Diagnosis-Automatic-Recognition-System.git
cd Medical-Diagnosis-Automatic-Recognition-System
```

#### 步骤 3: 添加上游仓库

```bash
git remote add upstream https://github.com/ylz17965/Medical-Diagnosis-Automatic-Recognition-System.git
```

#### 步骤 4: 创建功能分支

```bash
# 先同步最新代码
git fetch upstream
git checkout main
git merge upstream/main

# 创建你的功能分支
git checkout -b feature/你的功能名称
```

#### 步骤 5: 提交代码

```bash
# 添加修改的文件
git add .

# 提交（使用规范的提交信息）
git commit -m "feat: 添加新功能描述"

# 推送到你的 Fork
git push origin feature/你的功能名称
```

#### 步骤 6: 创建 Pull Request

1. 在 GitHub 上打开你的 Fork
2. 点击 "Compare & pull request"
3. 填写 PR 描述
4. 提交 PR 等待审核

### 同步最新代码

定期同步主仓库的最新代码：

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加用户登录功能` |
| `fix` | Bug 修复 | `fix: 修复登录验证问题` |
| `docs` | 文档更新 | `docs: 更新 README` |
| `style` | 代码格式 | `style: 格式化代码` |
| `refactor` | 重构 | `refactor: 重构用户服务` |
| `test` | 测试 | `test: 添加登录测试` |
| `chore` | 其他 | `chore: 更新依赖` |

## 分支命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| 功能 | `feature/xxx` | `feature/user-auth` |
| 修复 | `fix/xxx` | `fix/login-bug` |
| 文档 | `docs/xxx` | `docs/api-guide` |
| 重构 | `refactor/xxx` | `refactor/auth-module` |

## 常见问题

### Q: 如何撤销未提交的修改？

```bash
# 撤销所有未暂存的修改
git checkout -- .

# 撤销暂存
git reset HEAD .
```

### Q: 如何撤销最后一次提交？

```bash
# 保留修改
git reset --soft HEAD~1

# 丢弃修改
git reset --hard HEAD~1
```

### Q: 如何解决合并冲突？

1. 手动编辑冲突文件
2. 解决冲突后：
```bash
git add .
git commit -m "merge: 解决冲突"
```

### Q: 如何查看提交历史？

```bash
# 简洁历史
git log --oneline

# 图形化历史
git log --oneline --graph
```

## 代码审查清单

提交 PR 前请检查：

- [ ] 代码能正常运行
- [ ] 没有 console.log 等调试代码
- [ ] 没有提交 .env 等敏感文件
- [ ] 提交信息符合规范
- [ ] 已同步最新代码
- [ ] 没有引入新的 TypeScript 错误

## 联系方式

如有问题，请：
1. 创建 Issue
2. 联系仓库管理员
