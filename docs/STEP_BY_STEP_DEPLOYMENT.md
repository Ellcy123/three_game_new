# Railway 部署完整操作步骤

## 前置检查清单

### ✅ 已完成的准备工作
- [x] Railway CLI 已安装
- [x] 后端项目已初始化
- [x] 本地数据库已测试成功
- [x] Railway 配置文件已创建（railway.json, nixpacks.toml）
- [x] 数据库初始化脚本已准备（scripts/init-railway-db.js）

### 📋 你需要准备的内容
- [ ] Railway 账号（使用 GitHub 登录）
- [ ] GitHub 账号
- [ ] 项目推送到 GitHub

---

## 第一步：创建 GitHub 仓库并推送代码

### 1.1 初始化 Git（如果还没有）

```bash
# 在项目根目录
cd c:\Users\admin\three_game_new

# 初始化 Git（如果还没有 .git 文件夹）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: ECHO game backend setup"
```

### 1.2 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 仓库名称：`three-brothers-game` 或你喜欢的名字
3. 设置为 **Private**（推荐）或 Public
4. **不要**勾选 "Add a README file"（因为本地已有）
5. 点击 **Create repository**

### 1.3 推送到 GitHub

```bash
# 添加远程仓库（替换为你的 GitHub 用户名）
git remote add origin https://github.com/你的用户名/three-brothers-game.git

# 推送代码
git branch -M main
git push -u origin main
```

---

## 第二步：在 Railway 上创建项目

### 2.1 登录 Railway

```bash
# 在终端执行
railway login
```

这会打开浏览器，使用 GitHub 账号登录 Railway。

### 2.2 创建新项目

**方法 A：使用 CLI（推荐）**

```bash
# 在项目根目录
cd c:\Users\admin\three_game_new

# 创建新项目
railway init

# 按照提示操作：
# 1. 选择 "Empty Project"
# 2. 输入项目名称：three-brothers-game
# 3. 选择环境：production
```

**方法 B：使用 Web 控制台**

1. 访问 https://railway.app/dashboard
2. 点击 **New Project**
3. 选择 **Deploy from GitHub repo**
4. 选择你刚创建的仓库
5. 点击 **Deploy Now**

---

## 第三步：添加 PostgreSQL 和 Redis

### 3.1 添加 PostgreSQL 数据库

**使用 CLI：**
```bash
railway add --database postgres
```

**使用 Web 控制台：**
1. 进入你的项目
2. 点击 **New Service**
3. 选择 **Database**
4. 选择 **PostgreSQL**
5. 点击 **Add PostgreSQL**

### 3.2 添加 Redis

**使用 CLI：**
```bash
railway add --database redis
```

**使用 Web 控制台：**
1. 点击 **New Service**
2. 选择 **Database**
3. 选择 **Redis**
4. 点击 **Add Redis**

---

## 第四步：配置环境变量

### 4.1 设置 JWT 密钥

我已经为你生成了强密钥：

```bash
railway variables set JWT_SECRET="OpJVOoYhN8gx5nErXSYeUKn44rPAhZO+7PqvJjjosKE="
railway variables set JWT_REFRESH_SECRET="1zDH2EPPwHn82u5xinlGY3aoxgvyddp6LDj2MO7hMWQ="
```

### 4.2 设置其他环境变量

```bash
# 设置生产环境
railway variables set NODE_ENV="production"

# 设置前端 URL（稍后部署前端后替换）
railway variables set CLIENT_URL="https://your-frontend.railway.app"

# 设置日志级别
railway variables set LOG_LEVEL="info"

# JWT 过期时间
railway variables set JWT_EXPIRE="24h"
railway variables set JWT_REFRESH_EXPIRES_IN="30d"
```

### 4.3 验证环境变量

```bash
# 查看所有环境变量
railway variables
```

Railway 会自动注入以下环境变量，**无需手动设置**：
- `DATABASE_URL`
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `REDIS_URL`

---

## 第五步：部署后端服务

### 5.1 链接到 Railway 项目

```bash
# 在项目根目录
cd c:\Users\admin\three_game_new

# 链接项目
railway link
```

选择你刚创建的项目。

### 5.2 部署后端

```bash
# 部署
railway up
```

这会：
1. 打包你的代码
2. 上传到 Railway
3. 自动构建（执行 `npm install && npm run build`）
4. 启动服务（执行 `npm start`）

### 5.3 查看部署日志

```bash
# 查看实时日志
railway logs
```

或者在 Web 控制台：
1. 进入项目 → Backend 服务
2. 点击 **Deployments** 标签
3. 查看最新部署的日志

---

## 第六步：初始化 Railway 数据库

### 方法 A：使用 Railway CLI（推荐）

```bash
# 确保在项目根目录
cd c:\Users\admin\three_game_new

# 执行数据库初始化
railway run npm run db:init:railway
```

**预期输出：**
```
=== Railway 数据库初始化开始 ===

📊 数据库连接配置：
   使用 DATABASE_URL: postgresql://****@****

🔌 正在连接数据库...
✅ 数据库连接成功！

📄 读取 SQL 文件...
✅ SQL 文件读取成功！

🚀 开始执行 SQL 语句...
✅ SQL 执行成功！

🔍 验证数据库表...

📊 已创建的表：
   ✅ users
   ✅ game_rooms
   ✅ room_players
   ✅ game_saves
   ✅ game_events
   ✅ chat_messages

✅ 所有预期的表都已成功创建！

📑 已创建索引数量: 39
⚡ 已创建触发器数量: 4
👁️ 已创建视图数量: 4

🧪 函数测试: generate_room_code() = ABC123

=== ✅ Railway 数据库初始化完成！ ===
```

### 方法 B：使用 Railway Shell

```bash
# 进入 Railway Shell
railway shell

# 在 Shell 中执行
cd /app
node scripts/init-railway-db.js

# 退出
exit
```

---

## 第七步：验证部署

### 7.1 获取部署 URL

```bash
# 获取部署的 URL
railway domain
```

或者在 Web 控制台：
1. 进入项目 → Backend 服务
2. 点击 **Settings** 标签
3. 查看 **Domains** 部分
4. 如果没有域名，点击 **Generate Domain**

### 7.2 测试健康检查接口

```bash
# 使用生成的域名（替换为你的实际域名）
curl https://your-app.railway.app/health
```

**预期响应：**
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T09:30:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### 7.3 检查日志

```bash
# 查看实时日志
railway logs --follow
```

应该看到类似的日志：
```
info: ✅ Socket.IO server initialized
info: 🚀 Server running on http://0.0.0.0:3000
info: 📝 Environment: production
info: 🎮 ECHO Game Backend is ready!
```

---

## 第八步：配置自定义域名（可选）

### 8.1 在 Railway 添加域名

```bash
railway domain add your-custom-domain.com
```

### 8.2 配置 DNS

1. 获取 Railway 提供的 CNAME 记录
2. 在你的域名提供商添加 CNAME 记录
3. 等待 DNS 传播（可能需要几分钟到几小时）

---

## 故障排查

### 问题 1：部署失败

**检查构建日志：**
```bash
railway logs
```

**常见原因：**
- TypeScript 编译错误
- 缺少依赖包
- `package.json` 配置错误

**解决方法：**
```bash
# 本地测试构建
cd backend
npm run build

# 如果成功，推送到 GitHub
git add .
git commit -m "Fix build issues"
git push

# Railway 会自动重新部署
```

### 问题 2：数据库连接失败

**检查环境变量：**
```bash
railway variables
```

**确保存在：**
- `DATABASE_URL`
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

**解决方法：**
如果没有这些变量，说明 PostgreSQL 插件没有正确添加：
```bash
railway add --database postgres
```

### 问题 3：JWT 认证失败

**检查 JWT_SECRET：**
```bash
railway variables | grep JWT
```

**如果没有，添加：**
```bash
railway variables set JWT_SECRET="OpJVOoYhN8gx5nErXSYeUKn44rPAhZO+7PqvJjjosKE="
railway variables set JWT_REFRESH_SECRET="1zDH2EPPwHn82u5xinlGY3aoxgvyddp6LDj2MO7hMWQ="
```

### 问题 4：CORS 错误

**更新 CLIENT_URL：**
```bash
# 替换为你的前端 URL
railway variables set CLIENT_URL="https://your-frontend.railway.app"
```

**或者允许多个源：**
```bash
railway variables set ALLOWED_ORIGINS="https://your-frontend.railway.app,https://custom-domain.com"
```

---

## 常用命令速查

```bash
# 查看日志
railway logs

# 实时日志
railway logs --follow

# 查看环境变量
railway variables

# 设置环境变量
railway variables set KEY="value"

# 删除环境变量
railway variables delete KEY

# 重启服务
railway restart

# 查看服务状态
railway status

# 打开 Web 控制台
railway open

# 进入 Shell
railway shell

# 执行命令
railway run <command>
```

---

## 下一步

### ✅ 后端部署完成后

1. **部署前端**
   - 创建前端项目
   - 配置 API 地址为后端 URL
   - 部署到 Railway 或 Vercel

2. **更新 CORS 配置**
   ```bash
   railway variables set CLIENT_URL="https://your-frontend-url"
   ```

3. **测试完整流程**
   - 用户注册
   - 用户登录
   - 创建房间
   - WebSocket 连接
   - 游戏功能

4. **监控和优化**
   - 设置日志监控
   - 配置错误追踪（如 Sentry）
   - 性能优化
   - 数据库查询优化

---

## 安全建议

### 生产环境必做

1. **使用强密钥**
   - ✅ JWT_SECRET 已设置为强随机密钥
   - ✅ 不要在代码中硬编码密钥

2. **限制 CORS**
   - ✅ 只允许信任的前端域名
   - ❌ 不要使用 `*` 作为允许的源

3. **启用 HTTPS**
   - ✅ Railway 自动提供 HTTPS
   - ✅ 确保前端也使用 HTTPS

4. **定期备份数据库**
   - 使用 Railway 的数据库备份功能
   - 或使用 `pg_dump` 定期导出

5. **监控日志**
   - 定期检查错误日志
   - 设置异常告警

---

## 成本估算

### Railway 免费额度

- **免费套餐**：$5/月
- **PostgreSQL**：约 $2-3/月（取决于使用量）
- **Redis**：约 $1-2/月（取决于使用量）

### 总计

- **总费用**：约 $8-10/月（超出免费额度部分）
- **免费额度后**：只需支付超出部分

---

## 总结

你现在已经：

1. ✅ 安装了 Railway CLI
2. ✅ 生成了强 JWT 密钥
3. ✅ 准备好了所有配置文件
4. ✅ 准备好了数据库初始化脚本

**下一步你需要做的：**

1. 创建 GitHub 仓库并推送代码
2. 在 Railway 创建项目
3. 添加 PostgreSQL 和 Redis
4. 设置环境变量
5. 部署后端
6. 初始化数据库
7. 验证部署

如果遇到任何问题，参考本文档的"故障排查"部分，或查看：
- [Railway 官方文档](https://docs.railway.app/)
- [项目 RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- [Railway 数据库初始化指南](./RAILWAY_DB_INIT_GUIDE.md)
