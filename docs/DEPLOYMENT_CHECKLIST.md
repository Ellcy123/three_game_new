# Railway 部署检查清单

> 确保所有步骤都已完成，避免部署问题

---

## 📋 部署前检查

### ✅ 代码准备

- [ ] 所有代码已提交到Git
- [ ] package.json中的脚本配置正确
  - [ ] `"build": "tsc"`
  - [ ] `"start": "node dist/server.js"`
  - [ ] `"db:init": "node scripts/init-database.js"`
- [ ] .gitignore包含必要的忽略项
  - [ ] `node_modules/`
  - [ ] `.env`
  - [ ] `dist/`
  - [ ] `logs/`
- [ ] 代码已推送到GitHub主分支

### ✅ 配置文件

- [ ] `backend/railway.json` 已创建
- [ ] `backend/nixpacks.toml` 已创建
- [ ] `backend/.dockerignore` 已创建
- [ ] `backend/.env.production.example` 已创建（参考用）

### ✅ 数据库脚本

- [ ] `backend/database/migrations/001_initial_schema.sql` 存在
- [ ] `backend/scripts/init-database.js` 存在
- [ ] 本地数据库初始化测试通过

---

## 📋 Railway设置检查

### ✅ 账号设置

- [ ] Railway账号已注册
- [ ] GitHub账号已关联
- [ ] 支付方式已添加（用于验证）
- [ ] 免费额度已激活

### ✅ 项目创建

- [ ] Railway项目已创建
- [ ] GitHub仓库已连接
- [ ] 项目名称已设置

---

## 📋 服务部署检查

### ✅ 后端服务

- [ ] 服务已创建
- [ ] Root Directory设置为 `backend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] 服务状态显示 "Active"
- [ ] 构建日志无错误
- [ ] 服务URL已生成

### ✅ PostgreSQL数据库

- [ ] PostgreSQL服务已添加
- [ ] 服务状态显示 "Active"
- [ ] DATABASE_URL已自动生成
- [ ] 以下环境变量已自动注入：
  - [ ] PGHOST
  - [ ] PGPORT
  - [ ] PGUSER
  - [ ] PGPASSWORD
  - [ ] PGDATABASE

### ✅ Redis缓存

- [ ] Redis服务已添加
- [ ] 服务状态显示 "Active"
- [ ] REDIS_URL已自动生成

---

## 📋 环境变量检查

### ✅ 必需变量

在后端服务的 Variables 中：

**基础配置**:
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `HOST=0.0.0.0`

**数据库别名**:
- [ ] `DB_HOST=${{PGHOST}}`
- [ ] `DB_PORT=${{PGPORT}}`
- [ ] `DB_USER=${{PGUSER}}`
- [ ] `DB_PASSWORD=${{PGPASSWORD}}`
- [ ] `DB_NAME=${{PGDATABASE}}`

**Redis别名**:
- [ ] `REDIS_HOST=${{REDIS_URL}}`

**JWT密钥**（⚠️ 必须是强密钥）:
- [ ] `JWT_SECRET` 已设置（至少32字符随机字符串）
- [ ] `JWT_REFRESH_SECRET` 已设置
- [ ] `JWT_EXPIRE=24h`

**CORS配置**:
- [ ] `CLIENT_URL` 已设置为实际前端URL
- [ ] `ALLOWED_ORIGINS` 已设置

### ✅ 可选变量

- [ ] `SOCKET_PING_TIMEOUT=60000`
- [ ] `SOCKET_PING_INTERVAL=25000`
- [ ] `LOG_LEVEL=info`
- [ ] `ROOM_MAX_PLAYERS=3`

---

## 📋 数据库初始化检查

### ✅ 方法1: Railway CLI

- [ ] Railway CLI已安装
- [ ] 已登录Railway账号
- [ ] 已连接到正确的项目
- [ ] 执行 `railway run npm run db:init`
- [ ] 看到成功消息：
  ```
  ✓ 成功创建数据库
  ✓ SQL脚本执行成功
  已创建的表: 6
  🎉 数据库初始化完成!
  ```

### ✅ 方法2: Web控制台

- [ ] 已打开PostgreSQL服务
- [ ] 点击 "Connect" → "Query"
- [ ] 复制粘贴SQL脚本内容
- [ ] 执行成功，无错误

### ✅ 验证数据库

- [ ] 使用 `railway connect postgres` 连接
- [ ] 执行 `\dt` 查看表
- [ ] 确认6个表都已创建：
  - [ ] users
  - [ ] game_rooms
  - [ ] room_players
  - [ ] game_saves
  - [ ] game_events
  - [ ] chat_messages

---

## 📋 部署验证检查

### ✅ 服务健康检查

**后端服务**:
```bash
curl https://你的后端URL.up.railway.app/health
```

- [ ] 返回状态码 200
- [ ] 返回JSON包含 `"status":"ok"`
- [ ] `environment` 字段显示 `production`

**API测试**:
```bash
curl https://你的后端URL.up.railway.app/api
```

- [ ] 返回API信息
- [ ] 包含版本号和端点列表

### ✅ 日志检查

在Railway控制台查看日志：

- [ ] 看到 "Server running on..." 消息
- [ ] 看到 "Database connected successfully"
- [ ] 看到 "Socket.IO server initialized"
- [ ] 没有错误或警告

### ✅ 数据库连接

- [ ] 日志显示数据库连接成功
- [ ] 没有 "ECONNREFUSED" 错误
- [ ] 没有认证失败错误

### ✅ Redis连接

- [ ] Redis连接成功（如果有相关日志）
- [ ] 没有连接超时错误

---

## 📋 前端部署检查（可选）

### ✅ 前端服务

如果部署前端：

- [ ] 前端服务已创建
- [ ] Root Directory设置为 `frontend`
- [ ] 环境变量已配置：
  - [ ] `VITE_API_URL` 指向后端URL
  - [ ] `VITE_WS_URL` 指向后端URL
- [ ] 服务状态显示 "Active"
- [ ] 前端页面可访问

### ✅ 前后端连接

- [ ] 前端可以成功调用后端API
- [ ] WebSocket连接成功
- [ ] CORS配置正确，无跨域错误

---

## 📋 性能和监控检查

### ✅ 资源使用

在Railway Metrics中查看：

- [ ] CPU使用率 < 50%
- [ ] 内存使用率 < 80%
- [ ] 响应时间 < 500ms
- [ ] 无频繁重启

### ✅ 告警设置

- [ ] 服务崩溃告警已配置
- [ ] 资源使用告警已配置
- [ ] 部署失败通知已配置

---

## 📋 安全检查

### ✅ 环境变量安全

- [ ] JWT密钥是强随机字符串（不是示例值）
- [ ] 没有在代码中硬编码密钥
- [ ] .env文件在.gitignore中
- [ ] 生产环境不使用测试密码

### ✅ HTTPS/SSL

- [ ] Railway自动提供HTTPS（无需配置）
- [ ] 所有URL使用https://协议
- [ ] WebSocket使用wss://协议

### ✅ CORS配置

- [ ] ALLOWED_ORIGINS只包含授权的域名
- [ ] 不使用通配符 "*"（生产环境）
- [ ] credentials设置正确

---

## 📋 备份和恢复检查

### ✅ 数据库备份

- [ ] 了解如何备份数据库：
  ```bash
  railway connect postgres
  pg_dump ... > backup.sql
  ```
- [ ] 测试过备份流程
- [ ] 知道如何恢复数据

### ✅ 回滚计划

- [ ] 了解Railway的回滚功能
- [ ] 知道如何查看部署历史
- [ ] 可以快速回滚到上一个版本

---

## 📋 文档和维护检查

### ✅ 文档完整性

- [ ] 部署步骤已文档化
- [ ] 环境变量已记录
- [ ] 故障排查指南已准备
- [ ] 团队成员了解部署流程

### ✅ 监控计划

- [ ] 设置了日志监控
- [ ] 设置了性能监控
- [ ] 设置了错误追踪
- [ ] 定期检查服务健康状态

---

## 📋 成本和计费检查

### ✅ 账单管理

- [ ] 了解当前使用量
- [ ] 了解免费额度限制（$5/月）
- [ ] 设置了用量告警
- [ ] 了解超出免费额度后的收费标准

### ✅ 优化建议

- [ ] 考虑是否需要所有服务24/7运行
- [ ] 评估是否可以使用休眠策略
- [ ] 检查是否有资源浪费

---

## 📋 最终确认

### ✅ 全面测试

- [ ] 用户注册功能测试
- [ ] 用户登录功能测试
- [ ] 房间创建功能测试
- [ ] 游戏流程测试
- [ ] WebSocket实时通信测试
- [ ] 数据持久化测试

### ✅ 用户体验

- [ ] 页面加载速度可接受
- [ ] API响应时间正常
- [ ] 没有明显的错误或崩溃
- [ ] 移动端适配良好（如适用）

### ✅ 生产就绪

- [ ] 所有测试通过
- [ ] 性能满足要求
- [ ] 安全配置正确
- [ ] 监控和告警就绪
- [ ] 团队培训完成

---

## 🎉 部署完成！

**当所有检查项都完成后，你的ECHO游戏就可以正式上线了！**

### 下一步行动：

1. **公告上线** - 通知用户和团队
2. **持续监控** - 密切关注前几天的运行状况
3. **收集反馈** - 记录用户反馈和问题
4. **迭代改进** - 根据反馈持续优化

---

## 📞 支持资源

- **Railway文档**: https://docs.railway.app/
- **Railway Discord**: https://discord.gg/railway
- **项目文档**:
  - [完整部署指南](RAILWAY_DEPLOYMENT.md)
  - [快速指南](RAILWAY_QUICKSTART.md)
  - [故障排查](RAILWAY_DEPLOYMENT.md#故障排查)

---

**检查清单版本**: v1.0
**最后更新**: 2025-10-27
**适用项目**: ECHO Game
**部署平台**: Railway
