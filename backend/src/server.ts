/**
 * 服务器主入口文件
 *
 * 负责：
 * 1. 加载环境变量
 * 2. 初始化数据库和 Redis 连接
 * 3. 创建 HTTP 服务器
 * 4. 初始化 Socket.IO
 * 5. 启动服务器
 * 6. 处理优雅关闭
 */

import dotenv from 'dotenv';
import { createServer } from 'http';
import app from './app';
import { logger } from './utils/logger';
import { initSocketServer } from './socket/socketServer';
import { testConnection, closePool } from '@config/database';
import { connectRedis, testRedisConnection, closeRedis } from '@config/redis';

// ========================================
// 加载环境变量
// ========================================
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========================================
// 启动服务器函数
// ========================================

async function startServer() {
  try {
    logger.info('========================================');
    logger.info('  正在启动 ECHO Game 后端服务');
    logger.info('========================================');
    logger.info(`环境: ${NODE_ENV}`);
    logger.info(`端口: ${PORT}`);
    logger.info('');

    // ========================================
    // 1. 测试数据库连接
    // ========================================
    logger.info('📦 正在连接数据库...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('❌ 数据库连接失败，服务器启动中止');
      process.exit(1);
    }

    logger.info('✅ 数据库连接成功');
    logger.info('');

    // ========================================
    // 2. 连接 Redis
    // ========================================
    logger.info('🔴 正在连接 Redis...');

    try {
      await connectRedis();
      const redisConnected = await testRedisConnection();

      if (redisConnected) {
        logger.info('✅ Redis 连接成功');
      } else {
        logger.warn('⚠️  Redis 连接失败，将在无缓存模式下运行');
      }
    } catch (error) {
      logger.warn('⚠️  Redis 连接失败，将在无缓存模式下运行');
      logger.warn(`   错误: ${error instanceof Error ? error.message : String(error)}`);
    }

    logger.info('');

    // ========================================
    // 3. 创建 HTTP 服务器
    // ========================================
    logger.info('🌐 正在创建 HTTP 服务器...');
    const httpServer = createServer(app);

    // ========================================
    // 4. 初始化 Socket.IO
    // ========================================
    logger.info('🔌 正在初始化 Socket.IO...');
    initSocketServer(httpServer);
    logger.info('✅ Socket.IO 初始化完成');
    logger.info('');

    // ========================================
    // 5. 启动服务器
    // ========================================
    httpServer.listen(PORT, HOST, () => {
      logger.info('========================================');
      logger.info('  ✨ 服务器启动成功！');
      logger.info('========================================');
      logger.info(`🚀 服务器地址: http://${HOST}:${PORT}`);
      logger.info(`📝 环境: ${NODE_ENV}`);
      logger.info(`🔗 API 端点: http://${HOST}:${PORT}/api`);
      logger.info(`❤️  健康检查: http://${HOST}:${PORT}/health`);
      logger.info(`🔐 认证 API: http://${HOST}:${PORT}/api/v1/auth`);
      logger.info('========================================');
      logger.info('');
      logger.info('💡 提示: 按 Ctrl+C 停止服务器');
      logger.info('');
    });

    // ========================================
    // 6. 设置优雅关闭处理
    // ========================================
    setupGracefulShutdown(httpServer);
  } catch (error) {
    logger.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// ========================================
// 优雅关闭处理
// ========================================

function setupGracefulShutdown(httpServer: any) {
  // SIGTERM 信号处理（生产环境常用）
  process.on('SIGTERM', async () => {
    logger.info('');
    logger.info('========================================');
    logger.info('  收到 SIGTERM 信号，正在关闭服务器...');
    logger.info('========================================');

    await shutdown(httpServer);
  });

  // SIGINT 信号处理（Ctrl+C）
  process.on('SIGINT', async () => {
    logger.info('');
    logger.info('========================================');
    logger.info('  收到 SIGINT 信号，正在关闭服务器...');
    logger.info('========================================');

    await shutdown(httpServer);
  });

  // 捕获未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ 未处理的 Promise 拒绝:');
    logger.error('   Promise:', promise);
    logger.error('   原因:', reason);

    // 在开发环境中，未处理的拒绝不应导致服务器崩溃
    if (NODE_ENV === 'production') {
      logger.error('生产环境检测到未处理的 Promise 拒绝，服务器将关闭');
      shutdown(httpServer);
    }
  });

  // 捕获未捕获的异常
  process.on('uncaughtException', async (error) => {
    logger.error('❌ 未捕获的异常:');
    logger.error('   错误:', error);
    logger.error('   堆栈:', error.stack);

    // 未捕获的异常是严重错误，应该关闭服务器
    logger.error('检测到未捕获的异常，服务器将关闭');
    await shutdown(httpServer);
    process.exit(1);
  });
}

// ========================================
// 关闭服务器函数
// ========================================

async function shutdown(httpServer: any) {
  try {
    // 1. 停止接受新的连接
    logger.info('1. 停止接受新的连接...');
    httpServer.close(() => {
      logger.info('   ✅ HTTP 服务器已关闭');
    });

    // 2. 关闭数据库连接池
    logger.info('2. 关闭数据库连接...');
    await closePool();
    logger.info('   ✅ 数据库连接已关闭');

    // 3. 关闭 Redis 连接
    logger.info('3. 关闭 Redis 连接...');
    await closeRedis();
    logger.info('   ✅ Redis 连接已关闭');

    logger.info('');
    logger.info('========================================');
    logger.info('  ✅ 服务器已安全关闭');
    logger.info('========================================');
    logger.info('');

    process.exit(0);
  } catch (error) {
    logger.error('❌ 关闭服务器时发生错误:', error);
    process.exit(1);
  }
}

// ========================================
// 启动服务器
// ========================================

// 检查是否直接运行此文件（而不是被导入）
if (require.main === module) {
  startServer();
}

// 导出服务器函数供测试使用
export { startServer, shutdown };
