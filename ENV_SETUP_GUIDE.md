# 环境变量配置指南

## 📋 为什么 .env 文件不在 Git 中？

### 🔒 安全原因

`.env` 文件包含敏感信息，**绝对不应该**提交到 Git 仓库：
- 数据库密码
- JWT 密钥
- API 密钥
- 其他敏感凭据

如果提交到 Git，这些信息会：
- ✗ 暴露在 GitHub/GitLab 公开仓库中
- ✗ 永久保存在 Git 历史中（即使删除也能找回）
- ✗ 被恶意用户利用攻击你的系统

### ✅ 正确做法

1. **`.env`** - 本地开发使用，包含真实凭据（不提交到 Git）
2. **`.env.example`** - 模板文件，不包含敏感信息（提交到 Git）

---

## 🚀 快速开始

### 步骤 1: 复制模板文件

```bash
# 后端
cd backend
cp .env.example .env

# 前端（如果需要）
cd frontend
cp .env.example .env
```

### 步骤 2: 修改 .env 文件

编辑 `backend/.env`，填入实际的配置：

```env
# 数据库密码
DB_PASSWORD=your_actual_password

# JWT 密钥（生成强密钥）
JWT_SECRET=生成的64位十六进制字符串
JWT_REFRESH_SECRET=生成的64位十六进制字符串
```

### 步骤 3: 生成强 JWT 密钥

```bash
# 使用 Node.js 生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 或使用 OpenSSL
openssl rand -base64 32
```

---

## 📝 环境变量说明

### 后端 (backend/.env)

#### 服务器配置
```env
NODE_ENV=development        # 环境：development | production
PORT=3000                   # 服务器端口
HOST=localhost              # 服务器主机
```

#### 数据库配置
```env
# 方式 1: 使用连接字符串（推荐用于生产环境）
DATABASE_URL=postgresql://user:password@host:port/database

# 方式 2: 单独配置（推荐用于开发环境）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=three_brothers_game
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false                # 本地开发：false，生产环境：true
```

#### JWT 配置
```env
JWT_SECRET=your_secret_key            # JWT 签名密钥
JWT_REFRESH_SECRET=your_refresh_key   # 刷新令牌密钥
JWT_EXPIRE=24h                        # Token 过期时间
JWT_REFRESH_EXPIRES_IN=30d            # 刷新令牌过期时间
```

#### CORS 配置
```env
CLIENT_URL=http://localhost:5173      # 前端 URL
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 前端 (frontend/.env)

```env
VITE_API_URL=http://localhost:3000    # 后端 API 地址
VITE_WS_URL=http://localhost:3000     # WebSocket 地址
```

---

## 🌍 不同环境的配置

### 本地开发环境

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/three_brothers_game
DB_SSL=false
CLIENT_URL=http://localhost:5173
LOG_LEVEL=debug
```

### Railway 生产环境

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Railway 自动提供
DB_SSL=true                              # 生产环境启用 SSL
CLIENT_URL=https://your-frontend.railway.app
LOG_LEVEL=info
```

---

## 🔄 团队协作流程

### 当你克隆项目时

```bash
# 1. 克隆仓库
git clone <repository-url>
cd three_game_new

# 2. 复制环境变量模板
cd backend
cp .env.example .env

# 3. 填写你的本地配置
# 编辑 .env 文件

# 4. 安装依赖
npm install

# 5. 启动项目
npm run dev
```

### 当你添加新的环境变量时

1. 在 `.env` 中添加新变量（用于你的本地开发）
2. 在 `.env.example` 中也添加该变量（用占位符代替真实值）
3. 提交 `.env.example` 的更改
4. 通知团队成员更新他们的 `.env` 文件

```bash
# 示例：添加新的 API 密钥
# 在 .env 中：
NEW_API_KEY=sk_live_abc123xyz789

# 在 .env.example 中：
NEW_API_KEY=your_api_key_here
```

---

## ⚠️ 常见错误

### 错误 1: 将 .env 提交到 Git

```bash
# ❌ 错误：不小心提交了 .env
git add .env
git commit -m "Update config"

# ✅ 正确：从 Git 中移除
git rm --cached .env
git commit -m "Remove .env from version control"
```

### 错误 2: .env 和 .env.example 不同步

**问题**: 添加了新变量但忘记更新 `.env.example`

**解决**:
```bash
# 对比两个文件
diff backend/.env backend/.env.example

# 确保 .env.example 包含所有必需的变量
```

### 错误 3: 生产环境使用开发配置

**问题**: 在 Railway 使用了本地的数据库 URL

**解决**: 在 Railway 控制台配置正确的环境变量，不要手动设置 `DATABASE_URL`（Railway 自动提供）

---

## 🛡️ 安全最佳实践

### 1. 永远不要

- ❌ 将 `.env` 提交到 Git
- ❌ 在代码中硬编码敏感信息
- ❌ 在 Slack/Discord 等聊天工具分享 `.env` 内容
- ❌ 截图包含 `.env` 内容的代码
- ❌ 使用弱密码或默认密钥

### 2. 总是要

- ✅ 使用 `.env.example` 作为模板
- ✅ 生成强随机密钥
- ✅ 定期轮换生产环境密钥
- ✅ 使用环境变量管理工具（Railway Variables、AWS Secrets Manager 等）
- ✅ 为不同环境使用不同的密钥

### 3. 生成强密钥

```bash
# 256 位随机密钥（推荐）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Base64 编码
openssl rand -base64 32

# UUID
node -e "console.log(require('crypto').randomUUID())"
```

---

## 📚 相关文档

- [Railway 环境变量配置](docs/RAILWAY_DEPLOYMENT.md#配置环境变量)
- [.gitignore 最佳实践](https://git-scm.com/docs/gitignore)
- [Twelve-Factor App - Config](https://12factor.net/config)

---

## 🆘 常见问题

### Q: 如果我不小心提交了 .env 怎么办？

**A**: 立即采取以下措施：

1. 从 Git 历史中删除：
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all
```

2. 强制推送：
```bash
git push origin --force --all
```

3. **立即更改所有密码和密钥！**

### Q: 团队成员如何获取 .env 配置？

**A**:
1. 通过安全渠道（加密通讯）分享
2. 使用密码管理工具（1Password、LastPass）
3. 使用环境变量管理服务
4. 或者让每个人自己配置本地数据库

### Q: 如何在 CI/CD 中使用环境变量？

**A**:
- GitHub Actions: 使用 Secrets
- GitLab CI: 使用 Variables
- Railway: 使用 Environment Variables
- 永远不要在 CI 配置文件中硬编码

---

**最后更新**: 2025-10-27
**维护者**: ECHO Game Team
