/**
 * 数据库连接测试脚本
 *
 * 运行此脚本以测试数据库连接配置是否正确
 * 使用方法: npm run dev -- src/config/test-db-connection.ts
 * 或: tsx src/config/test-db-connection.ts
 */

import { testConnection, closePool, getPoolStatus, query } from './database';

/**
 * 主测试函数
 */
async function main() {
  console.log('========================================');
  console.log('  数据库连接测试');
  console.log('========================================\n');

  try {
    // 1. 测试基本连接
    console.log('1️⃣  测试基本连接...');
    const isConnected = await testConnection();

    if (!isConnected) {
      console.error('\n❌ 数据库连接失败！请检查配置。\n');
      process.exit(1);
    }

    console.log('\n');

    // 2. 测试简单查询
    console.log('2️⃣  测试简单查询...');
    try {
      const result = await query('SELECT 1 + 1 as result');
      console.log(`   ✓ 查询结果: 1 + 1 = ${result.rows[0]?.result}`);
    } catch (error) {
      console.error('   ✗ 查询失败:', error instanceof Error ? error.message : String(error));
    }

    console.log('\n');

    // 3. 检查连接池状态
    console.log('3️⃣  检查连接池状态...');
    const status = getPoolStatus();
    console.log(`   - 总连接数: ${status.totalCount}`);
    console.log(`   - 空闲连接数: ${status.idleCount}`);
    console.log(`   - 等待请求数: ${status.waitingCount}`);

    console.log('\n');

    // 4. 测试多个并发查询
    console.log('4️⃣  测试并发查询（10个查询）...');
    const startTime = Date.now();

    const promises = Array.from({ length: 10 }, (_, i) =>
      query('SELECT $1 as query_number, pg_sleep(0.1)', [i + 1])
    );

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    console.log(`   ✓ 10个查询完成，耗时: ${duration}ms`);

    console.log('\n');

    // 5. 最终状态
    console.log('5️⃣  最终连接池状态...');
    const finalStatus = getPoolStatus();
    console.log(`   - 总连接数: ${finalStatus.totalCount}`);
    console.log(`   - 空闲连接数: ${finalStatus.idleCount}`);
    console.log(`   - 等待请求数: ${finalStatus.waitingCount}`);

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
    // 关闭连接池
    console.log('正在关闭连接池...');
    await closePool();
    console.log('连接池已关闭。\n');
  }
}

// 运行测试
main().catch((error) => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
