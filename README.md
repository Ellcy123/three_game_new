# 三兄弟的冒险 - 多人在线协作解谜游戏

> 一款关于宠物死后世界的温情 TRPG 风格游戏

## 🎮 游戏简介

三兄弟的冒险是一款创新的文字交互式多人在线协作解谜游戏。3名玩家分别扮演猫、狗、龟三种角色，通过输入"道具A+道具B"或"角色+道具"的组合来触发事件，共同探索宠物死后的世界，揭开关于"ECHO"（回响）的温情故事。

### 核心特色

- 🎭 **三角色协作** - 猫、狗、龟各具特殊能力
- 🔤 **关键词解谜** - 60+道具组合等待发现
- 🌐 **实时多人** - WebSocket 实时同步，断线重连
- 📖 **线性叙事** - 密室→藏匿→海龟汤→成长→BOSS战→结局
- 💔 **情感共鸣** - 关于生命、陪伴与告别的故事

## 📁 项目结构

```
three_game_new/
├── docs/                    # 📚 策划文档
│   ├── game-design.md      # 游戏设计文档
│   ├── 02_关卡_藏匿.md     # 藏匿关卡设计
│   ├── 02_海龟汤.md        # 海龟汤关卡设计
│   ├── 03_人物剧情_猫咪线.md
│   ├── 04_人物剧情_乌龟线.md
│   ├── 05_人物剧情_狗狗线.md
│   ├── 06_BOSS战_*.md      # BOSS战设计
│   └── 07_结局分支.md      # 结局设计
│
├── game/                    # 🎮 游戏代码
│   ├── client/             # 前端 React 应用
│   ├── server/             # 后端 Node.js 服务
│   ├── config/             # 游戏配置文件
│   ├── shared/             # 共享类型定义
│   └── RAILWAY_DEPLOY.md   # 部署指南
│
└── .kiro/                   # Kiro 配置
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm

### 本地开发

```bash
# 1. 安装依赖
cd game/client && npm install
cd ../server && npm install

# 2. 启动开发服务器
# 终端1 - 启动后端
cd game/server && npm run dev

# 终端2 - 启动前端
cd game/client && npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000

### 生产构建

```bash
cd game
npm run build
npm start
```

## 🌐 部署

详细部署指南请查看：[game/RAILWAY_DEPLOY.md](game/RAILWAY_DEPLOY.md)

### Railway 部署（推荐）

1. 将代码推送到 GitHub
2. 在 Railway 创建项目，选择 GitHub 仓库
3. 设置 Root Directory 为 `game`
4. 添加环境变量 `NODE_ENV=production`
5. 部署完成后生成域名

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript
- Tailwind CSS
- Socket.IO Client
- Vite

### 后端
- Node.js + TypeScript
- Express
- Socket.IO

## 📖 游戏流程

1. **第一幕：密室** - 三人醒来被困密室，通过道具组合解谜逃脱
2. **第二幕：藏匿** - 躲避追击者的攻击
3. **海龟汤** - 推理揭示真相，发现自己是宠物
4. **第三幕：成长** - 各自修炼提升能力
5. **BOSS战** - 鼠鼠大王 → 百变小鹦 → 死神
6. **结局** - 根据选择触发不同结局

## 📄 许可证

MIT License

---

**项目状态**: ✅ 开发完成

**最后更新**: 2025-12-20
