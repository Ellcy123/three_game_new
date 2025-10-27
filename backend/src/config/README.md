# 配置模块文档

本目录包含数据库和缓存的连接配置模块。

## 模块列表

- [数据库配置 (database.ts)](#数据库配置-databasets)
- [Redis 配置 (redis.ts)](#redis-配置-redists)

---

# 数据库配置 (database.ts)

## 概述

`database.ts` 提供了一个完整的 PostgreSQL 数据库连接池管理解决方案，使用 `pg` (node-postgres) 库。该模块提供了连接池管理、查询执行、事务处理等功能。

## 特性

- ✅ **连接池管理**：自动管理数据库连接的创建、复用和销毁
- ✅ **错误处理**：完善的错误处理和日志记录
- ✅ **事务支持**：提供便捷的事务执行函数
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **性能监控**：连接池状态监控功能
- ✅ **环境配置**：支持多环境配置（开发、生产）
- ✅ **优雅关闭**：应用关闭时正确释放所有连接

## 快速开始

### 1. 环境配置

在 `.env` 文件中配置数据库连接信息：

```env
# 数据库连接（两种方式任选其一）

# 方式 1: 使用 DATABASE_URL（推荐用于云平台部署）
DATABASE_URL=postgresql://user:password@host:port/database

# 方式 2: 使用单独的配置项
DB_HOST=localhost
DB_PORT=5432
DB_NAME=three_brothers_game
DB_USER=postgres
DB_PASSWORD=postgres123

# 连接池配置（可选，有默认值）
DB_POOL_MAX=20          # 最大连接数
DB_POOL_MIN=5           # 最小保持连接数
DB_IDLE_TIMEOUT=30000   # 空闲连接超时（毫秒）
DB_CONNECTION_TIMEOUT=10000  # 获取连接超时（毫秒）
```

### 2. 测试连接

在应用启动时测试数据库连接：

```typescript
import { testConnection } from '@config/database';

const startApp = async () => {
  const connected = await testConnection();

  if (!connected) {
    console.error('数据库连接失败');
    process.exit(1);
  }

  console.log('应用启动成功');
};
```

### 3. 执行查询

```typescript
import { query } from '@config/database';

// 简单查询
const users = await query('SELECT * FROM users');
console.log(users.rows);

// 带参数的查询（防止 SQL 注入）
const user = await query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
```

## API 文档

### query(text, params?)

执行 SQL 查询并返回结果。

**参数：**
- `text: string` - SQL 查询语句
- `params?: any[]` - 查询参数（可选）

**返回：** `Promise<QueryResult<T>>`

**示例：**
```typescript
// 查询
const result = await query('SELECT * FROM users WHERE age > $1', [18]);

// 插入
const newUser = await query(
  'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
  ['john', 'john@example.com']
);

// 更新
await query(
  'UPDATE users SET last_login = NOW() WHERE id = $1',
  [userId]
);

// 删除
await query('DELETE FROM sessions WHERE expired_at < NOW()');
```

### getClient()

从连接池获取一个数据库客户端连接。用于需要执行多个相关查询的场景。

**注意：** 使用完毕后必须调用 `client.release()` 释放连接！

**返回：** `Promise<PoolClient>`

**示例：**
```typescript
const client = await getClient();

try {
  const users = await client.query('SELECT * FROM users');
  const rooms = await client.query('SELECT * FROM rooms');

  // 处理数据...
} finally {
  client.release(); // 重要！必须释放连接
}
```

### transaction(callback)

执行数据库事务。自动处理 BEGIN、COMMIT 和 ROLLBACK。

**参数：**
- `callback: (client: PoolClient) => Promise<T>` - 事务回调函数

**返回：** `Promise<T>`

**示例：**
```typescript
const result = await transaction(async (client) => {
  // 所有操作在同一个事务中
  const user = await client.query(
    'INSERT INTO users (username) VALUES ($1) RETURNING id',
    ['alice']
  );

  await client.query(
    'INSERT INTO user_profiles (user_id, avatar) VALUES ($1, $2)',
    [user.rows[0].id, 'avatar.png']
  );

  return { success: true };
});

// 如果回调中抛出错误，事务会自动回滚
```

### testConnection()

测试数据库连接是否正常。

**返回：** `Promise<boolean>`

**示例：**
```typescript
const isConnected = await testConnection();

if (!isConnected) {
  console.error('无法连接到数据库');
}
```

### getPoolStatus()

获取连接池当前状态信息。

**返回：** `{ totalCount: number, idleCount: number, waitingCount: number }`

**示例：**
```typescript
const status = getPoolStatus();
console.log(`总连接: ${status.totalCount}`);
console.log(`空闲连接: ${status.idleCount}`);
console.log(`等待请求: ${status.waitingCount}`);
```

### closePool()

关闭连接池，释放所有连接。应在应用关闭时调用。

**返回：** `Promise<void>`

**示例：**
```typescript
process.on('SIGTERM', async () => {
  console.log('收到关闭信号');
  await closePool();
  process.exit(0);
});
```

## 使用场景

### 场景 1：简单查询

适用于单个独立的数据库操作。

```typescript
import { query } from '@config/database';

export const getUserById = async (id: number) => {
  const result = await query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};
```

### 场景 2：多个相关查询

当需要执行多个相关查询但不需要事务时。

```typescript
import { getClient } from '@config/database';

export const getDashboardData = async (userId: number) => {
  const client = await getClient();

  try {
    const user = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const stats = await client.query('SELECT * FROM user_stats WHERE user_id = $1', [userId]);
    const recent = await client.query(
      'SELECT * FROM game_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    return {
      user: user.rows[0],
      stats: stats.rows[0],
      recentGames: recent.rows,
    };
  } finally {
    client.release();
  }
};
```

### 场景 3：事务操作

需要保证多个操作的原子性时。

```typescript
import { transaction } from '@config/database';

export const createGameSession = async (roomId: string, players: string[]) => {
  return await transaction(async (client) => {
    // 创建游戏会话
    const session = await client.query(
      'INSERT INTO game_sessions (room_id, status) VALUES ($1, $2) RETURNING id',
      [roomId, 'waiting']
    );

    const sessionId = session.rows[0].id;

    // 添加玩家
    for (const playerId of players) {
      await client.query(
        'INSERT INTO game_players (session_id, player_id) VALUES ($1, $2)',
        [sessionId, playerId]
      );
    }

    return sessionId;
  });
};
```

### 场景 4：类型安全查询

使用 TypeScript 类型定义确保类型安全。

```typescript
import { query } from '@config/database';

interface User {
  id: number;
  username: string;
  email: string;
  created_at: Date;
}

export const getUsers = async (): Promise<User[]> => {
  const result = await query<User>('SELECT * FROM users');
  return result.rows;
};
```

## 最佳实践

### 1. 始终使用参数化查询

❌ **错误示例**（SQL 注入风险）：
```typescript
const username = req.body.username;
await query(`SELECT * FROM users WHERE username = '${username}'`);
```

✅ **正确示例**：
```typescript
const username = req.body.username;
await query('SELECT * FROM users WHERE username = $1', [username]);
```

### 2. 记得释放连接

❌ **错误示例**（连接泄漏）：
```typescript
const client = await getClient();
const result = await client.query('SELECT * FROM users');
// 忘记调用 client.release()
```

✅ **正确示例**：
```typescript
const client = await getClient();
try {
  const result = await client.query('SELECT * FROM users');
  // 处理结果...
} finally {
  client.release(); // 确保连接被释放
}
```

### 3. 使用 transaction 函数处理事务

❌ **不推荐**（手动管理事务）：
```typescript
const client = await getClient();
await client.query('BEGIN');
try {
  await client.query('INSERT ...');
  await client.query('UPDATE ...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
} finally {
  client.release();
}
```

✅ **推荐**（使用 transaction 函数）：
```typescript
await transaction(async (client) => {
  await client.query('INSERT ...');
  await client.query('UPDATE ...');
});
```

### 4. 处理错误

```typescript
try {
  const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

  if (result.rows.length === 0) {
    throw new Error('用户不存在');
  }

  return result.rows[0];
} catch (error) {
  console.error('查询用户失败:', error);
  throw error; // 或返回默认值
}
```

### 5. 监控连接池状态

```typescript
import { getPoolStatus } from '@config/database';

// 在健康检查接口中使用
app.get('/health', (req, res) => {
  const poolStatus = getPoolStatus();

  res.json({
    status: 'ok',
    database: {
      totalConnections: poolStatus.totalCount,
      idleConnections: poolStatus.idleCount,
      waitingRequests: poolStatus.waitingCount,
    },
  });
});
```

## 配置优化

### 连接池大小调整

根据应用规模调整连接池大小：

- **小型应用**（<100 并发用户）：`DB_POOL_MAX=10-20`
- **中型应用**（100-1000 并发用户）：`DB_POOL_MAX=20-50`
- **大型应用**（>1000 并发用户）：`DB_POOL_MAX=50-100`

### 超时配置

- **快速查询应用**：缩短超时时间以快速释放连接
- **复杂查询应用**：增加超时时间以避免查询被中断

```env
DB_IDLE_TIMEOUT=30000         # 30 秒（默认）
DB_CONNECTION_TIMEOUT=10000   # 10 秒（默认）
```

## 故障排查

### 问题 1：连接超时

**症状**：应用报错 "connection timeout"

**可能原因**：
- 数据库连接数不足
- 查询执行时间过长
- 连接未正确释放

**解决方案**：
1. 检查连接池状态：`getPoolStatus()`
2. 增加 `DB_POOL_MAX` 值
3. 检查是否有连接泄漏（未调用 `client.release()`）
4. 优化慢查询

### 问题 2：连接被拒绝

**症状**：应用报错 "connection refused"

**可能原因**：
- 数据库服务未启动
- 连接信息配置错误
- 防火墙阻止连接

**解决方案**：
1. 检查数据库服务状态
2. 验证 `.env` 中的连接信息
3. 使用 `testConnection()` 诊断问题

### 问题 3：内存泄漏

**症状**：应用内存持续增长

**可能原因**：
- 连接未释放
- 查询结果过大

**解决方案**：
1. 检查所有 `getClient()` 调用是否都有对应的 `release()`
2. 使用分页限制查询结果大小
3. 监控连接池状态

## 安全建议

1. **不要在代码中硬编码密码**：始终使用环境变量
2. **生产环境启用 SSL**：设置 `NODE_ENV=production`
3. **使用参数化查询**：防止 SQL 注入
4. **限制数据库用户权限**：使用最小权限原则
5. **定期更新依赖**：保持 `pg` 库为最新版本

## 相关资源

- [node-postgres 官方文档](https://node-postgres.com/)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [连接池最佳实践](https://node-postgres.com/features/pooling)
- [SQL 注入防护](https://node-postgres.com/features/queries#parameterized-query)

## 更多示例

查看 [database.example.ts](database.example.ts) 文件获取更多使用示例。

---

# Redis 配置 (redis.ts)

## 概述

`redis.ts` 提供了一个完整的 Redis 客户端管理解决方案，使用 `redis` (node-redis v4) 库。该模块提供了连接管理、缓存操作、以及常用的 Redis 命令封装。

## 特性

- ✅ **自动连接管理**：自动处理连接的建立和重连
- ✅ **事件监听**：完善的连接事件处理和日志记录
- ✅ **缓存封装**：便捷的缓存操作函数（自动 JSON 序列化）
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **原生命令支持**：完全访问 Redis 原生命令
- ✅ **错误处理**：完善的错误捕获和日志记录
- ✅ **环境配置**：支持多环境配置（开发、生产）
- ✅ **优雅关闭**：应用关闭时正确释放连接

## 快速开始

### 1. 环境配置

在 `.env` 文件中配置 Redis 连接信息：

```env
# Redis 连接（两种方式任选其一）

# 方式 1: 使用 REDIS_URL（推荐用于云平台部署）
REDIS_URL=redis://[:password@]host:port[/database]

# 方式 2: 使用单独的配置项
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # 留空表示无密码
REDIS_DB=0               # 数据库索引（0-15）

# 连接配置（可选，有默认值）
REDIS_CONNECT_TIMEOUT=10000   # 连接超时（毫秒）
REDIS_KEEPALIVE=5000          # 保持连接时间（毫秒）
```

### 2. 测试连接

在应用启动时测试 Redis 连接：

```typescript
import { connectRedis, testRedisConnection } from '@config/redis';

const startApp = async () => {
  await connectRedis();

  const connected = await testRedisConnection();
  if (!connected) {
    console.error('Redis 连接失败，某些功能可能不可用');
  }

  console.log('应用启动成功');
};
```

### 3. 使用缓存

```typescript
import { setCache, getCache, deleteCache } from '@config/redis';

// 设置缓存（1 小时过期）
await setCache('user:123', { id: 123, name: 'John' }, 3600);

// 获取缓存
const user = await getCache('user:123');

// 删除缓存
await deleteCache('user:123');
```

## API 文档

### connectRedis()

创建并连接 Redis 客户端。

**返回：** `Promise<RedisClientType>`

**示例：**
```typescript
await connectRedis();
```

### getRedisClient()

获取 Redis 客户端实例。如果未连接，会自动创建连接。

**返回：** `Promise<RedisClientType>`

**示例：**
```typescript
const client = await getRedisClient();
await client.set('key', 'value');
```

### testRedisConnection()

测试 Redis 连接是否正常。

**返回：** `Promise<boolean>`

**示例：**
```typescript
const isConnected = await testRedisConnection();
```

### closeRedis()

优雅关闭 Redis 连接。

**返回：** `Promise<void>`

**示例：**
```typescript
await closeRedis();
```

### setCache(key, value, ttl?)

设置缓存（自动 JSON 序列化）。

**参数：**
- `key: string` - 缓存键
- `value: any` - 缓存值（会自动 JSON 序列化）
- `ttl?: number` - 过期时间（秒），默认 3600 秒

**返回：** `Promise<void>`

**示例：**
```typescript
await setCache('user:123', { id: 123, name: 'John' }, 3600);
```

### getCache\<T\>(key)

获取缓存（自动 JSON 反序列化）。

**参数：**
- `key: string` - 缓存键

**返回：** `Promise<T | null>`

**示例：**
```typescript
interface User {
  id: number;
  name: string;
}

const user = await getCache<User>('user:123');
```

### deleteCache(...keys)

删除缓存。

**参数：**
- `...keys: string[]` - 缓存键（支持多个）

**返回：** `Promise<number>` - 删除的键数量

**示例：**
```typescript
await deleteCache('user:123', 'user:456');
```

### hasCache(key)

检查缓存是否存在。

**参数：**
- `key: string` - 缓存键

**返回：** `Promise<boolean>`

**示例：**
```typescript
const exists = await hasCache('user:123');
```

### expireCache(key, ttl)

设置缓存过期时间。

**参数：**
- `key: string` - 缓存键
- `ttl: number` - 过期时间（秒）

**返回：** `Promise<boolean>`

**示例：**
```typescript
await expireCache('user:123', 3600);
```

### getTTL(key)

获取缓存剩余过期时间。

**参数：**
- `key: string` - 缓存键

**返回：** `Promise<number>` - 剩余秒数，-1 表示永不过期，-2 表示键不存在

**示例：**
```typescript
const ttl = await getTTL('user:123');
```

### multiGetCache\<T\>(keys)

批量获取缓存。

**参数：**
- `keys: string[]` - 缓存键数组

**返回：** `Promise<(T | null)[]>`

**示例：**
```typescript
const users = await multiGetCache<User>(['user:1', 'user:2', 'user:3']);
```

### flushCache()

清空当前数据库的所有缓存。⚠️ 危险操作！

**返回：** `Promise<void>`

**示例：**
```typescript
await flushCache();
```

## 使用场景

### 场景 1：会话管理

```typescript
import { setCache, getCache, deleteCache, expireCache } from '@config/redis';

interface Session {
  userId: number;
  username: string;
  loginAt: string;
}

// 创建会话（24 小时过期）
const createSession = async (sessionId: string, userId: number, username: string) => {
  const session: Session = {
    userId,
    username,
    loginAt: new Date().toISOString(),
  };
  await setCache(`session:${sessionId}`, session, 86400);
};

// 获取会话
const getSession = async (sessionId: string): Promise<Session | null> => {
  return await getCache<Session>(`session:${sessionId}`);
};

// 延长会话
const refreshSession = async (sessionId: string) => {
  await expireCache(`session:${sessionId}`, 86400);
};

// 删除会话（登出）
const destroySession = async (sessionId: string) => {
  await deleteCache(`session:${sessionId}`);
};
```

### 场景 2：游戏房间状态

```typescript
import { setCache, getCache, getRedisClient } from '@config/redis';

interface RoomState {
  roomId: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
}

// 保存房间状态
const saveRoomState = async (roomState: RoomState) => {
  await setCache(`room:${roomState.roomId}`, roomState, 3600);
};

// 使用 Redis Set 管理房间玩家
const addPlayerToRoom = async (roomId: string, playerId: string) => {
  const client = await getRedisClient();
  await client.sAdd(`room:players:${roomId}`, playerId);
};

const removePlayerFromRoom = async (roomId: string, playerId: string) => {
  const client = await getRedisClient();
  await client.sRem(`room:players:${roomId}`, playerId);
};

const getRoomPlayers = async (roomId: string): Promise<string[]> => {
  const client = await getRedisClient();
  return await client.sMembers(`room:players:${roomId}`);
};
```

### 场景 3：限流（Rate Limiting）

```typescript
import { getRedisClient } from '@config/redis';

const checkRateLimit = async (userId: string, maxRequests: number = 10): Promise<boolean> => {
  const client = await getRedisClient();
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowSize = 60000; // 1 分钟

  // 添加当前请求
  await client.zAdd(key, { score: now, value: now.toString() });

  // 移除窗口外的请求
  await client.zRemRangeByScore(key, 0, now - windowSize);

  // 统计当前窗口内的请求数
  const count = await client.zCard(key);

  // 设置过期时间
  await client.expire(key, 60);

  return count <= maxRequests;
};
```

### 场景 4：排行榜

```typescript
import { getRedisClient } from '@config/redis';

const leaderboardKey = 'leaderboard:global';

// 更新玩家分数
const updateScore = async (playerId: string, score: number) => {
  const client = await getRedisClient();
  await client.zAdd(leaderboardKey, { score, value: playerId });
};

// 增加玩家分数
const incrementScore = async (playerId: string, points: number) => {
  const client = await getRedisClient();
  await client.zIncrBy(leaderboardKey, points, playerId);
};

// 获取玩家分数
const getPlayerScore = async (playerId: string): Promise<number | null> => {
  const client = await getRedisClient();
  return await client.zScore(leaderboardKey, playerId);
};

// 获取玩家排名（从 1 开始）
const getPlayerRank = async (playerId: string): Promise<number | null> => {
  const client = await getRedisClient();
  const rank = await client.zRevRank(leaderboardKey, playerId);
  return rank !== null ? rank + 1 : null;
};

// 获取排行榜前 N 名
const getTopPlayers = async (limit: number = 10) => {
  const client = await getRedisClient();
  return await client.zRangeWithScores(leaderboardKey, 0, limit - 1, { REV: true });
};
```

### 场景 5：分布式锁

```typescript
import { getRedisClient } from '@config/redis';

const acquireLock = async (
  lockKey: string,
  lockValue: string,
  ttl: number = 10
): Promise<boolean> => {
  const client = await getRedisClient();
  const result = await client.set(lockKey, lockValue, { NX: true, EX: ttl });
  return result !== null;
};

const releaseLock = async (lockKey: string, lockValue: string): Promise<boolean> => {
  const client = await getRedisClient();
  const currentValue = await client.get(lockKey);

  if (currentValue === lockValue) {
    await client.del(lockKey);
    return true;
  }

  return false;
};

// 使用示例
const executeCriticalSection = async () => {
  const lockKey = 'lock:game:room123';
  const lockValue = `lock_${Date.now()}_${Math.random()}`;

  const acquired = await acquireLock(lockKey, lockValue, 10);

  if (acquired) {
    try {
      // 执行需要锁保护的操作
      console.log('执行关键操作...');
    } finally {
      await releaseLock(lockKey, lockValue);
    }
  } else {
    console.log('无法获取锁，资源正在被使用');
  }
};
```

## 最佳实践

### 1. 设置合适的过期时间

```typescript
// 短期数据（验证码、临时 token）
await setCache('verification:code', '123456', 300); // 5 分钟

// 会话数据
await setCache('session:xxx', sessionData, 86400); // 24 小时

// 永久缓存（需要手动清除）
await setCache('config:app', configData, 86400 * 365); // 1 年
```

### 2. 使用命名空间

```typescript
// 使用前缀区分不同类型的数据
const userKey = `user:${userId}`;
const sessionKey = `session:${sessionId}`;
const roomKey = `room:${roomId}`;
```

### 3. 处理缓存穿透

```typescript
const getUserById = async (userId: number) => {
  // 先检查缓存
  const cached = await getCache(`user:${userId}`);
  if (cached !== null) return cached;

  // 查询数据库
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

  if (user) {
    // 缓存存在的数据
    await setCache(`user:${userId}`, user, 3600);
  } else {
    // 缓存空值，防止缓存穿透
    await setCache(`user:null:${userId}`, null, 300);
  }

  return user;
};
```

### 4. 批量操作提高性能

```typescript
// 批量获取
const userIds = [1, 2, 3, 4, 5];
const keys = userIds.map(id => `user:${id}`);
const users = await multiGetCache(keys);

// 批量删除
await deleteCache(...keys);
```

### 5. 优雅关闭

```typescript
process.on('SIGTERM', async () => {
  console.log('收到关闭信号');
  await closeRedis();
  process.exit(0);
});
```

## Redis 数据类型使用

### 字符串（String）

```typescript
const client = await getRedisClient();

// 基本操作
await client.set('key', 'value');
const value = await client.get('key');

// 计数器
await client.incr('counter');
await client.decr('counter');
```

### 列表（List）

```typescript
const client = await getRedisClient();

// 添加到列表头部
await client.lPush('messages', 'message1', 'message2');

// 获取列表
const messages = await client.lRange('messages', 0, -1);

// 列表长度
const length = await client.lLen('messages');
```

### 集合（Set）

```typescript
const client = await getRedisClient();

// 添加成员
await client.sAdd('online_users', 'user1', 'user2');

// 检查成员
const isMember = await client.sIsMember('online_users', 'user1');

// 获取所有成员
const members = await client.sMembers('online_users');

// 移除成员
await client.sRem('online_users', 'user1');
```

### 哈希（Hash）

```typescript
const client = await getRedisClient();

// 设置哈希字段
await client.hSet('user:100', { name: 'John', age: '25' });

// 获取单个字段
const name = await client.hGet('user:100', 'name');

// 获取所有字段
const user = await client.hGetAll('user:100');
```

### 有序集合（Sorted Set）

```typescript
const client = await getRedisClient();

// 添加成员
await client.zAdd('scores', [
  { score: 100, value: 'player1' },
  { score: 200, value: 'player2' },
]);

// 获取分数
const score = await client.zScore('scores', 'player1');

// 按分数范围查询
const range = await client.zRangeByScore('scores', 100, 200);
```

## 故障排查

### 问题 1：连接被拒绝

**症状**：应用报错 "ECONNREFUSED" 或 "connection refused"

**可能原因**：
- Redis 服务未启动
- 连接信息配置错误
- 防火墙阻止连接

**解决方案**：
1. 检查 Redis 服务状态：`redis-cli ping`
2. 验证 `.env` 中的连接信息
3. 使用 `testRedisConnection()` 诊断问题

### 问题 2：超时错误

**症状**：操作超时

**可能原因**：
- Redis 服务响应慢
- 网络延迟高
- 执行了耗时操作

**解决方案**：
1. 增加超时时间配置
2. 优化 Redis 命令
3. 检查网络状况

### 问题 3：内存不足

**症状**：Redis 内存占用过高

**可能原因**：
- 缓存过期时间设置过长
- 缓存数据过大
- 未设置最大内存限制

**解决方案**：
1. 设置合理的过期时间
2. 使用 `flushCache()` 清理不需要的数据
3. 配置 Redis maxmemory 策略

## 安全建议

1. **使用密码**：生产环境必须设置 Redis 密码
2. **限制网络访问**：仅允许应用服务器访问 Redis
3. **使用 TLS**：敏感数据传输使用 TLS 加密
4. **定期备份**：配置 Redis 持久化和备份
5. **监控资源**：监控 Redis 内存和连接数

## 相关资源

- [node-redis 官方文档](https://github.com/redis/node-redis)
- [Redis 官方文档](https://redis.io/documentation)
- [Redis 命令参考](https://redis.io/commands)
- [Redis 最佳实践](https://redis.io/docs/manual/patterns/)

## 更多示例

查看 [redis.example.ts](redis.example.ts) 文件获取更多使用示例，包括：
- 发布/订阅
- 分布式锁
- 限流
- 排行榜
- 缓存策略
- 等等...
