# ECHO Game Backend

ECHO游戏后端服务 - 文字交互式多人协作解谜游戏

## 技术栈

- **Node.js 20+** - JavaScript运行时
- **TypeScript 5+** - 类型安全的JavaScript
- **Express 4** - Web服务器框架
- **Socket.IO 4** - 实时双向通信
- **PostgreSQL** - 主数据库
- **Redis** - 缓存和实时状态
- **JWT** - 用户认证
- **Winston** - 日志系统

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库和Redis连接信息。

### 3. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## 可用命令

```bash
npm run dev          # 开发模式（自动重启）
npm run build        # 构建生产版本
npm start            # 运行生产版本
npm test             # 运行测试
npm run test:watch   # 监听模式运行测试
npm run test:coverage # 测试覆盖率
npm run lint         # 代码检查
npm run lint:fix     # 自动修复代码问题
npm run format       # 格式化代码
npm run typecheck    # TypeScript类型检查
```

## 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器
│   ├── services/        # 业务逻辑
│   │   ├── auth/       # 认证服务
│   │   ├── game/       # 游戏引擎
│   │   ├── room/       # 房间管理
│   │   └── level/      # 关卡逻辑
│   ├── socket/         # Socket.IO处理
│   │   ├── handlers/   # 事件处理器
│   │   └── middleware/ # Socket中间件
│   ├── routes/         # Express路由
│   ├── middleware/     # Express中间件
│   ├── models/         # 数据模型
│   ├── types/          # TypeScript类型
│   ├── utils/          # 工具函数
│   ├── data/           # 游戏数据配置
│   │   ├── events/     # 事件配置
│   │   ├── items/      # 道具配置
│   │   ├── characters/ # 角色配置
│   │   ├── dialogues/  # 对话文本
│   │   └── synonyms/   # 同义词映射
│   ├── app.ts          # Express应用
│   └── server.ts       # 服务器入口
├── tests/              # 测试文件
│   ├── unit/          # 单元测试
│   ├── integration/   # 集成测试
│   └── fixtures/      # 测试数据
├── logs/              # 日志文件
├── package.json
├── tsconfig.json
└── README.md
```

## API端点

### 健康检查

```
GET /health
```

返回服务器状态信息。

### API信息

```
GET /api
```

返回API版本和可用端点列表。

## Socket.IO事件

### 客户端 -> 服务器

- `ping` - 心跳检测
- `test` - 测试连接
- （待添加更多游戏事件）

### 服务器 -> 客户端

- `pong` - 心跳响应
- （待添加更多游戏事件）

## 开发指南

### 代码规范

- 使用TypeScript严格模式
- 遵循ESLint规则
- 使用Prettier格式化代码
- 提交前运行`npm run lint`和`npm test`

### 日志

使用Winston日志系统：

```typescript
import { logger } from './utils/logger';

logger.info('信息日志');
logger.warn('警告日志');
logger.error('错误日志', error);
```

日志文件位于 `logs/` 目录：
- `combined.log` - 所有日志
- `error.log` - 错误日志

### 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务器端口 | `3000` |
| `DATABASE_URL` | PostgreSQL连接URL | - |
| `REDIS_URL` | Redis连接URL | - |
| `JWT_SECRET` | JWT密钥 | - |
| `CLIENT_URL` | 前端URL | `http://localhost:5173` |
| `LOG_LEVEL` | 日志级别 | `info` |

详见 `.env.example` 文件。

## 部署

### Docker部署

```bash
# 构建镜像
docker build -t echo-game-backend .

# 运行容器
docker run -p 3000:3000 --env-file .env echo-game-backend
```

### 生产环境

1. 构建项目：
   ```bash
   npm run build
   ```

2. 设置环境变量（生产配置）

3. 启动服务：
   ```bash
   npm start
   ```

## 故障排查

### 连接不上数据库

检查 `DATABASE_URL` 是否正确配置，确保PostgreSQL服务正在运行。

### Socket.IO连接失败

检查 `ALLOWED_ORIGINS` 是否包含前端URL，确保CORS配置正确。

### 日志文件过大

日志文件会自动轮转，最多保留5个10MB的文件。

## 许可证

MIT

## 贡献

欢迎提交Issue和Pull Request！
