import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { SocketHandler } from './socket/SocketHandler';

const app = express();
const httpServer = createServer(app);

// 允许的前端地址（支持环境变量配置）
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:4173'];

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // 允许无 origin 的请求（如移动端应用）或在允许列表中的请求
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'production') {
        callback(null, true);
      } else {
        callback(null, true); // 开发时允许所有
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// 生产环境下提供静态文件
if (process.env.NODE_ENV === 'production') {
  // 编译后 __dirname 是 game/server/dist/server/src
  // 需要向上到 game 目录，再进入 client/dist
  const clientDist = path.resolve(__dirname, '../../../..', 'client/dist');
  console.log('当前目录 __dirname:', __dirname);
  console.log('静态文件目录:', clientDist);
  
  // 检查目录是否存在
  const fs = require('fs');
  if (fs.existsSync(clientDist)) {
    console.log('静态文件目录存在');
    app.use(express.static(clientDist));
    
    // SPA 路由回退
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    console.error('静态文件目录不存在:', clientDist);
    // 尝试其他可能的路径
    const altPath = path.resolve(__dirname, '../../..', 'client/dist');
    console.log('尝试备用路径:', altPath);
    if (fs.existsSync(altPath)) {
      console.log('备用路径存在');
      app.use(express.static(altPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
          return next();
        }
        res.sendFile(path.join(altPath, 'index.html'));
      });
    }
  }
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 初始化Socket处理器
const socketHandler = new SocketHandler(io);
socketHandler.initialize();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
