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
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  
  // SPA 路由回退
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
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
