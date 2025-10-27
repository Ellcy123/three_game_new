# ECHO Game 后端启动指南

## 📋 前置要求

在启动服务器之前，请确保已安装：

- ✅ Node.js >= 18.0.0
- ✅ npm >= 9.0.0
- ✅ PostgreSQL >= 13
- ✅ Redis >= 6 (可选，但推荐)

## 🚀 快速启动

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并根据需要修改：

```bash
cp .env.example .env
```

关键配置项：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/three_brothers_game
# 或者
DB_HOST=localhost
DB_PORT=5432
DB_NAME=three_brothers_game
DB_USER=postgres
DB_PASSWORD=your_password

# Redis 配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 密钥（必须修改！）
JWT_SECRET=your_super_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
```

### 3. 初始化数据库

运行数据库初始化脚本：

```bash
# 方式 1: 使用 psql 命令
psql -U postgres -d three_brothers_game -f scripts/create-auth-tables.sql

# 方式 2: 使用 npm 脚本（如果已配置）
npm run db:init
```

### 4. 启动服务器

#### 开发模式（带热重载）

```bash
npm run dev
```

#### 生产模式

```bash
# 先编译
npm run build

# 然后启动
npm start
```

### 5. 验证服务器

服务器启动后，访问以下端点验证：

```bash
# 健康检查
curl http://localhost:3000/health

# API 信息
curl http://localhost:3000/api

# 测试注册（可选）
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 📁 项目结构

```
backend/
├── src/
│   ├── config/           # 配置文件
│   │   ├── database.ts   # PostgreSQL 连接
│   │   └── redis.ts      # Redis 连接
│   ├── controllers/      # 控制器
│   │   └── authController.ts
│   ├── middleware/       # 中间件
│   │   └── errorHandler.ts
│   ├── routes/           # 路由
│   │   └── authRoutes.ts
│   ├── services/         # 业务逻辑
│   ├── models/           # 数据模型
│   ├── types/            # TypeScript 类型
│   ├── utils/            # 工具函数
│   ├── socket/           # Socket.IO
│   ├── app.ts            # Express 应用配置
│   └── server.ts         # 服务器入口
├── scripts/              # 脚本文件
│   └── create-auth-tables.sql
├── package.json
├── tsconfig.json
└── .env
```

## 🔧 可用的 npm 脚本

```bash
# 开发
npm run dev              # 启动开发服务器（带热重载）

# 构建
npm run build            # 编译 TypeScript 到 JavaScript

# 生产
npm start                # 启动生产服务器

# 类型检查
npm run typecheck        # 运行 TypeScript 类型检查

# 代码质量
npm run lint             # 运行 ESLint
npm run lint:fix         # 自动修复 ESLint 错误
npm run format           # 运行 Prettier 格式化

# 测试
npm test                 # 运行测试
npm run test:watch       # 监听模式运行测试
npm run test:coverage    # 运行测试覆盖率

# 数据库
npm run db:init          # 初始化数据库
```

## 🌐 API 端点

### 健康检查

**GET** `/health`

返回服务器和依赖服务的健康状态。

### API 信息

**GET** `/api`

返回 API 版本和可用端点列表。

### 认证端点

**基础路径:** `/api/v1/auth`

- **POST** `/register` - 注册新用户
- **POST** `/login` - 用户登录
- **GET** `/verify` - 验证 Token
- **POST** `/logout` - 用户登出

详细的 API 文档请查看：[backend/src/controllers/README.md](src/controllers/README.md)

## 🔍 启动检查清单

启动服务器时，会自动进行以下检查：

- ✅ **加载环境变量** - 从 `.env` 文件读取配置
- ✅ **测试数据库连接** - 连接 PostgreSQL 并验证
- ✅ **连接 Redis** - 尝试连接 Redis（失败会警告但不中止）
- ✅ **创建 HTTP 服务器** - 创建 Express 服务器
- ✅ **初始化 Socket.IO** - 启动 WebSocket 服务
- ✅ **监听端口** - 开始接受请求

启动成功后，你会看到类似的输出：

```
========================================
  正在启动 ECHO Game 后端服务
========================================
环境: development
端口: 3000

📦 正在连接数据库...
✓ 数据库连接成功！
  - 当前时间: 2024-01-01T00:00:00.000Z
  - 数据库版本: PostgreSQL 14.0
  - 连接池状态: 总连接数=1, 空闲连接=1, 等待请求=0

🔴 正在连接 Redis...
✓ Redis 连接成功！

🌐 正在创建 HTTP 服务器...
🔌 正在初始化 Socket.IO...
✅ Socket.IO 初始化完成

========================================
  ✨ 服务器启动成功！
========================================
🚀 服务器地址: http://localhost:3000
📝 环境: development
🔗 API 端点: http://localhost:3000/api
❤️  健康检查: http://localhost:3000/health
🔐 认证 API: http://localhost:3000/api/v1/auth
========================================

💡 提示: 按 Ctrl+C 停止服务器
```

## ⚠️ 常见问题

### 问题 1: 数据库连接失败

**症状：** 服务器启动时报 "数据库连接失败"

**解决方案：**
1. 确保 PostgreSQL 服务正在运行
2. 检查 `.env` 中的数据库配置是否正确
3. 验证数据库是否已创建：`psql -U postgres -l`
4. 如果数据库不存在，创建它：
   ```bash
   createdb -U postgres three_brothers_game
   ```

### 问题 2: Redis 连接失败

**症状：** 看到 "Redis 连接失败" 警告

**解决方案：**
1. Redis 是可选的，服务器可以在无缓存模式下运行
2. 如果需要 Redis，确保 Redis 服务正在运行
3. 检查 `.env` 中的 Redis 配置
4. 启动 Redis：
   ```bash
   # Windows (需要先安装 Redis)
   redis-server

   # Linux/Mac
   redis-server
   ```

### 问题 3: 端口已被占用

**症状：** "Error: listen EADDRINUSE: address already in use :::3000"

**解决方案：**
1. 修改 `.env` 中的 `PORT` 配置
2. 或者终止占用端口的进程：
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # Linux/Mac
   lsof -ti:3000 | xargs kill -9
   ```

### 问题 4: TypeScript 编译错误

**症状：** 运行 `npm run build` 时出现类型错误

**解决方案：**
1. 运行类型检查查看详细错误：`npm run typecheck`
2. 确保所有依赖已正确安装：`npm install`
3. 清除构建缓存：`rm -rf dist node_modules && npm install`

### 问题 5: 认证失败

**症状：** 注册或登录时收到错误

**解决方案：**
1. 确保数据库表已创建：运行 `scripts/create-auth-tables.sql`
2. 检查 JWT 密钥是否已配置在 `.env` 中
3. 查看服务器日志获取详细错误信息

## 🔒 安全提示

在生产环境部署前，请确保：

- ✅ 修改所有默认密钥（`JWT_SECRET`, `JWT_REFRESH_SECRET`）
- ✅ 使用强密码保护数据库
- ✅ 启用 HTTPS
- ✅ 配置防火墙规则
- ✅ 设置 `NODE_ENV=production`
- ✅ 限制 CORS 允许的源
- ✅ 配置适当的限流规则

## 📚 更多文档

- [控制器文档](src/controllers/README.md) - API 端点详细说明
- [数据库配置](src/config/README.md) - 数据库和 Redis 配置指南
- [项目 README](../README.md) - 项目整体说明

## 🆘 获取帮助

如果遇到问题：

1. 查看服务器日志获取详细错误信息
2. 检查 [常见问题](#常见问题) 部分
3. 查阅相关文档
4. 在项目仓库提交 issue

## 🎉 下一步

服务器成功启动后，你可以：

1. 使用 Postman 或 curl 测试 API
2. 开发前端应用并连接到后端
3. 添加更多的 API 端点
4. 配置生产环境部署
5. 设置 CI/CD 流程

祝你开发愉快！🚀
