# Railway 部署指南

## 前置条件

1. 注册 Railway 账号：https://railway.app
2. 安装 Railway CLI（可选）：`npm install -g @railway/cli`
3. 将代码推送到 GitHub 仓库

## 部署步骤

### 方法一：通过 Railway 网页界面（推荐）

1. **登录 Railway**
   - 访问 https://railway.app
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 授权 Railway 访问你的 GitHub 仓库
   - 选择包含游戏代码的仓库

3. **配置部署设置**
   - Railway 会自动检测到 `game` 目录
   - 如果没有自动检测，手动设置：
     - Root Directory: `game`
     - Build Command: `cd client && npm install && npm run build && cd ../server && npm install && npm run build`
     - Start Command: `cd server && npm start`

4. **设置环境变量**
   - 在项目设置中添加以下环境变量：
   ```
   NODE_ENV=production
   PORT=3000
   ```
   - Railway 会自动设置 PORT，但显式设置可以避免问题

5. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成（约 2-5 分钟）

6. **获取访问地址**
   - 部署成功后，点击 "Settings" → "Domains"
   - 点击 "Generate Domain" 生成一个 `.railway.app` 域名
   - 或者添加自定义域名

### 方法二：通过 Railway CLI

1. **安装 CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **登录**
   ```bash
   railway login
   ```

3. **初始化项目**
   ```bash
   cd game
   railway init
   ```

4. **部署**
   ```bash
   railway up
   ```

5. **设置环境变量**
   ```bash
   railway variables set NODE_ENV=production
   ```

6. **获取域名**
   ```bash
   railway domain
   ```

## 常见问题

### Q: 部署失败，提示找不到模块？
A: 确保 `game` 目录下的 `package.json` 存在，并且 build 命令正确。

### Q: WebSocket 连接失败？
A: 检查客户端代码中的 `useSocket.ts`，确保生产环境使用 `window.location.origin` 作为服务器地址（已配置）。

### Q: 静态文件 404？
A: 检查服务端 `index.ts` 中的静态文件路径是否正确。

### Q: 如何查看日志？
A: 在 Railway 控制台点击项目，选择 "Deployments" 查看构建和运行日志。

## 项目结构

```
game/
├── client/           # 前端 React 应用
│   ├── src/
│   ├── dist/         # 构建输出（部署时生成）
│   └── package.json
├── server/           # 后端 Node.js 服务
│   ├── src/
│   ├── dist/         # 构建输出（部署时生成）
│   └── package.json
├── config/           # 游戏配置文件
├── shared/           # 共享类型定义
├── package.json      # 根目录 package.json
├── railway.json      # Railway 配置
└── nixpacks.toml     # Nixpacks 构建配置
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | development |
| PORT | 服务端口 | 3000 |
| ALLOWED_ORIGINS | 允许的跨域来源（逗号分隔） | localhost |

## 更新部署

推送代码到 GitHub 后，Railway 会自动重新部署：

```bash
git add .
git commit -m "更新游戏"
git push origin main
```

## 费用说明

Railway 提供：
- 免费套餐：每月 $5 额度，足够小型项目使用
- 按使用量计费：超出免费额度后按实际使用计费

对于这个游戏，免费套餐通常足够日常使用。
