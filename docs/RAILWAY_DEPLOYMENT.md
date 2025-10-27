# Railway 部署指南

> ECHO游戏完整部署到Railway平台的详细步骤

**部署平台**: Railway (https://railway.app)
**预计时间**: 30-45分钟
**难度**: ⭐⭐⭐☆☆ 中等

---

## 📋 目录

1. [准备工作](#准备工作)
2. [Railway账号设置](#railway账号设置)
3. [项目准备](#项目准备)
4. [部署后端服务](#部署后端服务)
5. [部署PostgreSQL数据库](#部署postgresql数据库)
6. [部署Redis缓存](#部署redis缓存)
7. [配置环境变量](#配置环境变量)
8. [初始化数据库](#初始化数据库)
9. [部署前端应用](#部署前端应用)
10. [验证部署](#验证部署)
11. [故障排查](#故障排查)
12. [成本估算](#成本估算)

---

## 准备工作

### ✅ 确认清单

在开始部署之前，请确保：

- [ ] 已注册GitHub账号
- [ ] 项目代码已上传到GitHub仓库
- [ ] 本地数据库和服务器运行正常
- [ ] 准备好信用卡（Railway需要验证，但有免费额度）

### 📦 项目结构检查

确保项目结构如下：

```
three_game_new/
├── backend/                 # 后端服务
│   ├── src/
│   ├── database/
│   ├── package.json
│   └── .env.example
├── frontend/               # 前端应用（如果已创建）
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── docs/
└── README.md
```

---

## Railway账号设置

### 步骤1: 注册Railway账号

1. 访问 https://railway.app
2. 点击 **"Start a New Project"** 或 **"Login"**
3. 选择 **"Login with GitHub"**（推荐）
4. 授权Railway访问你的GitHub账号

### 步骤2: 添加支付方式

1. 进入 **Account Settings**
2. 点击 **Billing**
3. 添加信用卡信息（用于验证，不会立即收费）

**免费额度**:
- ✅ $5/月 免费额度
- ✅ 500小时执行时间/月
- ✅ 足够运行小型项目

---

## 项目准备

### 步骤1: 创建GitHub仓库

```bash
# 1. 初始化Git仓库（如果还没有）
cd three_game_new
git init

# 2. 添加.gitignore
# 确保以下内容在.gitignore中：
# node_modules/
# .env
# dist/
# logs/

# 3. 提交代码
git add .
git commit -m "Initial commit for Railway deployment"

# 4. 创建GitHub仓库并推送
# 在GitHub上创建新仓库：three_game_new
git remote add origin https://github.com/你的用户名/three_game_new.git
git branch -M main
git push -u origin main
```

### 步骤2: 创建必要的配置文件

#### 创建 `backend/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 创建 `backend/nixpacks.toml`

```toml
[phases.setup]
nixPkgs = ['nodejs-18_x']

[phases.install]
cmds = ['npm install']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'npm start'
```

#### 创建 `backend/.dockerignore`

```
node_modules
npm-debug.log
.env
.env.local
dist
logs
*.log
.git
.gitignore
README.md
```

---

## 部署后端服务

### 步骤1: 创建新项目

1. 登录Railway
2. 点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 选择你的 `three_game_new` 仓库
5. 选择 **backend** 目录作为根目录

### 步骤2: 配置构建设置

在项目设置中：

1. **Root Directory**: 设置为 `backend`
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm start`
4. **Watch Paths**: `backend/**`

### 步骤3: 等待构建完成

Railway会自动：
- ✅ 检测Node.js项目
- ✅ 安装依赖
- ✅ 运行构建命令
- ✅ 启动服务

---

## 部署PostgreSQL数据库

### 步骤1: 添加PostgreSQL插件

1. 在Railway项目中，点击 **"New"** → **"Database"**
2. 选择 **"PostgreSQL"**
3. Railway会自动创建数据库实例

### 步骤2: 获取数据库连接信息

PostgreSQL部署后，Railway会自动生成环境变量：

```
DATABASE_URL=postgresql://postgres:password@host:port/railway
PGHOST=host
PGPORT=port
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=railway
```

**注意**: 这些变量会自动注入到后端服务中。

---

## 部署Redis缓存

### 步骤1: 添加Redis插件

1. 在Railway项目中，点击 **"New"** → **"Database"**
2. 选择 **"Redis"**
3. Railway会自动创建Redis实例

### 步骤2: 获取Redis连接信息

Redis部署后，Railway会自动生成：

```
REDIS_URL=redis://default:password@host:port
```

---

## 配置环境变量

### 步骤1: 设置后端环境变量

在后端服务的 **Variables** 选项卡中添加：

#### 基础配置

```env
# 环境
NODE_ENV=production

# 服务器
PORT=3000
HOST=0.0.0.0

# 数据库（Railway自动注入，无需手动设置）
# DATABASE_URL=...（自动生成）
# PGHOST=...（自动生成）
# PGPORT=...（自动生成）
# PGUSER=...（自动生成）
# PGPASSWORD=...（自动生成）
# PGDATABASE=...（自动生成）

# 手动设置的数据库别名（兼容代码）
DB_HOST=${{PGHOST}}
DB_PORT=${{PGPORT}}
DB_USER=${{PGUSER}}
DB_PASSWORD=${{PGPASSWORD}}
DB_NAME=${{PGDATABASE}}

# Redis（Railway自动注入）
# REDIS_URL=...（自动生成）

# 手动设置的Redis别名
REDIS_HOST=${{REDIS_URL}}

# JWT密钥（重要：生成强密码）
JWT_SECRET=production_jwt_secret_change_this_to_random_256_bit_key
JWT_REFRESH_SECRET=production_refresh_secret_change_this_to_random_256_bit_key
JWT_EXPIRE=24h
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d

# CORS配置（替换为实际前端URL）
CLIENT_URL=https://your-frontend-app.up.railway.app
ALLOWED_ORIGINS=https://your-frontend-app.up.railway.app

# Socket.IO配置
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# 日志配置
LOG_LEVEL=info

# 房间配置
ROOM_MAX_PLAYERS=3
ROOM_TIMEOUT=3600000
ROOM_IDLE_TIMEOUT=1800000

# 限流配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 步骤2: 生成强密钥

**生成JWT密钥**（在本地运行）：

```bash
# 生成256位随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出结果替换 `JWT_SECRET` 和 `JWT_REFRESH_SECRET`。

---

## 初始化数据库

### 方法1: 使用Railway CLI（推荐）

#### 安装Railway CLI

```bash
# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex

# Mac/Linux
curl -fsSL https://railway.app/install.sh | sh
```

#### 登录并连接项目

```bash
# 登录
railway login

# 进入backend目录
cd backend

# 连接到项目
railway link

# 运行数据库初始化
railway run npm run db:init
```

### 方法2: 使用PostgreSQL客户端

#### 获取数据库连接URL

在Railway的PostgreSQL服务中，复制 `DATABASE_URL`。

#### 使用psql连接

```bash
# 使用Railway的DATABASE_URL
psql "postgresql://postgres:password@host:port/railway" -f database/migrations/001_initial_schema.sql
```

#### 或使用Node.js脚本

```bash
# 设置环境变量
export DATABASE_URL="你的Railway数据库URL"

# 运行初始化脚本
node scripts/init-database.js
```

### 方法3: 通过Railway Web控制台

1. 在Railway控制台中，打开PostgreSQL服务
2. 点击 **"Connect"**
3. 选择 **"Query"**
4. 复制粘贴 `001_initial_schema.sql` 的内容
5. 点击 **"Execute"**

---

## 部署前端应用

### 步骤1: 准备前端项目（如果已创建）

#### 更新 `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  preview: {
    port: 4173,
  },
})
```

#### 更新环境变量配置

创建 `frontend/.env.production`:

```env
VITE_API_URL=https://your-backend-app.up.railway.app
VITE_WS_URL=wss://your-backend-app.up.railway.app
```

### 步骤2: 部署到Railway

1. 在同一个Railway项目中，点击 **"New"** → **"GitHub Repo"**
2. 选择 `three_game_new` 仓库
3. 设置 **Root Directory** 为 `frontend`
4. 配置：
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx vite preview --host 0.0.0.0 --port $PORT`

### 步骤3: 添加环境变量

在前端服务的环境变量中：

```env
VITE_API_URL=${{BACKEND_SERVICE_URL}}
VITE_WS_URL=${{BACKEND_SERVICE_URL}}
```

**注意**: 将 `${{BACKEND_SERVICE_URL}}` 替换为实际的后端服务URL。

---

## 验证部署

### 步骤1: 检查服务状态

在Railway控制台中：

1. **后端服务**: 查看日志，确认服务启动成功
2. **PostgreSQL**: 状态显示 "Active"
3. **Redis**: 状态显示 "Active"
4. **前端服务**: 状态显示 "Active"

### 步骤2: 测试API

```bash
# 获取后端URL
# 在Railway控制台的后端服务中，点击"Settings" -> "Domains"
# 复制生成的URL，例如：https://your-app.up.railway.app

# 测试健康检查
curl https://your-backend-app.up.railway.app/health

# 预期响应：
# {
#   "status": "ok",
#   "timestamp": "2025-10-27T...",
#   "uptime": 123.45,
#   "environment": "production"
# }

# 测试API信息
curl https://your-backend-app.up.railway.app/api

# 预期响应：
# {
#   "message": "ECHO Game API",
#   "version": "1.0.0",
#   "endpoints": { ... }
# }
```

### 步骤3: 测试数据库连接

查看后端服务日志，应该看到：

```
✅ Database connected successfully
✅ Redis connected successfully
✅ Socket.IO server initialized
🚀 Server running on http://0.0.0.0:3000
```

### 步骤4: 验证数据库表

使用Railway CLI连接数据库：

```bash
railway connect postgres

# 在psql中执行：
\dt

# 应该看到6个表：
# users, game_rooms, room_players, game_saves, game_events, chat_messages
```

### 步骤5: 访问前端应用

访问前端URL（例如：`https://your-frontend.up.railway.app`）

验证：
- ✅ 页面正常加载
- ✅ 可以连接到后端API
- ✅ WebSocket连接成功

---

## 故障排查

### 问题1: 构建失败

**错误**: `Build failed: command not found`

**解决方案**:
1. 检查 `package.json` 中的脚本是否正确
2. 确认 `build` 脚本存在：
   ```json
   "scripts": {
     "build": "tsc"
   }
   ```
3. 检查 `nixpacks.toml` 或 `railway.json` 配置

### 问题2: 服务启动失败

**错误**: `Service exited with code 1`

**解决方案**:
1. 查看Railway日志（Logs选项卡）
2. 常见原因：
   - 缺少环境变量
   - 数据库连接失败
   - 端口配置错误

3. 确保使用 `PORT` 环境变量：
   ```typescript
   const PORT = process.env.PORT || 3000;
   ```

### 问题3: 数据库连接失败

**错误**: `connect ECONNREFUSED`

**解决方案**:
1. 确认PostgreSQL服务已部署并运行
2. 检查 `DATABASE_URL` 环境变量
3. 确保后端服务和数据库在同一个项目中

### 问题4: CORS错误

**错误**: `Access to ... has been blocked by CORS policy`

**解决方案**:
1. 更新后端 `ALLOWED_ORIGINS` 环境变量
2. 包含前端的完整URL（带https://）
3. 重启后端服务

### 问题5: WebSocket连接失败

**错误**: `WebSocket connection failed`

**解决方案**:
1. 确保后端URL使用 `wss://`（不是 `ws://`）
2. 检查Socket.IO配置：
   ```typescript
   const io = new Server(httpServer, {
     cors: {
       origin: process.env.ALLOWED_ORIGINS?.split(','),
       credentials: true,
     },
   });
   ```

---

## 成本估算

### Railway免费额度

- **每月**: $5 免费额度
- **执行时间**: 500小时/月
- **数据库**: 包含在免费额度内

### 预计使用量（小型项目）

| 服务 | 预计成本/月 |
|------|------------|
| 后端服务 (512MB) | ~$3 |
| PostgreSQL (256MB) | ~$1 |
| Redis (256MB) | ~$1 |
| 前端服务 (512MB) | ~$3 |
| **总计** | ~$8/月 |

**结论**: 小型项目可在免费额度内运行，需要升级时按使用量付费。

### 优化建议

1. **合并服务**: 前端可以部署到Vercel/Netlify（免费）
2. **缩小实例**: 开发阶段使用最小配置
3. **休眠策略**: 非活跃时自动休眠（免费版自带）

---

## 部署后优化

### 1. 添加自定义域名

1. 在Railway服务设置中，点击 **"Settings"** → **"Domains"**
2. 点击 **"Custom Domain"**
3. 输入你的域名（例如：`api.yourgame.com`）
4. 在你的域名服务商处添加CNAME记录

### 2. 设置HTTPS

Railway自动提供HTTPS，无需额外配置。

### 3. 配置监控

1. 在Railway控制台查看 **"Metrics"**
2. 监控：
   - CPU使用率
   - 内存使用率
   - 请求数量
   - 响应时间

### 4. 设置告警

1. 进入 **"Settings"** → **"Notifications"**
2. 配置：
   - 服务崩溃告警
   - 资源使用告警
   - 部署失败告警

### 5. 自动部署

Railway默认启用自动部署：
- ✅ 推送到GitHub → 自动部署
- ✅ 构建成功 → 自动上线
- ✅ 回滚支持

---

## 维护建议

### 日志管理

```bash
# 查看实时日志
railway logs

# 导出日志
railway logs > deployment.log
```

### 数据库备份

```bash
# 连接到数据库
railway connect postgres

# 备份（在本地运行）
pg_dump "$(railway variables get DATABASE_URL)" > backup.sql

# 恢复
psql "$(railway variables get DATABASE_URL)" < backup.sql
```

### 更新部署

```bash
# 推送更新
git add .
git commit -m "Update: ..."
git push origin main

# Railway会自动检测并重新部署
```

---

## 快速参考

### Railway CLI常用命令

```bash
# 登录
railway login

# 连接项目
railway link

# 查看服务
railway status

# 查看日志
railway logs

# 运行命令
railway run npm run db:init

# 连接数据库
railway connect postgres

# 连接Redis
railway connect redis

# 查看环境变量
railway variables

# 设置环境变量
railway variables set KEY=VALUE
```

### 环境变量快速复制

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=生成的强密钥
JWT_REFRESH_SECRET=生成的强密钥
JWT_EXPIRE=24h
CLIENT_URL=https://your-frontend.up.railway.app
ALLOWED_ORIGINS=https://your-frontend.up.railway.app
```

---

## 📚 相关资源

- **Railway文档**: https://docs.railway.app/
- **Railway CLI**: https://docs.railway.app/develop/cli
- **Railway定价**: https://railway.app/pricing
- **Railway状态**: https://status.railway.app/

---

## 🎯 总结

完成部署后，你将拥有：

- ✅ 运行在Railway上的后端API服务
- ✅ PostgreSQL数据库（自动备份）
- ✅ Redis缓存服务
- ✅ 前端应用（可选）
- ✅ HTTPS加密
- ✅ 自动部署（Git推送触发）
- ✅ 监控和日志

**下一步**:
1. 测试所有功能
2. 配置生产环境监控
3. 设置定期数据库备份
4. 优化性能和成本

---

**文档版本**: v1.0
**最后更新**: 2025-10-27
**适用于**: Railway Platform
**项目**: ECHO Game
