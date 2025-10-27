/**
 * 数据库连接模块使用示例
 *
 * 本文件展示了如何在应用中使用 database.ts 提供的各种功能
 * 这不是实际运行的代码，仅供参考
 *
 * @file database.example.ts
 * @description 示例文件，包含未使用的导入和变量是正常的
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
  getPoolStatus,
} from './database';

/**
 * 示例 1: 使用 query 函数执行简单查询
 */
async function example1_SimpleQuery() {
  try {
    // 查询所有用户
    const result = await query('SELECT * FROM users');
    console.log('用户列表:', result.rows);

    // 带参数的查询（防止 SQL 注入）
    const userId = 123;
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    console.log('用户信息:', userResult.rows[0]);

    // 插入数据
    const insertResult = await query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
      ['john_doe', 'john@example.com']
    );
    console.log('新增用户:', insertResult.rows[0]);
  } catch (error) {
    console.error('查询失败:', error);
  }
}

/**
 * 示例 2: 使用 getClient 执行多个相关查询
 */
async function example2_MultipleQueries() {
  const client = await getClient();

  try {
    // 执行多个查询
    const users = await client.query('SELECT * FROM users');
    const rooms = await client.query('SELECT * FROM rooms');

    console.log('用户数:', users.rows.length);
    console.log('房间数:', rooms.rows.length);
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    // 重要！必须释放连接
    client.release();
  }
}

/**
 * 示例 3: 使用 transaction 执行事务
 */
async function example3_Transaction() {
  try {
    const result = await transaction(async (client) => {
      // 在事务中执行多个操作
      // 如果任何一个失败，所有操作都会回滚

      // 创建用户
      const userResult = await client.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id',
        ['alice', 'alice@example.com']
      );
      const userId = userResult.rows[0]?.id;

      // 创建用户配置
      await client.query(
        'INSERT INTO user_profiles (user_id, avatar, bio) VALUES ($1, $2, $3)',
        [userId, 'avatar.png', 'Hello world']
      );

      // 初始化用户统计
      await client.query(
        'INSERT INTO user_stats (user_id, games_played, wins) VALUES ($1, $2, $3)',
        [userId, 0, 0]
      );

      return { success: true, userId };
    });

    console.log('用户创建成功:', result);
  } catch (error) {
    console.error('事务失败:', error);
  }
}

/**
 * 示例 4: 手动管理事务（更灵活的控制）
 */
async function example4_ManualTransaction() {
  const client = await getClient();

  try {
    // 开始事务
    await client.query('BEGIN');

    // 转账操作示例
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
      [100, 'user1']
    );

    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [100, 'user2']
    );

    // 记录转账历史
    await client.query(
      'INSERT INTO transactions (from_user, to_user, amount) VALUES ($1, $2, $3)',
      ['user1', 'user2', 100]
    );

    // 提交事务
    await client.query('COMMIT');
    console.log('转账成功');
  } catch (error) {
    // 回滚事务
    await client.query('ROLLBACK');
    console.error('转账失败，已回滚:', error);
  } finally {
    client.release();
  }
}

/**
 * 示例 5: 使用类型安全的查询
 */
interface User {
  id: number;
  username: string;
  email: string;
  created_at: Date;
}

async function example5_TypeSafeQuery() {
  try {
    // 指定返回类型
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [123]
    );

    // TypeScript 会知道 row 的类型
    const user: User | undefined = result.rows[0];
    if (user) {
      console.log(`用户名: ${user.username}`);
      console.log(`邮箱: ${user.email}`);
    }
  } catch (error) {
    console.error('查询失败:', error);
  }
}

/**
 * 示例 6: 批量插入数据
 */
async function example6_BatchInsert() {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const users = [
      ['user1', 'user1@example.com'],
      ['user2', 'user2@example.com'],
      ['user3', 'user3@example.com'],
    ];

    for (const [username, email] of users) {
      await client.query(
        'INSERT INTO users (username, email) VALUES ($1, $2)',
        [username, email]
      );
    }

    await client.query('COMMIT');
    console.log(`成功插入 ${users.length} 条记录`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('批量插入失败:', error);
  } finally {
    client.release();
  }
}

/**
 * 示例 7: 使用连接池状态监控
 */
async function example7_PoolMonitoring() {
  // 获取连接池状态
  const status = getPoolStatus();
  console.log('连接池状态:', status);

  // 可以用于健康检查接口
  if (status.waitingCount > 10) {
    console.warn('警告：有太多请求在等待数据库连接！');
  }

  if (status.idleCount === 0 && status.totalCount >= 20) {
    console.warn('警告：连接池可能不足，考虑增加最大连接数！');
  }
}

/**
 * 示例 8: 在 Express 中间件中使用
 */
function example8_ExpressMiddleware() {
  // 这是一个典型的 Express 路由处理函数
  // 返回函数供 Express 路由使用
  const getUserHandler = async (req: any, res: any) => {
    try {
      const userId = req.params.id;

      const result = await query(
        'SELECT id, username, email FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }

      res.json({ user: result.rows[0] });
    } catch (error) {
      console.error('获取用户失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  };

  return getUserHandler;
}

/**
 * 示例 9: 在应用启动时测试连接
 */
async function example9_AppStartup() {
  console.log('正在启动应用...');

  // 测试数据库连接
  const connected = await testConnection();

  if (!connected) {
    console.error('无法连接到数据库，应用启动失败');
    process.exit(1);
  }

  console.log('数据库连接成功，应用启动完成');

  // 设置优雅关闭
  process.on('SIGTERM', async () => {
    console.log('收到 SIGTERM 信号，正在关闭...');
    await closePool();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('收到 SIGINT 信号，正在关闭...');
    await closePool();
    process.exit(0);
  });
}

/**
 * 示例 10: 使用预处理语句（提高性能）
 */
async function example10_PreparedStatements() {
  const client = await getClient();

  try {
    // 对于频繁执行的相同查询，数据库会缓存执行计划
    for (let i = 0; i < 100; i++) {
      await client.query(
        'SELECT * FROM users WHERE id = $1',
        [i]
      );
    }
  } finally {
    client.release();
  }
}

/**
 * 示例 11: 处理连接池耗尽的情况
 */
async function example11_HandlePoolExhaustion() {
  try {
    // 设置超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('数据库查询超时')), 5000);
    });

    const queryPromise = query('SELECT * FROM users');

    const result = await Promise.race([queryPromise, timeoutPromise]);
    console.log('查询成功:', result);
  } catch (error) {
    if (error instanceof Error && error.message === '数据库查询超时') {
      console.error('数据库响应过慢，请检查连接池配置或数据库性能');
    } else {
      console.error('查询失败:', error);
    }
  }
}

/**
 * 示例 12: 数据库迁移辅助函数
 */
async function example12_Migration() {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 创建表
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(50) NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active'
      )
    `);

    // 创建索引
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id
      ON game_sessions(room_id)
    `);

    await client.query('COMMIT');
    console.log('迁移完成');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 导出示例函数（实际使用时不需要导出）
export {
  example1_SimpleQuery,
  example2_MultipleQueries,
  example3_Transaction,
  example4_ManualTransaction,
  example5_TypeSafeQuery,
  example6_BatchInsert,
  example7_PoolMonitoring,
  example8_ExpressMiddleware,
  example9_AppStartup,
  example10_PreparedStatements,
  example11_HandlePoolExhaustion,
  example12_Migration,
};
