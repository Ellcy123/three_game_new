# Railway 数据库初始化操作指南

## 方案概述

我为你准备了 **3种方法** 来初始化 Railway 数据库，你可以选择最方便的一种。

---

## 方法 1：使用 Railway CLI（最简单，推荐）

### 前提条件
- 已安装 Railway CLI
- 已登录 Railway 账号
- 项目已部署到 Railway

### 操作步骤

1. **在本地项目根目录打开终端**

2. **链接到 Railway 项目**
   ```bash
   railway link
   ```
   选择你的项目和环境（通常是 production）

3. **执行数据库初始化脚本**
   ```bash
   railway run npm run db:init:railway
   ```

   这个命令会：
   - 自动使用 Railway 的数据库环境变量
   - 连接到 Railway PostgreSQL 数据库
   - 执行 SQL 脚本创建所有表
   - 验证表、索引、触发器、视图是否创建成功

4. **查看输出，确认初始化成功**

   你应该看到类似这样的输出：
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

---

## 方法 2：在 Railway 控制台执行（无需安装 CLI）

### 操作步骤

1. **登录 Railway 控制台**
   - 访问 https://railway.app/
   - 进入你的项目

2. **进入后端服务**
   - 点击你的后端服务（backend）
   - 切换到 **Settings** 标签

3. **添加一次性部署命令**
   - 找到 **Custom Start Command** 或 **Build & Deploy** 部分
   - 临时修改 Start Command 为：
     ```
     node scripts/init-railway-db.js && npm start
     ```

4. **触发重新部署**
   - 点击 **Deploy** 按钮
   - 或者手动触发一次部署

5. **查看日志**
   - 切换到 **Deployments** 标签
   - 点击最新的部署
   - 查看 **Build Logs** 或 **Deploy Logs**
   - 确认看到 "✅ Railway 数据库初始化完成！"

6. **恢复启动命令**
   - 初始化完成后，将 Start Command 改回：
     ```
     npm start
     ```
   - 再次部署

### 优点
- 不需要安装任何工具
- 完全在浏览器中操作
- 使用 Railway 内部网络，连接更快

### 缺点
- 需要重新部署两次（初始化前后）
- 无法在本地查看详细日志

---

## 方法 3：使用 Railway Shell（适合高级用户）

### 操作步骤

1. **安装 Railway CLI**（如果还没安装）
   ```bash
   npm install -g @railway/cli
   ```

2. **登录并链接项目**
   ```bash
   railway login
   railway link
   ```

3. **打开 Railway Shell**
   ```bash
   railway shell
   ```

4. **在 Shell 中执行初始化**
   ```bash
   cd /app
   node scripts/init-railway-db.js
   ```

5. **退出 Shell**
   ```bash
   exit
   ```

---

## 验证数据库初始化

### 使用 psql 验证（如果本地安装了 psql）

1. **获取数据库连接信息**
   ```bash
   railway variables
   ```
   记下 `DATABASE_URL`

2. **连接到数据库**
   ```bash
   psql "你的DATABASE_URL"
   ```

3. **检查表**
   ```sql
   \dt
   ```

   应该看到 6 个表：
   - users
   - game_rooms
   - room_players
   - game_saves
   - game_events
   - chat_messages

4. **检查索引**
   ```sql
   \di
   ```

5. **测试函数**
   ```sql
   SELECT generate_room_code();
   ```

---

## 常见问题

### Q1: 如果初始化失败怎么办？

**A:** 检查以下几点：

1. **数据库连接问题**
   - 确认 Railway PostgreSQL 插件已添加
   - 检查环境变量 `DATABASE_URL` 是否存在
   - 查看 Railway 日志中的错误信息

2. **SQL 语法错误**
   - 通常不会出现，因为 SQL 文件已经在本地测试过
   - 如果出现，检查 Railway PostgreSQL 版本是否兼容

3. **权限问题**
   - Railway 自动创建的数据库用户应该有完整权限
   - 如果报权限错误，联系 Railway 支持

### Q2: 可以多次执行初始化吗？

**A:** 不建议。

- SQL 脚本使用 `CREATE TABLE` 而不是 `CREATE TABLE IF NOT EXISTS`
- 重复执行会报错："relation already exists"
- 如果需要重新初始化：
  1. 在 Railway 控制台删除所有表
  2. 或者直接删除 PostgreSQL 插件，重新添加

### Q3: 初始化需要多长时间？

**A:** 通常 **10-30 秒**

- 取决于 Railway 服务器响应速度
- 创建 6 个表 + 39 个索引 + 4 个触发器 + 4 个视图
- 如果超过 1 分钟还没完成，可能是网络问题

### Q4: JWT_SECRET 需要手动设置吗？

**A:** 建议手动设置，即使是内部项目。

**为什么？**
- 安全习惯很重要
- 防止代码意外泄露
- Railway 重启服务时不会丢失 session

**如何生成强密钥？**
```bash
# 方法 1：使用 openssl
openssl rand -base64 32

# 方法 2：使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3：使用在线工具
# https://generate-secret.vercel.app/32
```

**在 Railway 中设置：**
1. 进入项目 → Backend 服务
2. 点击 **Variables** 标签
3. 添加新变量：
   - Name: `JWT_SECRET`
   - Value: 生成的随机字符串
4. 保存并重新部署

---

## 脚本说明

### 脚本位置
```
backend/scripts/init-railway-db.js
```

### 脚本功能
1. 自动检测 Railway 环境变量（`DATABASE_URL`）
2. 连接到 PostgreSQL 数据库（支持 SSL）
3. 读取并执行 `001_initial_schema.sql`
4. 验证所有表、索引、触发器、视图是否创建成功
5. 测试自定义函数 `generate_room_code()`
6. 输出彩色日志，方便调试

### NPM 脚本
```bash
# 本地数据库初始化（连接本地 PostgreSQL）
npm run db:init

# Railway 数据库初始化（连接 Railway PostgreSQL）
npm run db:init:railway
```

---

## 推荐流程

### 对于第一次部署

1. **本地测试**
   ```bash
   npm run db:init
   ```
   确保 SQL 脚本没有问题

2. **推送到 GitHub**
   ```bash
   git add .
   git commit -m "Add Railway database initialization script"
   git push
   ```

3. **在 Railway 部署**
   - Railway 自动检测到新提交并部署
   - 等待部署完成

4. **初始化 Railway 数据库**
   ```bash
   railway link
   railway run npm run db:init:railway
   ```

5. **验证**
   - 访问你的后端健康检查接口：`https://your-app.railway.app/health`
   - 应该返回 200 状态

---

## 安全建议

### 生产环境必须设置的环境变量

```env
# 必须设置
JWT_SECRET=生成的强随机密钥
NODE_ENV=production

# Railway 自动注入，无需手动设置
DATABASE_URL=...
REDIS_URL=...

# 根据需要设置
CLIENT_URL=https://your-frontend-app.railway.app
LOG_LEVEL=info
```

### 不要在代码中硬编码的内容
- ❌ 数据库密码
- ❌ JWT 密钥
- ❌ API 密钥
- ❌ 第三方服务凭证

### 使用 .env.production.example
- ✅ 提交到 Git 作为模板
- ✅ 真实的 `.env` 文件应该在 `.gitignore` 中
- ✅ 团队成员可以复制模板并填入真实值

---

## 总结

**推荐使用方法 1（Railway CLI）**，因为：
- ✅ 操作简单，一条命令完成
- ✅ 可以在本地看到详细日志
- ✅ 不需要修改部署配置
- ✅ 可以随时重复执行（如果需要）

**JWT_SECRET 建议设置**，因为：
- ✅ 安全最佳实践
- ✅ 只需要一个随机字符串
- ✅ 防止未来的安全隐患

如有任何问题，请参考：
- [Railway 官方文档](https://docs.railway.app/)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- 项目的 `docs/RAILWAY_DEPLOYMENT.md`
