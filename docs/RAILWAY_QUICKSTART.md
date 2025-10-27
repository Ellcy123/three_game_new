# Railway 部署快速指南

> 5分钟快速部署ECHO游戏到Railway

---

## 🚀 快速步骤

### 1. 准备GitHub仓库（2分钟）

```bash
# 进入项目目录
cd three_game_new

# 添加.gitignore（如果还没有）
echo "node_modules/
.env
dist/
logs/
*.log" > .gitignore

# 提交代码
git add .
git commit -m "Ready for Railway deployment"

# 推送到GitHub
git remote add origin https://github.com/你的用户名/three_game_new.git
git push -u origin main
```

### 2. 部署到Railway（2分钟）

#### 登录Railway
1. 访问 https://railway.app
2. 使用GitHub账号登录

#### 创建新项目
1. 点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 选择 `three_game_new` 仓库

#### 添加服务
依次添加以下服务：

**后端服务**:
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

**PostgreSQL**:
- 点击 **"New"** → **"Database"** → **"PostgreSQL"**

**Redis**:
- 点击 **"New"** → **"Database"** → **"Redis"**

### 3. 配置环境变量（1分钟）

在后端服务的 **Variables** 中添加：

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# JWT密钥（生成强密码）
JWT_SECRET=你生成的强密钥
JWT_REFRESH_SECRET=你生成的强密钥
JWT_EXPIRE=24h

# CORS（替换为实际URL）
CLIENT_URL=https://your-frontend.up.railway.app
ALLOWED_ORIGINS=https://your-frontend.up.railway.app
```

**生成JWT密钥**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 初始化数据库（1分钟）

#### 方法1: 使用Railway CLI（推荐）

```bash
# 安装CLI
curl -fsSL https://railway.app/install.sh | sh

# 登录
railway login

# 连接项目
cd backend
railway link

# 初始化数据库
railway run npm run db:init
```

#### 方法2: 使用Web控制台

1. 在Railway控制台打开PostgreSQL服务
2. 点击 **"Connect"** → **"Query"**
3. 复制 `backend/database/migrations/001_initial_schema.sql` 内容
4. 粘贴并执行

### 5. 验证部署（1分钟）

```bash
# 测试健康检查
curl https://你的后端URL.up.railway.app/health

# 预期输出：
# {"status":"ok","timestamp":"...","uptime":...}
```

---

## ✅ 完成！

现在你的ECHO游戏后端已成功部署到Railway！

**获取URL**:
- 后端: 在Railway控制台 → 后端服务 → Settings → Domains
- 数据库: 自动连接（无需手动配置）

**下一步**:
- 部署前端应用
- 配置自定义域名
- 设置监控告警

---

## 📋 快速参考

### Railway CLI命令

```bash
railway login              # 登录
railway link              # 连接项目
railway logs              # 查看日志
railway run <command>     # 运行命令
railway connect postgres  # 连接数据库
railway variables         # 查看环境变量
```

### 常见问题

**Q: 构建失败怎么办？**
A: 查看Logs选项卡，检查错误信息。通常是缺少环境变量或构建命令错误。

**Q: 服务启动失败？**
A: 确保：
- `PORT` 环境变量已设置
- 数据库连接正确
- 所有依赖已安装

**Q: 数据库连接失败？**
A: Railway会自动注入 `DATABASE_URL`，确保后端服务和数据库在同一项目中。

---

## 📚 详细文档

查看完整部署指南：[RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)

---

**预计总时间**: 5-7分钟
**免费额度**: $5/月
**适用于**: 开发和小型项目
