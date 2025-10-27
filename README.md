# ECHO - 文字交互式多人协作解谜游戏

> 一款关于宠物死后世界的温情TRPG风格游戏

## 🎮 游戏简介

ECHO是一款创新的文字交互式多人在线协作解谜游戏。3名玩家分别扮演猫、狗、龟三种角色，通过输入"道具A+道具B"或"角色+道具"的组合来触发事件，共同探索宠物死后的世界，揭开关于"ECHO"（回响）的温情故事。

### 核心特色

- 🎭 **三角色协作** - 猫、狗、龟各具特殊能力
- 🔤 **关键词解谜** - 60+道具组合等待发现
- 🌐 **实时多人** - WebSocket实时同步，断线重连
- 📖 **线性叙事** - 密室→藏匿→回忆→修炼→BOSS战→结局
- 💔 **情感共鸣** - 关于生命、陪伴与告别的故事

## 📁 项目结构

```
three_game_new/
├── docs/                          # 📚 项目文档
│   ├── game-design.md            # 游戏设计文档
│   ├── level-01.md               # 第一关详细设计
│   ├── sever.md                  # 服务器架构设计
│   └── implementation-plan.md    # 完整实现计划
│
├── backend/                       # 🔧 后端服务
│   ├── src/                      # 源代码
│   │   ├── config/              # 配置
│   │   ├── services/            # 业务逻辑
│   │   │   ├── game/           # 游戏引擎核心
│   │   │   ├── room/           # 房间管理
│   │   │   └── auth/           # 认证服务
│   │   ├── socket/             # Socket.IO处理
│   │   ├── routes/             # API路由
│   │   └── data/               # 游戏数据配置
│   ├── tests/                   # 测试文件
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/                      # 🎨 前端应用（待创建）
│   └── (React + TypeScript + Vite)
│
└── README.md                      # 本文件
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 16+
- Redis 7+
- npm 或 pnpm

### 1. 克隆项目

```bash
git clone <repository-url>
cd three_game_new
```

### 2. 启动后端

详细步骤请查看：[backend/QUICKSTART.md](backend/QUICKSTART.md)

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 配置数据库连接
npm run dev
```

后端服务将在 `http://localhost:3000` 启动。

### 3. 启动前端（待实现）

```bash
cd frontend
npm install
npm run dev
```

前端应用将在 `http://localhost:5173` 启动。

## 📖 文档导航

| 文档 | 描述 |
|------|------|
| [游戏设计文档](docs/game-design.md) | 完整的游戏玩法、关卡、角色设计 |
| [第一关设计](docs/level-01.md) | 第一关60+道具组合详细列表 |
| [服务器架构](docs/sever.md) | 后端技术架构和实现细节 |
| [实现计划](docs/implementation-plan.md) | 12周完整开发计划和技术选型 |
| [后端README](backend/README.md) | 后端项目说明和API文档 |
| [后端快速启动](backend/QUICKSTART.md) | 后端环境配置和故障排查 |

## 🎯 开发计划

项目采用分阶段开发策略（共12周）：

### Phase 1: 基础架构（Week 1）✅
- [x] 项目初始化
- [x] 后端框架搭建
- [x] TypeScript配置
- [x] 基础服务器和Socket.IO

### Phase 2: 核心引擎（Week 2-3）🚧
- [ ] 输入解析系统
- [ ] 事件配置系统
- [ ] 状态管理器
- [ ] 游戏引擎核心

### Phase 3: 实时通信（Week 3-4）
- [ ] WebSocket房间管理
- [ ] 状态同步机制
- [ ] 断线重连

### Phase 4: 第一关实现（Week 4-5）
- [ ] UI组件开发
- [ ] 60+道具组合配置
- [ ] 完整通关流程

### Phase 5+: 更多内容...

详细计划请查看：[实现计划文档](docs/implementation-plan.md)

## 🛠️ 技术栈

### 后端
- **Node.js 20** + **TypeScript 5** - 类型安全的服务器
- **Express 4** - Web框架
- **Socket.IO 4** - 实时双向通信
- **PostgreSQL 16** - 主数据库
- **Redis 7** - 缓存和实时状态
- **JWT** - 用户认证
- **Winston** - 日志系统

### 前端（计划）
- **React 18** + **TypeScript 5** - UI框架
- **Zustand** - 状态管理
- **Socket.IO Client** - 实时通信
- **Tailwind CSS** - 样式方案
- **Vite 5** - 构建工具

### 工具链
- **ESLint** + **Prettier** - 代码规范
- **Jest** - 测试框架
- **Docker** - 容器化部署

## 🧪 测试

```bash
# 后端测试
cd backend
npm test                # 运行所有测试
npm run test:watch      # 监听模式
npm run test:coverage   # 测试覆盖率
```

## 📝 代码规范

- 使用TypeScript严格模式
- 遵循ESLint规则
- 使用Prettier格式化代码
- Git提交信息格式：`feat:`, `fix:`, `docs:`, `refactor:`, `test:`

## 🤝 贡献指南

1. Fork本项目
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'feat: Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 提交Pull Request

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

**项目状态**: 🚧 开发中

**当前版本**: v0.1.0 (Alpha)

**最后更新**: 2025-10-27
