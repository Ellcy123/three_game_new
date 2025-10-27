/**
 * Redis 连接模块使用示例
 *
 * 本文件展示了如何在应用中使用 redis.ts 提供的各种功能
 * 这不是实际运行的代码，仅供参考
 *
 * @file redis.example.ts
 * @description 示例文件，包含未使用的导入和变量是正常的
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  connectRedis,
  getRedisClient,
  testRedisConnection,
  closeRedis,
  isRedisConnected,
  getRedisStatus,
  setCache,
  getCache,
  deleteCache,
  hasCache,
  expireCache,
  getTTL,
  multiGetCache,
} from './redis';

/**
 * 示例 1: 基本连接和测试
 */
async function example1_BasicConnection() {
  try {
    // 连接 Redis
    await connectRedis();

    // 测试连接
    const isOk = await testRedisConnection();
    console.log('Redis 连接状态:', isOk ? '正常' : '异常');

    // 检查连接状态
    const connected = isRedisConnected();
    console.log('是否已连接:', connected);

    // 获取连接信息
    const status = getRedisStatus();
    console.log('连接信息:', status);
  } catch (error) {
    console.error('连接失败:', error);
  }
}

/**
 * 示例 2: 基本缓存操作
 */
async function example2_BasicCache() {
  try {
    // 设置缓存（1 小时过期）
    await setCache('user:123', { id: 123, name: 'John', email: 'john@example.com' }, 3600);

    // 获取缓存
    const user = await getCache('user:123');
    console.log('用户信息:', user);

    // 检查缓存是否存在
    const exists = await hasCache('user:123');
    console.log('缓存存在:', exists);

    // 删除缓存
    await deleteCache('user:123');
  } catch (error) {
    console.error('缓存操作失败:', error);
  }
}

/**
 * 示例 3: 会话管理
 */
interface SessionData {
  userId: number;
  username: string;
  loginAt: string;
}

async function example3_SessionManagement() {
  try {
    const sessionId = 'session:abc123';
    const sessionData: SessionData = {
      userId: 123,
      username: 'john_doe',
      loginAt: new Date().toISOString(),
    };

    // 保存会话（24 小时过期）
    await setCache(sessionId, sessionData, 86400);

    // 获取会话
    const session = await getCache<SessionData>(sessionId);
    if (session) {
      console.log(`用户 ${session.username} 的会话有效`);
    }

    // 延长会话（重置过期时间）
    await expireCache(sessionId, 86400);

    // 获取剩余时间
    const ttl = await getTTL(sessionId);
    console.log(`会话剩余时间: ${ttl} 秒`);

    // 登出（删除会话）
    await deleteCache(sessionId);
  } catch (error) {
    console.error('会话管理失败:', error);
  }
}

/**
 * 示例 4: 使用原生 Redis 命令
 */
async function example4_NativeCommands() {
  try {
    const client = await getRedisClient();

    // 字符串操作
    await client.set('counter', '0');
    await client.incr('counter'); // 递增
    const counter = await client.get('counter');
    console.log('计数器:', counter);

    // 列表操作
    await client.lPush('messages', 'message1');
    await client.lPush('messages', 'message2');
    const messages = await client.lRange('messages', 0, -1);
    console.log('消息列表:', messages);

    // 集合操作
    await client.sAdd('online_users', 'user1');
    await client.sAdd('online_users', 'user2');
    const onlineUsers = await client.sMembers('online_users');
    console.log('在线用户:', onlineUsers);

    // 哈希操作
    await client.hSet('user:100', {
      name: 'Alice',
      age: '25',
      city: 'Beijing',
    });
    const userData = await client.hGetAll('user:100');
    console.log('用户数据:', userData);

    // 有序集合操作
    await client.zAdd('leaderboard', [
      { score: 100, value: 'player1' },
      { score: 200, value: 'player2' },
      { score: 150, value: 'player3' },
    ]);
    const topPlayers = await client.zRange('leaderboard', 0, 2);
    console.log('排行榜:', topPlayers);
  } catch (error) {
    console.error('Redis 命令执行失败:', error);
  }
}

/**
 * 示例 5: 游戏房间状态管理
 */
interface RoomState {
  roomId: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
}

async function example5_GameRoomManagement() {
  try {
    const roomId = 'room:abc123';
    const roomState: RoomState = {
      roomId: 'abc123',
      players: ['player1', 'player2', 'player3'],
      status: 'playing',
      createdAt: new Date().toISOString(),
    };

    // 保存房间状态（1 小时过期）
    await setCache(roomId, roomState, 3600);

    // 获取房间状态
    const room = await getCache<RoomState>(roomId);
    console.log('房间状态:', room);

    // 使用 Redis Hash 存储房间信息（更灵活）
    const client = await getRedisClient();
    await client.hSet(`room:hash:${roomId}`, {
      status: 'playing',
      playerCount: '3',
      createdAt: new Date().toISOString(),
    });

    // 使用 Set 管理房间中的玩家
    await client.sAdd(`room:players:${roomId}`, ['player1', 'player2', 'player3']);

    // 检查玩家是否在房间中
    const isInRoom = await client.sIsMember(`room:players:${roomId}`, 'player1');
    console.log('玩家在房间中:', isInRoom);

    // 移除玩家
    await client.sRem(`room:players:${roomId}`, 'player1');

    // 获取房间中的所有玩家
    const players = await client.sMembers(`room:players:${roomId}`);
    console.log('房间玩家:', players);
  } catch (error) {
    console.error('房间管理失败:', error);
  }
}

/**
 * 示例 6: 限流（Rate Limiting）
 */
async function example6_RateLimiting() {
  try {
    const client = await getRedisClient();
    const userId = 'user:123';
    const rateLimitKey = `ratelimit:${userId}`;

    // 滑动窗口限流：每分钟最多 10 次请求
    const now = Date.now();
    const windowSize = 60000; // 60 秒
    const maxRequests = 10;

    // 添加当前请求时间戳
    await client.zAdd(rateLimitKey, { score: now, value: now.toString() });

    // 移除窗口外的旧请求
    await client.zRemRangeByScore(rateLimitKey, 0, now - windowSize);

    // 统计当前窗口内的请求数
    const requestCount = await client.zCard(rateLimitKey);

    // 设置过期时间
    await client.expire(rateLimitKey, 60);

    if (requestCount <= maxRequests) {
      console.log(`允许请求 (${requestCount}/${maxRequests})`);
      return true;
    } else {
      console.log(`请求被限流 (${requestCount}/${maxRequests})`);
      return false;
    }
  } catch (error) {
    console.error('限流检查失败:', error);
    return true; // 失败时允许请求
  }
}

/**
 * 示例 7: 分布式锁
 */
async function example7_DistributedLock() {
  try {
    const client = await getRedisClient();
    const lockKey = 'lock:game:room123';
    const lockValue = `lock_${Date.now()}_${Math.random()}`;
    const lockTTL = 10; // 10 秒

    // 尝试获取锁
    const acquired = await client.set(lockKey, lockValue, {
      NX: true, // 仅当键不存在时设置
      EX: lockTTL, // 过期时间
    });

    if (acquired) {
      console.log('获取锁成功');

      try {
        // 执行需要锁保护的操作
        console.log('执行关键操作...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } finally {
        // 释放锁（只有锁的持有者才能释放）
        const currentValue = await client.get(lockKey);
        if (currentValue === lockValue) {
          await client.del(lockKey);
          console.log('释放锁成功');
        }
      }
    } else {
      console.log('获取锁失败，资源正在被使用');
    }
  } catch (error) {
    console.error('分布式锁操作失败:', error);
  }
}

/**
 * 示例 8: 发布/订阅（Pub/Sub）
 */
async function example8_PubSub() {
  try {
    // 创建订阅客户端（需要单独的连接）
    const subscriber = await getRedisClient();
    const publisher = await getRedisClient();

    // 订阅频道
    await subscriber.subscribe('game:events', (message) => {
      console.log('收到消息:', message);
      try {
        const event = JSON.parse(message);
        console.log('事件类型:', event.type);
        console.log('事件数据:', event.data);
      } catch {
        console.log('原始消息:', message);
      }
    });

    console.log('已订阅 game:events 频道');

    // 发布消息
    await publisher.publish(
      'game:events',
      JSON.stringify({
        type: 'player_joined',
        data: { roomId: 'room123', playerId: 'player1' },
      })
    );

    // 注意：实际使用中，订阅者应该在单独的连接中运行
    // 并且要正确处理取消订阅
  } catch (error) {
    console.error('发布/订阅失败:', error);
  }
}

/**
 * 示例 9: 排行榜系统
 */
async function example9_Leaderboard() {
  try {
    const client = await getRedisClient();
    const leaderboardKey = 'leaderboard:global';

    // 更新玩家分数
    await client.zAdd(leaderboardKey, [
      { score: 1000, value: 'player1' },
      { score: 1500, value: 'player2' },
      { score: 800, value: 'player3' },
      { score: 2000, value: 'player4' },
      { score: 1200, value: 'player5' },
    ]);

    // 增加玩家分数
    await client.zIncrBy(leaderboardKey, 100, 'player1');

    // 获取玩家分数
    const score = await client.zScore(leaderboardKey, 'player1');
    console.log('player1 分数:', score);

    // 获取玩家排名（从 0 开始）
    const rank = await client.zRevRank(leaderboardKey, 'player1');
    console.log('player1 排名:', rank !== null ? rank + 1 : '未上榜');

    // 获取前 10 名（降序）
    const topPlayers = await client.zRangeWithScores(leaderboardKey, 0, 9, { REV: true });
    console.log('排行榜前 10 名:');
    topPlayers.forEach((player, index) => {
      console.log(`${index + 1}. ${player.value}: ${player.score} 分`);
    });

    // 获取分数范围内的玩家
    const playersInRange = await client.zRangeByScore(leaderboardKey, 1000, 2000);
    console.log('1000-2000 分区间的玩家:', playersInRange);

    // 获取总玩家数
    const totalPlayers = await client.zCard(leaderboardKey);
    console.log('总玩家数:', totalPlayers);
  } catch (error) {
    console.error('排行榜操作失败:', error);
  }
}

/**
 * 示例 10: 缓存穿透防护（布隆过滤器替代方案）
 */
async function example10_CachePenetrationProtection() {
  try {
    const userId = 999; // 不存在的用户

    // 先检查缓存
    const cachedUser = await getCache(`user:${userId}`);
    if (cachedUser !== null) {
      return cachedUser;
    }

    // 检查是否为已知的不存在的 ID（空值缓存）
    const isNull = await hasCache(`user:null:${userId}`);
    if (isNull) {
      console.log('已知的不存在用户，直接返回');
      return null;
    }

    // 查询数据库
    const userFromDB = null; // 模拟数据库查询结果

    if (userFromDB) {
      // 缓存存在的用户数据
      await setCache(`user:${userId}`, userFromDB, 3600);
      return userFromDB;
    } else {
      // 缓存空值，防止缓存穿透（较短的过期时间）
      await setCache(`user:null:${userId}`, null, 300); // 5 分钟
      return null;
    }
  } catch (error) {
    console.error('查询失败:', error);
    return null;
  }
}

/**
 * 示例 11: 批量操作
 */
async function example11_BatchOperations() {
  try {
    // 批量设置缓存
    const users = [
      { id: 1, name: 'User 1' },
      { id: 2, name: 'User 2' },
      { id: 3, name: 'User 3' },
    ];

    for (const user of users) {
      await setCache(`user:${user.id}`, user, 3600);
    }

    // 批量获取缓存
    const userIds = [1, 2, 3];
    const keys = userIds.map((id) => `user:${id}`);
    const cachedUsers = await multiGetCache(keys);
    console.log('批量获取的用户:', cachedUsers);

    // 批量删除
    await deleteCache(...keys);
  } catch (error) {
    console.error('批量操作失败:', error);
  }
}

/**
 * 示例 12: 应用启动和关闭
 */
async function example12_AppLifecycle() {
  // 应用启动时
  console.log('应用启动中...');

  try {
    // 连接 Redis
    await connectRedis();

    // 测试连接
    const connected = await testRedisConnection();
    if (!connected) {
      console.error('Redis 连接失败，某些功能可能不可用');
      // 根据业务需求决定是否继续启动
    }

    console.log('应用启动成功');

    // 设置优雅关闭处理
    process.on('SIGTERM', async () => {
      console.log('收到 SIGTERM 信号，正在关闭...');
      await closeRedis();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('收到 SIGINT 信号，正在关闭...');
      await closeRedis();
      process.exit(0);
    });
  } catch (error) {
    console.error('应用启动失败:', error);
    process.exit(1);
  }
}

// 导出示例函数
export {
  example1_BasicConnection,
  example2_BasicCache,
  example3_SessionManagement,
  example4_NativeCommands,
  example5_GameRoomManagement,
  example6_RateLimiting,
  example7_DistributedLock,
  example8_PubSub,
  example9_Leaderboard,
  example10_CachePenetrationProtection,
  example11_BatchOperations,
  example12_AppLifecycle,
};
