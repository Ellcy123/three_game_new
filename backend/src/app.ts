/**
 * Express 应用配置
 *
 * 配置所有中间件、路由和错误处理
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { notFoundHandler, errorHandler } from '@middleware/errorHandler';
import { getPoolStatus } from '@config/database';
import { getRedisStatus } from '@config/redis';

// 导入路由
import authRoutes from '@routes/authRoutes';

// 创建 Express 应用
const app: Application = express();

// ========================================
// 安全中间件
// ========================================

// Helmet - 设置安全 HTTP 头
app.use(helmet());

// ========================================
// CORS 配置
// ========================================

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // 允许没有 origin 的请求（如 Postman、服务器到服务器调用）
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // 允许携带认证信息
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ========================================
// 限流配置
// ========================================

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 最多 100 个请求
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试',
    },
  },
  standardHeaders: true, // 返回 RateLimit-* 头
  legacyHeaders: false, // 禁用 X-RateLimit-* 头
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试',
      },
    });
  },
});

// 对 API 路由应用限流
app.use('/api', limiter);

// ========================================
// 请求解析中间件
// ========================================

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb' }));

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// 请求日志中间件
// ========================================

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// ========================================
// 健康检查端点
// ========================================

app.get('/health', async (_req: Request, res: Response) => {
  try {
    // 获取数据库连接池状态
    const dbStatus = getPoolStatus();

    // 获取 Redis 连接状态
    const redisStatus = getRedisStatus();

    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: {
            connected: dbStatus.totalCount > 0,
            totalConnections: dbStatus.totalCount,
            idleConnections: dbStatus.idleCount,
            waitingRequests: dbStatus.waitingCount,
          },
          redis: {
            connected: redisStatus.connected,
            host: redisStatus.host,
            port: redisStatus.port,
          },
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '健康检查失败',
      },
    });
  }
});

// ========================================
// API 根路径
// ========================================

app.get('/api', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'ECHO Game API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/v1/auth',
        rooms: '/api/v1/rooms (待实现)',
        game: '/api/v1/game (待实现)',
      },
      documentation: '/api/docs (待实现)',
    },
  });
});

// ========================================
// API 路由
// ========================================

// v1 认证路由
app.use('/api/v1/auth', authRoutes);

// TODO: 添加更多路由
// app.use('/api/v1/rooms', roomRoutes);
// app.use('/api/v1/game', gameRoutes);
// app.use('/api/v1/users', userRoutes);

// ========================================
// 404 错误处理
// ========================================

app.use(notFoundHandler);

// ========================================
// 全局错误处理中间件
// ========================================

app.use(errorHandler);

// ========================================
// 导出应用
// ========================================

export default app;
