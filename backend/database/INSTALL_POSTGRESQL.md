# PostgreSQL 安装和配置指南

## ❌ 当前问题

数据库初始化失败，错误信息：
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**原因**: PostgreSQL服务未运行或未安装

---

## 🚀 解决方案

### 方案1：安装 PostgreSQL（推荐）

#### Windows 安装步骤：

1. **下载 PostgreSQL**
   - 访问：https://www.postgresql.org/download/windows/
   - 或直接下载：https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - 选择版本：PostgreSQL 16.x（最新稳定版）

2. **运行安装程序**
   - 双击下载的 `.exe` 文件
   - 按照安装向导操作

3. **安装配置**
   - **端口**: 5432（默认，保持不变）
   - **密码**: 设置 postgres 用户的密码（建议使用 `postgres123`，与.env中的密码一致）
   - **组件**: 全部勾选（包括 pgAdmin 4）
   - **数据目录**: 使用默认路径

4. **完成安装**
   - 等待安装完成（可能需要几分钟）
   - 勾选 "Stack Builder"（可选，用于安装额外工具）

#### 验证安装：

```bash
# 方法1: 使用Windows服务管理器
# 按 Win + R，输入 services.msc
# 查找 "postgresql-x64-16" 服务，确保状态为"正在运行"

# 方法2: 使用命令行
psql --version
# 应该输出: psql (PostgreSQL) 16.x
```

---

### 方案2：使用 Docker（推荐给开发者）

如果你已经安装了Docker，可以快速启动PostgreSQL：

```bash
# 启动PostgreSQL容器
docker run --name postgres-echo-game ^
  -e POSTGRES_PASSWORD=postgres123 ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_DB=three_brothers_game ^
  -p 5432:5432 ^
  -d postgres:16-alpine

# 验证容器是否运行
docker ps

# 查看日志
docker logs postgres-echo-game
```

**优点**:
- ✅ 快速启动，无需安装
- ✅ 隔离环境，不影响系统
- ✅ 方便清理和重置

**停止容器**:
```bash
docker stop postgres-echo-game
```

**重新启动容器**:
```bash
docker start postgres-echo-game
```

**完全删除**:
```bash
docker stop postgres-echo-game
docker rm postgres-echo-game
```

---

### 方案3：使用云数据库（生产环境）

**免费云数据库选项**:

1. **ElephantSQL** (https://www.elephantsql.com/)
   - 免费20MB存储
   - 适合测试和小型项目

2. **Supabase** (https://supabase.com/)
   - 免费500MB存储
   - 包含实时功能和认证

3. **Railway** (https://railway.app/)
   - 免费$5/月额度
   - 简单易用

**配置步骤**:
1. 注册账号并创建数据库
2. 获取连接URL（类似：`postgresql://user:pass@host:5432/dbname`）
3. 更新 `.env` 文件中的 `DATABASE_URL`

---

## ✅ 安装后步骤

### 1. 启动 PostgreSQL 服务

#### Windows (方法1 - 服务管理器):
```
1. 按 Win + R
2. 输入 services.msc
3. 找到 "postgresql-x64-16"
4. 右键 -> 启动
```

#### Windows (方法2 - 命令行):
```bash
# 使用管理员权限打开PowerShell
net start postgresql-x64-16
```

### 2. 测试连接

```bash
# 使用psql连接
psql -U postgres -h localhost

# 输入密码（你在安装时设置的密码）
# 成功连接后会看到：
# postgres=#
```

### 3. 运行数据库初始化

```bash
cd backend
npm run db:init
```

**预期输出**:
```
====================================
  ECHO 游戏数据库初始化
====================================

步骤 1/4: 连接到 PostgreSQL...
✓ 成功连接到 PostgreSQL

步骤 2/4: 创建数据库...
✓ 成功创建数据库 "three_brothers_game"

步骤 3/4: 执行初始化脚本...
✓ 成功连接到数据库
✓ 读取SQL文件: 001_initial_schema.sql
  执行中...
✓ SQL脚本执行成功

步骤 4/4: 验证表结构...

已创建的表:
  ✓ users
  ✓ game_rooms
  ✓ room_players
  ✓ game_saves
  ✓ game_events
  ✓ chat_messages

已创建的索引: 28 个
已创建的触发器: 4 个
已创建的视图: 2 个

测试函数:
  ✓ generate_room_code(): ABC2K7

====================================
  🎉 数据库初始化完成!
====================================
```

---

## 🔧 故障排查

### 问题1: 端口已被占用

**错误信息**: `Port 5432 is already in use`

**解决方法**:
```bash
# 查找占用5432端口的进程
netstat -ano | findstr :5432

# 杀死进程（替换PID为实际进程ID）
taskkill /PID <PID> /F
```

### 问题2: 密码认证失败

**错误信息**: `password authentication failed for user "postgres"`

**解决方法**:
1. 确认密码是否正确
2. 检查 `.env` 文件中的 `DB_PASSWORD`
3. 重置PostgreSQL密码：
   ```bash
   # 使用psql连接（可能需要Windows身份验证）
   psql -U postgres

   # 修改密码
   ALTER USER postgres PASSWORD 'postgres123';
   ```

### 问题3: 数据库已存在

**错误信息**: `database "three_brothers_game" already exists`

**这不是错误！** 脚本会跳过创建，直接执行表结构创建。

**如果需要重新创建**:
```bash
# 删除数据库
psql -U postgres -c "DROP DATABASE three_brothers_game;"

# 重新运行初始化
npm run db:init
```

### 问题4: 权限不足

**错误信息**: `permission denied to create database`

**解决方法**:
```sql
-- 使用超级用户连接
psql -U postgres

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE three_brothers_game TO postgres;
```

---

## 📊 验证数据库

### 使用 psql 命令行

```bash
# 连接到数据库
psql -U postgres -d three_brothers_game

# 查看所有表
\dt

# 查看表结构
\d users

# 查看索引
\di

# 退出
\q
```

### 使用 pgAdmin 4（图形界面）

1. 打开 pgAdmin 4（安装PostgreSQL时一起安装的）
2. 连接到 localhost
3. 展开 Databases -> three_brothers_game
4. 查看 Schemas -> public -> Tables

### 使用 Node.js 测试

创建测试脚本：
```javascript
// test-db-connection.js
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

client.connect()
  .then(() => {
    console.log('✅ 数据库连接成功!');
    return client.query('SELECT COUNT(*) FROM users');
  })
  .then(result => {
    console.log(`用户数量: ${result.rows[0].count}`);
    client.end();
  })
  .catch(err => {
    console.error('❌ 连接失败:', err);
    client.end();
  });
```

运行测试：
```bash
node test-db-connection.js
```

---

## 🎯 快速参考

### 常用命令

```bash
# 启动PostgreSQL服务
net start postgresql-x64-16

# 停止PostgreSQL服务
net stop postgresql-x64-16

# 连接数据库
psql -U postgres -d three_brothers_game

# 初始化数据库
npm run db:init

# 备份数据库
pg_dump -U postgres three_brothers_game > backup.sql

# 恢复数据库
psql -U postgres three_brothers_game < backup.sql
```

### 环境变量配置

`.env` 文件中的数据库配置：
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=three_brothers_game
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/three_brothers_game
```

---

## 📚 推荐资源

- **PostgreSQL官方文档**: https://www.postgresql.org/docs/
- **pgAdmin文档**: https://www.pgadmin.org/docs/
- **PostgreSQL教程**: https://www.postgresqltutorial.com/

---

## 💡 下一步

数据库安装和初始化完成后：

1. ✅ 验证数据库连接
2. ✅ 运行 `npm run db:init` 初始化表结构
3. ✅ 开始后端API开发
4. ✅ 实现用户认证系统

---

**最后更新**: 2025-10-27
**PostgreSQL版本**: 16.x
**适用系统**: Windows 10/11
