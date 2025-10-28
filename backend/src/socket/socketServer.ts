import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { registerRoomHandlers, clearAllDisconnectionTimers } from '../websocket/roomHandlers';

/**
 * JWT Payload 接口
 */
interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * 扩展 Socket 接口，添加用户信息
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
}

let io: Server | null = null;

/**
 * JWT 认证中间件
 * 从握手信息获取 Token，验证并将用户信息附加到 socket 对象
 */
function authMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  try {
    // 1. 从握手信息获取 Token
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.warn(`❌ Socket 连接被拒绝 (${socket.id}): 未提供认证令牌`);
      return next(new Error('未提供认证令牌'));
    }

    // 2. 验证 JWT_SECRET 是否配置
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('❌ JWT_SECRET 环境变量未设置');
      return next(new Error('服务器配置错误'));
    }

    // 3. 验证 Token
    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      // 4. 将用户信息附加到 socket 对象
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      socket.email = decoded.email;

      logger.info(`✅ Socket 认证成功: ${socket.username} (${socket.userId})`);
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        logger.warn(`❌ Socket 连接被拒绝 (${socket.id}): Token 已过期`);
        return next(new Error('认证令牌已过期'));
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        logger.warn(`❌ Socket 连接被拒绝 (${socket.id}): Token 无效`);
        return next(new Error('认证令牌无效'));
      } else {
        logger.error(`❌ Socket 认证错误 (${socket.id}):`, jwtError);
        return next(new Error('认证失败'));
      }
    }
  } catch (error) {
    logger.error(`❌ Socket 认证中间件错误 (${socket.id}):`, error);
    return next(new Error('认证失败'));
  }
}

/**
 * 初始化Socket.IO服务器
 */
export function initSocketServer(httpServer: HttpServer): Server {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000', 10),
  });

  // ========================================
  // 应用 JWT 认证中间件
  // ========================================
  io.use(authMiddleware);

  // ========================================
  // 连接事件处理
  // ========================================
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`🔌 用户连接: ${socket.username} (${socket.userId}) [Socket ID: ${socket.id}]`);

    // ========================================
    // 基础事件监听
    // ========================================

    // 用户断开连接时的清理
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 用户断开连接: ${socket.username} (${socket.userId}), 原因: ${reason}`);

      // TODO: 清理用户相关的资源
      // - 从房间中移除用户
      // - 通知其他玩家
      // - 更新 Redis 中的在线状态
    });

    // 错误处理
    socket.on('error', (error) => {
      logger.error(`❌ Socket 错误 (${socket.username}):`, error);
    });

    // 心跳检测
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // 测试事件
    socket.on('test', (data, callback) => {
      logger.info(`📨 收到测试事件 (${socket.username}):`, data);
      callback?.({
        status: 'ok',
        message: 'Socket.IO is working!',
        user: {
          userId: socket.userId,
          username: socket.username,
        },
      });
    });

    // ========================================
    // 注册事件处理器
    // ========================================

    // 房间事件处理器
    registerRoomHandlers(io, socket);

    // TODO: 游戏事件处理器（稍后添加）
    // setupGameHandlers(socket);

    // TODO: 聊天事件处理器（稍后添加）
    // setupChatHandlers(socket);
  });

  logger.info('✅ Socket.IO server initialized');

  return io;
}

// ========================================
// 工具函数
// ========================================

/**
 * 获取Socket.IO实例
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
}

/**
 * 向指定房间广播消息
 */
export function broadcastToRoom(roomId: string, event: string, data: any): void {
  if (!io) {
    logger.error('Cannot broadcast: Socket.IO not initialized');
    return;
  }
  io.to(roomId).emit(event, data);
}

/**
 * 向指定用户发送消息
 */
export function emitToSocket(socketId: string, event: string, data: any): void {
  if (!io) {
    logger.error('Cannot emit: Socket.IO not initialized');
    return;
  }
  io.to(socketId).emit(event, data);
}

/**
 * 关闭 Socket.IO 服务器
 * 清理所有连接和资源
 */
export function closeSocketServer(): void {
  if (io) {
    logger.info('正在关闭 Socket.IO 服务器...');

    // 清理所有断线定时器
    clearAllDisconnectionTimers();

    // 关闭所有连接
    io.close();
    io = null;

    logger.info('✅ Socket.IO 服务器已关闭');
  }
}
