import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

let io: Server | null = null;

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

  // 连接处理
  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 Client connected: ${socket.id}`);

    // 基础事件监听
    socket.on('disconnect', reason => {
      logger.info(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', error => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });

    // 心跳检测
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // 测试事件
    socket.on('test', (data, callback) => {
      logger.info('Received test event:', data);
      callback?.({ status: 'ok', message: 'Socket.IO is working!' });
    });

    // TODO: 添加游戏相关的事件处理器
    // setupGameHandlers(socket);
    // setupRoomHandlers(socket);
  });

  logger.info('✅ Socket.IO server initialized');

  return io;
}

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
