/**
 * 数据库连接配置模块
 *
 * 该模块负责创建和管理 PostgreSQL 数据库连接池
 * 使用 node-postgres (pg) 库进行数据库连接管理
 */

import { Pool, PoolConfig, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 数据库连接池配置接口
 * 扩展了 pg 的 PoolConfig 类型以确保类型安全
 */
interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * 从环境变量中读取数据库配置
 *
 * 优先使用 DATABASE_URL，如果不存在则使用单独的配置项
 * DATABASE_URL 格式: postgresql://user:password@host:port/database
 */
const getDatabaseConfig = (): DatabaseConfig => {
  // 如果提供了 DATABASE_URL，优先使用它（Railway 等云平台常用）
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      // 以下配置作为回退选项
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'three_brothers_game',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };
  }

  // 使用单独的环境变量配置
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'three_brothers_game',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
};

/**
 * 连接池配置参数
 *
 * max: 连接池中最大连接数（默认 20）
 * idleTimeoutMillis: 客户端在连接池中空闲的最长时间，超时将被释放（默认 30 秒）
 * connectionTimeoutMillis: 等待可用连接的最长时间，超时抛出错误（默认 10 秒）
 * maxUses: 单个连接的最大使用次数，达到后将被关闭并替换（0 表示无限制）
 * allowExitOnIdle: 当所有客户端空闲时允许进程退出（默认 false）
 *
 * 根据应用规模调整这些参数：
 * - 小型应用: max=10-20
 * - 中型应用: max=20-50
 * - 大型应用: max=50-100
 */
const poolConfig: PoolConfig = {
  ...getDatabaseConfig(),

  // 连接池大小配置
  max: parseInt(process.env.DB_POOL_MAX || '20', 10), // 最大连接数
  min: parseInt(process.env.DB_POOL_MIN || '5', 10),  // 最小保持连接数

  // 超时配置
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),       // 30 秒
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10), // 10 秒

  // 高级配置
  maxUses: parseInt(process.env.DB_MAX_USES || '7500', 10), // 单个连接最大使用次数
  allowExitOnIdle: process.env.NODE_ENV === 'development',  // 开发环境允许退出

  // SSL 配置（生产环境推荐开启）
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false } // 云服务通常需要 SSL
    : undefined,

  // 应用名称（便于在数据库中识别连接来源）
  application_name: process.env.APP_NAME || 'echo-game-backend',
};

/**
 * 创建数据库连接池实例
 *
 * Pool 管理多个数据库连接，自动处理连接的创建、复用和销毁
 * 这是推荐的生产环境数据库连接方式
 */
const pool = new Pool(poolConfig);

/**
 * 连接池错误处理
 *
 * 监听连接池级别的错误事件，防止未捕获的错误导致应用崩溃
 * 这些错误通常是由于网络问题、数据库重启等原因导致的空闲连接错误
 */
pool.on('error', (err: Error) => {
  console.error('数据库连接池发生意外错误:', err.message);
  console.error('错误详情:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  // 在生产环境中，这里可以集成日志系统或监控服务
  // 例如: logger.error('Pool error', { error: err });
});

/**
 * 连接池连接事件
 *
 * 在开发环境中记录新连接的创建，便于调试
 */
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('新的数据库连接已建立');
  }
});

/**
 * 连接池获取连接事件
 *
 * 在开发环境中记录连接获取，便于监控连接池使用情况
 */
pool.on('acquire', () => {
  if (process.env.NODE_ENV === 'development' && process.env.LOG_LEVEL === 'debug') {
    console.log('从连接池获取连接');
  }
});

/**
 * 连接池释放连接事件
 *
 * 在开发环境中记录连接释放，便于监控连接池使用情况
 */
pool.on('remove', () => {
  if (process.env.NODE_ENV === 'development' && process.env.LOG_LEVEL === 'debug') {
    console.log('连接已从连接池移除');
  }
});

/**
 * 测试数据库连接
 *
 * 在应用启动时调用此函数以验证数据库连接配置是否正确
 *
 * @returns Promise<boolean> 连接成功返回 true，失败返回 false
 */
export const testConnection = async (): Promise<boolean> => {
  let client: PoolClient | null = null;

  try {
    console.log('正在测试数据库连接...');

    // 从连接池获取一个客户端连接
    client = await pool.connect();

    // 执行简单查询测试连接
    const result: QueryResult = await client.query('SELECT NOW() as current_time, version() as db_version');

    console.log('✓ 数据库连接成功！');
    console.log(`  - 当前时间: ${result.rows[0]?.current_time}`);
    console.log(`  - 数据库版本: ${result.rows[0]?.db_version}`);
    console.log(`  - 连接池状态: 总连接数=${pool.totalCount}, 空闲连接=${pool.idleCount}, 等待请求=${pool.waitingCount}`);

    return true;
  } catch (error) {
    console.error('✗ 数据库连接失败:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    // 输出连接配置信息（隐藏密码）以便排查问题
    console.error('连接配置:', {
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database,
      user: poolConfig.user,
      password: '***', // 不输出真实密码
      ssl: poolConfig.ssl ? 'enabled' : 'disabled',
    });

    return false;
  } finally {
    // 确保释放连接回连接池
    if (client) {
      client.release();
    }
  }
};

/**
 * 执行数据库查询（带自动连接管理）
 *
 * 这是一个便捷函数，自动处理连接的获取和释放
 * 推荐用于简单查询，复杂事务请直接使用 pool.connect()
 *
 * @param text SQL 查询语句
 * @param params 查询参数（可选）
 * @returns Promise<QueryResult<T>> 查询结果
 *
 * @example
 * ```typescript
 * const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 * console.log(result.rows);
 * ```
 */
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // 在开发环境记录慢查询（超过 1 秒）
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`慢查询警告 (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    console.error('查询执行失败:', {
      query: text.substring(0, 100),
      params: params,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * 获取数据库客户端连接
 *
 * 用于需要执行多个相关查询或事务的场景
 * 注意：使用完毕后必须调用 client.release() 释放连接！
 *
 * @returns Promise<PoolClient> 数据库客户端连接
 *
 * @example
 * ```typescript
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('UPDATE ...');
 *   await client.query('INSERT ...');
 *   await client.query('COMMIT');
 * } catch (error) {
 *   await client.query('ROLLBACK');
 *   throw error;
 * } finally {
 *   client.release();
 * }
 * ```
 */
export const getClient = async (): Promise<PoolClient> => {
  try {
    return await pool.connect();
  } catch (error) {
    console.error('获取数据库客户端失败:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 执行数据库事务
 *
 * 自动处理事务的开始、提交和回滚
 * 这是执行事务的推荐方式，确保资源正确释放
 *
 * @param callback 事务回调函数，接收 PoolClient 作为参数
 * @returns Promise<T> 回调函数的返回值
 *
 * @example
 * ```typescript
 * await transaction(async (client) => {
 *   await client.query('INSERT INTO users ...');
 *   await client.query('INSERT INTO profiles ...');
 *   return { success: true };
 * });
 * ```
 */
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();

  try {
    // 开始事务
    await client.query('BEGIN');

    // 执行事务操作
    const result = await callback(client);

    // 提交事务
    await client.query('COMMIT');

    return result;
  } catch (error) {
    // 发生错误时回滚事务
    await client.query('ROLLBACK');

    console.error('事务执行失败，已回滚:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    // 释放连接回连接池
    client.release();
  }
};

/**
 * 优雅关闭数据库连接池
 *
 * 在应用关闭时调用，确保所有连接正确关闭
 * 应该在 SIGTERM、SIGINT 等信号处理中调用
 *
 * @returns Promise<void>
 */
export const closePool = async (): Promise<void> => {
  try {
    console.log('正在关闭数据库连接池...');
    await pool.end();
    console.log('✓ 数据库连接池已关闭');
  } catch (error) {
    console.error('关闭数据库连接池时发生错误:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 获取连接池状态信息
 *
 * 用于监控和调试连接池使用情况
 *
 * @returns 连接池状态对象
 */
export const getPoolStatus = () => {
  return {
    totalCount: pool.totalCount,      // 总连接数
    idleCount: pool.idleCount,        // 空闲连接数
    waitingCount: pool.waitingCount,  // 等待连接的请求数
  };
};

/**
 * 导出连接池实例作为默认导出
 *
 * 对于需要直接访问连接池的高级用例
 * 大多数情况下建议使用命名导出的便捷函数
 */
export default pool;

// 注意：所有函数已经通过 export const 导出，无需重复导出
// 可用的导出：pool, query, getClient, transaction, testConnection, closePool, getPoolStatus
