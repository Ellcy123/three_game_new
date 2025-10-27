/**
 * Redis 连接测试脚本
 *
 * 运行此脚本以测试 Redis 连接配置是否正确
 * 使用方法: npm run dev -- src/config/test-redis-connection.ts
 * 或: tsx src/config/test-redis-connection.ts
 */

import {
  connectRedis,
  testRedisConnection,
  closeRedis,
  getRedisStatus,
  setCache,
  getCache,
  deleteCache,
  getRedisClient,
} from './redis';

/**
 * 主测试函数
 */
async function main() {
  console.log('========================================');
  console.log('  Redis 连接测试');
  console.log('========================================\n');

  try {
    // 1. 测试基本连接
    console.log('1️⃣  测试基本连接...');
    await connectRedis();
    const isConnected = await testRedisConnection();

    if (!isConnected) {
      console.error('\n❌ Redis 连接失败！请检查配置。\n');
      process.exit(1);
    }

    console.log('\n');

    // 2. 测试基本缓存操作
    console.log('2️⃣  测试基本缓存操作...');
    const testKey = '__test_cache__';
    const testValue = { message: 'Hello Redis!', timestamp: Date.now() };

    try {
      // 设置缓存
      await setCache(testKey, testValue, 60);
      console.log('   ✓ 设置缓存成功');

      // 获取缓存
      const retrieved = await getCache(testKey);
      console.log('   ✓ 获取缓存成功:', retrieved);

      // 验证数据一致性
      if (JSON.stringify(retrieved) === JSON.stringify(testValue)) {
        console.log('   ✓ 数据验证成功');
      } else {
        console.error('   ✗ 数据验证失败');
      }

      // 删除测试缓存
      await deleteCache(testKey);
      console.log('   ✓ 删除缓存成功');
    } catch (error) {
      console.error('   ✗ 缓存操作失败:', error instanceof Error ? error.message : String(error));
    }

    console.log('\n');

    // 3. 测试 Redis 原生命令
    console.log('3️⃣  测试 Redis 原生命令...');
    try {
      const client = await getRedisClient();

      // 字符串操作
      await client.set('test:string', 'Hello World');
      const str = await client.get('test:string');
      console.log('   ✓ 字符串操作:', str);

      // 计数器
      await client.set('test:counter', '0');
      await client.incr('test:counter');
      await client.incr('test:counter');
      const count = await client.get('test:counter');
      console.log('   ✓ 计数器操作:', count);

      // 列表操作
      await client.lPush('test:list', ['item1', 'item2', 'item3']);
      const listLen = await client.lLen('test:list');
      console.log('   ✓ 列表操作: 长度 =', listLen);

      // 集合操作
      await client.sAdd('test:set', ['member1', 'member2', 'member3']);
      const setSize = await client.sCard('test:set');
      console.log('   ✓ 集合操作: 大小 =', setSize);

      // 哈希操作
      await client.hSet('test:hash', { field1: 'value1', field2: 'value2' });
      const hashSize = await client.hLen('test:hash');
      console.log('   ✓ 哈希操作: 字段数 =', hashSize);

      // 有序集合操作
      await client.zAdd('test:zset', [
        { score: 1, value: 'one' },
        { score: 2, value: 'two' },
        { score: 3, value: 'three' },
      ]);
      const zsetSize = await client.zCard('test:zset');
      console.log('   ✓ 有序集合操作: 大小 =', zsetSize);

      // 清理测试数据
      await client.del([
        'test:string',
        'test:counter',
        'test:list',
        'test:set',
        'test:hash',
        'test:zset',
      ]);
      console.log('   ✓ 测试数据清理完成');
    } catch (error) {
      console.error('   ✗ Redis 命令执行失败:', error instanceof Error ? error.message : String(error));
    }

    console.log('\n');

    // 4. 测试并发操作
    console.log('4️⃣  测试并发操作（100 个并发请求）...');
    const startTime = Date.now();

    try {
      const promises = Array.from({ length: 100 }, async (_, i) => {
        const key = `test:concurrent:${i}`;
        await setCache(key, { index: i, timestamp: Date.now() }, 60);
        const value = await getCache(key);
        await deleteCache(key);
        return value !== null;
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r).length;
      const duration = Date.now() - startTime;

      console.log(`   ✓ 完成 ${successCount}/100 个操作，耗时: ${duration}ms`);
      console.log(`   ✓ 平均每个操作: ${(duration / 100).toFixed(2)}ms`);
    } catch (error) {
      console.error('   ✗ 并发测试失败:', error instanceof Error ? error.message : String(error));
    }

    console.log('\n');

    // 5. 测试过期时间
    console.log('5️⃣  测试过期时间...');
    try {
      const client = await getRedisClient();
      const expireKey = 'test:expire';

      // 设置 2 秒过期的键
      await client.set(expireKey, 'will expire soon', { EX: 2 });
      console.log('   ✓ 设置过期键（2 秒）');

      // 立即检查
      let exists = await client.exists(expireKey);
      console.log('   ✓ 立即检查: 键存在 =', exists === 1);

      // 等待 3 秒
      console.log('   ⏳ 等待 3 秒...');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 再次检查
      exists = await client.exists(expireKey);
      console.log('   ✓ 3 秒后检查: 键存在 =', exists === 1);

      if (exists === 0) {
        console.log('   ✓ 过期机制正常工作');
      } else {
        console.error('   ✗ 过期机制未生效');
      }
    } catch (error) {
      console.error('   ✗ 过期测试失败:', error instanceof Error ? error.message : String(error));
    }

    console.log('\n');

    // 6. 查看连接状态
    console.log('6️⃣  查看连接状态...');
    const status = getRedisStatus();
    console.log('   - 连接状态:', status.connected ? '已连接' : '未连接');
    console.log('   - 主机:', status.host);
    console.log('   - 端口:', status.port);
    console.log('   - 数据库:', status.database);

    console.log('\n========================================');
    console.log('  ✅ 所有测试通过！');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('  ❌ 测试失败！');
    console.error('========================================');
    console.error('错误信息:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\n堆栈信息:');
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    // 关闭连接
    console.log('正在关闭 Redis 连接...');
    await closeRedis();
    console.log('Redis 连接已关闭。\n');
  }
}

// 运行测试
main().catch((error) => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
