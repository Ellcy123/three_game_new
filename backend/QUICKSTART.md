# 后端快速启动指南

## 1️⃣ 前置准备

在开始之前，请确保已安装：

- ✅ Node.js 18+ 和 npm
- ✅ PostgreSQL 16+（数据库）
- ✅ Redis 7+（缓存）

## 2️⃣ 安装步骤

### 步骤 1: 安装依赖

```bash
cd backend
npm install
```

### 步骤 2: 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，修改以下关键配置：

```env
# 数据库配置（修改为你的实际配置）
DATABASE_URL=postgresql://你的用户名:你的密码@localhost:5432/echo_game

# Redis配置
REDIS_URL=redis://localhost:6379

# JWT密钥（生产环境请使用强密码）
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# 前端地址（如果前端在不同端口）
CLIENT_URL=http://localhost:5173
```

### 步骤 3: 创建数据库

使用PostgreSQL客户端或命令行创建数据库：

```bash
# 方法1: 使用psql命令行
psql -U postgres
CREATE DATABASE echo_game;
\q

# 方法2: 使用pgAdmin图形界面
# 右键 Databases -> Create -> Database
# 输入数据库名: echo_game
```

### 步骤 4: 启动开发服务器

```bash
npm run dev
```

看到以下输出表示启动成功：

```
🚀 Server running on http://localhost:3000
📝 Environment: development
🎮 ECHO Game Backend is ready!
✅ Socket.IO server initialized
```

## 3️⃣ 测试服务器

### 方法1: 浏览器访问

打开浏览器访问：

```
http://localhost:3000/health
```

应该看到：

```json
{
  "status": "ok",
  "timestamp": "2025-10-27T...",
  "uptime": 1.234,
  "environment": "development"
}
```

### 方法2: 命令行测试

```bash
# 健康检查
curl http://localhost:3000/health

# API信息
curl http://localhost:3000/api
```

### 方法3: 测试Socket.IO

可以使用前端客户端或Socket.IO测试工具连接到：

```
ws://localhost:3000
```

## 4️⃣ 常用命令

```bash
# 开发模式（自动重启）
npm run dev

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 运行测试
npm test

# 格式化代码
npm run format
```

## 5️⃣ 故障排查

### 问题1: 端口已被占用

**错误信息**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决方案**:

```bash
# Windows - 查找占用端口的进程
netstat -ano | findstr :3000

# 杀死进程（替换<PID>为实际进程ID）
taskkill /PID <PID> /F

# 或者修改 .env 中的 PORT 为其他端口
PORT=3001
```

### 问题2: 无法连接数据库

**错误信息**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**解决方案**:

1. 确认PostgreSQL服务正在运行：

   ```bash
   # Windows
   services.msc  # 查找PostgreSQL服务

   # 或使用命令行
   pg_ctl status
   ```

2. 检查 `.env` 中的 `DATABASE_URL` 是否正确

3. 测试数据库连接：

   ```bash
   psql -U postgres -h localhost -p 5432
   ```

### 问题3: 无法连接Redis

**错误信息**: `Error: Redis connection to localhost:6379 failed`

**解决方案**:

1. 确认Redis服务正在运行：

   ```bash
   # Windows - 启动Redis
   redis-server

   # 测试连接
   redis-cli ping
   # 应该返回: PONG
   ```

2. 检查 `.env` 中的 `REDIS_URL` 是否正确

### 问题4: TypeScript编译错误

**错误信息**: `Cannot find module ...`

**解决方案**:

```bash
# 清理并重新安装依赖
rm -rf node_modules
npm install

# 重新构建
npm run build
```

## 6️⃣ 开发技巧

### 查看日志

日志文件位于 `backend/logs/` 目录：

```bash
# 查看所有日志
tail -f logs/combined.log

# 只查看错误日志
tail -f logs/error.log
```

### 热重载

开发模式下使用 `tsx watch`，修改代码后会自动重启服务器。

### 调试

在VSCode中按 `F5` 启动调试，或者添加 `launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/server.ts",
      "runtimeArgs": ["-r", "tsx"],
      "envFile": "${workspaceFolder}/backend/.env"
    }
  ]
}
```

## 7️⃣ 下一步

后端服务启动成功后，可以：

1. 📖 查看完整文档：[README.md](README.md)
2. 🎮 启动前端项目（参考前端README）
3. 🧪 运行测试：`npm test`
4. 📝 查看实现计划：`docs/implementation-plan.md`

## 需要帮助？

- 📚 查看项目文档：`docs/` 目录
- 🐛 提交Issue：GitHub Issues
- 💬 联系开发者

---

祝开发顺利！ 🎉
