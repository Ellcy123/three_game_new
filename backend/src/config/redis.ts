/**
 * Redis 连接配置模块
 *
 * 该模块负责创建和管理 Redis 客户端连接
 * 使用 redis (node-redis) v4 库进行 Redis 连接管理
 */

import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * Redis 客户端实例
 * 使用 RedisClientType 确保类型安全
 */
let redisClient: RedisClientType = null as any;

/**
 * 从环境变量中读取 Redis 配置
 *
 * 优先使用 REDIS_URL，如果不存在则使用单独的配置项
 * REDIS_URL 格式: redis://[:password@]host:port[/database]
 *
 * @returns RedisClientOptions Redis 客户端配置对象
 */
const getRedisConfig = (): RedisClientOptions => {
  // 如果提供了 REDIS_URL，优先使用它（Railway 等云平台常用）
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
    };
  }

  // 使用单独的环境变量配置
  const config: RedisClientOptions = {
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      // 连接超时配置（10 秒）
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
      // 保持活跃，防止连接被关闭
      keepAlive: parseInt(process.env.REDIS_KEEPALIVE || '5000', 10),
    },
  };

  // 如果设置了密码，添加密码配置
  if (process.env.REDIS_PASSWORD) {
    config.password = process.env.REDIS_PASSWORD;
  }

  // 如果设置了数据库索引，添加数据库配置（默认 0）
  if (process.env.REDIS_DB) {
    config.database = parseInt(process.env.REDIS_DB, 10);
  }

  return config;
};

/**
 * 创建并连接 Redis 客户端
 *
 * 该函数会创建一个新的 Redis 客户端实例并建立连接
 * 如果已经存在连接，则返回现有连接
 *
 * @returns Promise<RedisClientType> Redis 客户端实例
 * @throws Error 如果连接失败
 */
export const connectRedis = async (): Promise<RedisClientType> => {
  // 如果已经存在连接且状态正常，直接返回
  if (redisClient?.isOpen) {
    return redisClient;
  }

  try {
    console.log('正在连接 Redis...');

    // 获取配置
    const config = getRedisConfig();

    // 创建客户端
    redisClient = createClient(config) as RedisClientType;

    /**
     * 错误事件监听
     * 捕获 Redis 连接错误，防止应用崩溃
     */
    redisClient.on('error', (err: Error) => {
      console.error('Redis 客户端错误:', err.message);
      console.error('错误详情:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * 连接成功事件
     * 记录连接成功信息
     */
    redisClient.on('connect', () => {
      console.log('✓ Redis 连接建立中...');
    });

    /**
     * 准备就绪事件
     * Redis 客户端完全准备好处理命令
     */
    redisClient.on('ready', () => {
      console.log('✓ Redis 客户端已就绪');
      if (process.env.NODE_ENV === 'development') {
        console.log('  - Redis 配置:', {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || '6379',
          database: process.env.REDIS_DB || '0',
        });
      }
    });

    /**
     * 重新连接事件
     * 当连接断开后自动重连时触发
     */
    redisClient.on('reconnecting', () => {
      console.log('⟳ Redis 正在重新连接...');
    });

    /**
     * 连接结束事件
     * Redis 连接关闭时触发
     */
    redisClient.on('end', () => {
      console.log('✗ Redis 连接已关闭');
    });

    // 建立连接
    await redisClient.connect();

    console.log('✓ Redis 连接成功！');

    return redisClient;
  } catch (error) {
    console.error('✗ Redis 连接失败:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    // 输出连接配置信息（隐藏密码）以便排查问题
    console.error('Redis 连接配置:', {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
      hasPassword: !!process.env.REDIS_PASSWORD,
      database: process.env.REDIS_DB || '0',
    });

    throw error;
  }
};

/**
 * 获取 Redis 客户端实例
 *
 * 如果客户端未初始化或已断开，会自动创建新连接
 *
 * @returns Promise<RedisClientType> Redis 客户端实例
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
  if (!redisClient?.isOpen) {
    return await connectRedis();
  }

  return redisClient;
};

/**
 * 测试 Redis 连接
 *
 * 在应用启动时调用此函数以验证 Redis 连接配置是否正确
 *
 * @returns Promise<boolean> 连接成功返回 true，失败返回 false
 */
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    console.log('正在测试 Redis 连接...');

    const client = await getRedisClient();

    // 执行 PING 命令测试连接
    const pong = await client.ping();

    if (pong === 'PONG') {
      console.log('✓ Redis 连接测试成功！');

      // 测试基本的读写操作
      const testKey = '__test_connection__';
      const testValue = 'test_value_' + Date.now();

      await client.set(testKey, testValue, { EX: 10 }); // 10 秒过期
      const getValue = await client.get(testKey);

      if (getValue === testValue) {
        console.log('✓ Redis 读写测试成功！');
        await client.del(testKey); // 清理测试数据
      } else {
        console.warn('⚠ Redis 读写测试失败');
        return false;
      }

      // 获取 Redis 服务器信息
      const info = await client.info('server');
      const versionMatch = info.match(/redis_version:([^\r\n]+)/);
      if (versionMatch) {
        console.log(`  - Redis 版本: ${versionMatch[1]}`);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('✗ Redis 连接测试失败:', error instanceof Error ? error.message : String(error));
    return false;
  }
};

/**
 * 关闭 Redis 连接
 *
 * 在应用关闭时调用，确保连接正确关闭
 * 应该在 SIGTERM、SIGINT 等信号处理中调用
 *
 * @returns Promise<void>
 */
export const closeRedis = async (): Promise<void> => {
  try {
    if (redisClient?.isOpen) {
      console.log('正在关闭 Redis 连接...');
      await redisClient.quit(); // 优雅关闭，等待所有命令完成
      redisClient = null as any;
      console.log('✓ Redis 连接已关闭');
    }
  } catch (error) {
    console.error('关闭 Redis 连接时发生错误:', error instanceof Error ? error.message : String(error));

    // 如果优雅关闭失败，强制关闭
    if (redisClient?.isOpen) {
      await redisClient.disconnect();
      redisClient = null as any;
    }
  }
};

/**
 * 强制断开 Redis 连接
 *
 * 立即断开连接，不等待命令完成
 * 仅在紧急情况下使用
 *
 * @returns Promise<void>
 */
export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient?.isOpen) {
      console.log('正在强制断开 Redis 连接...');
      await redisClient.disconnect();
      redisClient = null as any;
      console.log('✓ Redis 连接已断开');
    }
  } catch (error) {
    console.error('断开 Redis 连接时发生错误:', error instanceof Error ? error.message : String(error));
  }
};

/**
 * 检查 Redis 连接状态
 *
 * @returns boolean 如果已连接返回 true，否则返回 false
 */
export const isRedisConnected = (): boolean => {
  return redisClient?.isOpen === true;
};

/**
 * 获取 Redis 连接信息
 *
 * 用于监控和调试
 *
 * @returns 连接状态信息
 */
export const getRedisStatus = () => {
  return {
    connected: isRedisConnected(),
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || '6379',
    database: process.env.REDIS_DB || '0',
  };
};

/**
 * Redis 缓存辅助函数
 *
 * 提供常用的缓存操作封装
 */

/**
 * 设置缓存（带过期时间）
 *
 * @param key 缓存键
 * @param value 缓存值（自动 JSON 序列化）
 * @param ttl 过期时间（秒），默认 3600 秒（1 小时）
 */
export const setCache = async (key: string, value: any, ttl: number = 3600): Promise<void> => {
  try {
    const client = await getRedisClient();
    const serialized = JSON.stringify(value);
    await client.set(key, serialized, { EX: ttl });
  } catch (error) {
    console.error(`设置缓存失败 [${key}]:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 获取缓存
 *
 * @param key 缓存键
 * @returns 缓存值（自动 JSON 反序列化），不存在返回 null
 */
export const getCache = async <T = any>(key: string): Promise<T | null> => {
  try {
    const client = await getRedisClient();
    const value = await client.get(key);

    if (value === null) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`获取缓存失败 [${key}]:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 删除缓存
 *
 * @param key 缓存键（支持多个）
 * @returns 删除的键数量
 */
export const deleteCache = async (...keys: string[]): Promise<number> => {
  try {
    const client = await getRedisClient();
    return await client.del(keys);
  } catch (error) {
    console.error(`删除缓存失败 [${keys.join(', ')}]:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 检查缓存是否存在
 *
 * @param key 缓存键
 * @returns 存在返回 true，否则返回 false
 */
export const hasCache = async (key: string): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`检查缓存失败 [${key}]:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 设置缓存过期时间
 *
 * @param key 缓存键
 * @param ttl 过期时间（秒）
 * @returns 成功返回 true，失败返回 false
 */
export const expireCache = async (key: string, ttl: number): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    const result = await client.expire(key, ttl);
    return result;
  } catch (error) {
    console.error(`设置过期时间失败 [${key}]:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 获取缓存剩余过期时间
 *
 * @param key 缓存键
 * @returns 剩余秒数，-1 表示永不过期，-2 表示键不存在
 */
export const getTTL = async (key: string): Promise<number> => {
  try {
    const client = await getRedisClient();
    return await client.ttl(key);
  } catch (error) {
    console.error(`获取 TTL 失败 [${key}]:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 批量获取缓存
 *
 * @param keys 缓存键数组
 * @returns 缓存值数组（按键顺序）
 */
export const multiGetCache = async <T = any>(keys: string[]): Promise<(T | null)[]> => {
  try {
    const client = await getRedisClient();
    const values = await client.mGet(keys);

    return values.map((value) => {
      if (value === null) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    });
  } catch (error) {
    console.error(`批量获取缓存失败:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 清空当前数据库的所有缓存
 *
 * ⚠️ 危险操作！生产环境慎用
 *
 * @returns Promise<void>
 */
export const flushCache = async (): Promise<void> => {
  try {
    const client = await getRedisClient();
    await client.flushDb();
    console.log('✓ Redis 缓存已清空');
  } catch (error) {
    console.error('清空缓存失败:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

// 导出 Redis 客户端实例供高级用例使用
export default {
  connectRedis,
  getRedisClient,
  testRedisConnection,
  closeRedis,
  disconnectRedis,
  isRedisConnected,
  getRedisStatus,
  setCache,
  getCache,
  deleteCache,
  hasCache,
  expireCache,
  getTTL,
  multiGetCache,
  flushCache,
};
