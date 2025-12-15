# 三兄弟冒险游戏 - 部署指南

## 🚀 方案一：Railway 部署（推荐）

Railway 提供免费额度，一键部署，最简单！

### 步骤 1：准备代码

确保你的代码已推送到 GitHub 仓库。

### 步骤 2：在 Railway 创建项目

1. 登录 https://railway.app
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库
5. **重要**：设置 Root Directory 为 `game`

### 步骤 3：配置环境变量

在 Railway 项目设置中添加：
```
NODE_ENV=production
PORT=3000
```

### 步骤 4：等待部署完成

Railway 会自动：
1. 安装依赖 (`npm install`)
2. 构建项目 (`npm run build`)
3. 启动服务 (`node server/dist/index.js`)

### 步骤 5：获取访问地址

部署完成后，Railway 会给你一个地址如：
`https://your-app.up.railway.app`

把这个地址发给朋友就能一起玩了！

---

## 方案二：本地主机 + ngrok

一名玩家运行服务器，其他玩家连接。

### 步骤 1：启动服务器
```bash
cd game
npm install
npm run build
npm run start
```

### 步骤 2：使用 ngrok 暴露到公网

1. 下载 ngrok: https://ngrok.com/download
2. 运行：`ngrok http 3000`
3. 把 ngrok 给的地址发给朋友

---

## 方案三：同一局域网内玩

如果所有玩家在同一 WiFi 下：

1. 主机构建并启动：
```bash
cd game
npm install
npm run build
npm run start
```

2. 查看本机IP：`ipconfig`（Windows）
3. 其他玩家访问：`http://192.168.x.x:3000`

---

## 本地开发命令

```bash
cd game
npm install          # 安装依赖
npm run dev:server   # 启动开发服务器 (端口 3000)
npm run dev:client   # 启动前端开发 (端口 5173)
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| NODE_ENV | 环境模式 | development |
| PORT | 服务器端口 | 3000 |
| VITE_SERVER_URL | 前端连接的服务器地址（可选） | 自动检测 |
