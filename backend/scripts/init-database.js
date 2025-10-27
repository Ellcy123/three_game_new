/**
 * 数据库初始化脚本
 * 使用Node.js和pg库连接PostgreSQL并创建数据库和表
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function initDatabase() {
  log('\n====================================', 'blue');
  log('  ECHO 游戏数据库初始化', 'blue');
  log('====================================\n', 'blue');

  // 步骤1: 连接到PostgreSQL默认数据库（postgres）
  log('步骤 1/4: 连接到 PostgreSQL...', 'yellow');

  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: 'postgres', // 连接到默认数据库
  });

  try {
    await adminClient.connect();
    log('✓ 成功连接到 PostgreSQL', 'green');

    // 步骤2: 检查并创建数据库
    log('\n步骤 2/4: 创建数据库...', 'yellow');

    const dbName = process.env.DB_NAME || 'three_brothers_game';

    // 检查数据库是否已存在
    const checkDbQuery = `
      SELECT 1 FROM pg_database WHERE datname = $1
    `;
    const checkResult = await adminClient.query(checkDbQuery, [dbName]);

    if (checkResult.rows.length > 0) {
      log(`⚠ 数据库 "${dbName}" 已存在，跳过创建`, 'yellow');
    } else {
      // 创建数据库
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      log(`✓ 成功创建数据库 "${dbName}"`, 'green');
    }

    await adminClient.end();

    // 步骤3: 连接到新创建的数据库并执行SQL脚本
    log('\n步骤 3/4: 执行初始化脚本...', 'yellow');

    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
      database: dbName,
    });

    await dbClient.connect();
    log('✓ 成功连接到数据库', 'green');

    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, '..', 'database', 'migrations', '001_initial_schema.sql');

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL文件不存在: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    log(`✓ 读取SQL文件: ${path.basename(sqlFilePath)}`, 'green');

    // 执行SQL脚本
    log('  执行中...', 'yellow');
    await dbClient.query(sqlContent);
    log('✓ SQL脚本执行成功', 'green');

    // 步骤4: 验证表是否创建成功
    log('\n步骤 4/4: 验证表结构...', 'yellow');

    const tablesQuery = `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    const tablesResult = await dbClient.query(tablesQuery);

    const expectedTables = [
      'users',
      'game_rooms',
      'room_players',
      'game_saves',
      'game_events',
      'chat_messages'
    ];

    log('\n已创建的表:', 'blue');
    tablesResult.rows.forEach((row, index) => {
      const isExpected = expectedTables.includes(row.tablename);
      const mark = isExpected ? '✓' : '-';
      log(`  ${mark} ${row.tablename}`, isExpected ? 'green' : 'reset');
    });

    // 检查是否所有预期的表都已创建
    const createdTables = tablesResult.rows.map(r => r.tablename);
    const missingTables = expectedTables.filter(t => !createdTables.includes(t));

    if (missingTables.length > 0) {
      log('\n⚠ 缺失的表:', 'yellow');
      missingTables.forEach(table => {
        log(`  - ${table}`, 'yellow');
      });
    }

    // 检查索引数量
    const indexQuery = `
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `;
    const indexResult = await dbClient.query(indexQuery);
    const indexCount = parseInt(indexResult.rows[0].count);
    log(`\n已创建的索引: ${indexCount} 个`, indexCount >= 28 ? 'green' : 'yellow');

    // 检查触发器
    const triggerQuery = `
      SELECT COUNT(*) as count
      FROM pg_trigger
      WHERE tgname LIKE 'trigger%'
    `;
    const triggerResult = await dbClient.query(triggerQuery);
    const triggerCount = parseInt(triggerResult.rows[0].count);
    log(`已创建的触发器: ${triggerCount} 个`, triggerCount >= 4 ? 'green' : 'yellow');

    // 检查视图
    const viewQuery = `
      SELECT COUNT(*) as count
      FROM pg_views
      WHERE schemaname = 'public'
    `;
    const viewResult = await dbClient.query(viewQuery);
    const viewCount = parseInt(viewResult.rows[0].count);
    log(`已创建的视图: ${viewCount} 个`, viewCount >= 2 ? 'green' : 'yellow');

    // 测试函数
    log('\n测试函数:', 'blue');
    const roomCodeQuery = 'SELECT generate_room_code() as code';
    const roomCodeResult = await dbClient.query(roomCodeQuery);
    log(`  ✓ generate_room_code(): ${roomCodeResult.rows[0].code}`, 'green');

    await dbClient.end();

    // 最终总结
    log('\n====================================', 'blue');
    log('  🎉 数据库初始化完成!', 'green');
    log('====================================\n', 'blue');

    log('数据库信息:', 'blue');
    log(`  数据库名称: ${dbName}`);
    log(`  主机地址: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    log(`  用户名: ${process.env.DB_USER}`);
    log(`  表数量: ${tablesResult.rows.length}`);
    log(`  索引数量: ${indexCount}`);
    log(`  触发器数量: ${triggerCount}`);
    log(`  视图数量: ${viewCount}`);

    log('\n✅ 数据库已就绪，可以开始开发了!\n', 'green');

  } catch (error) {
    log('\n====================================', 'red');
    log('  ❌ 初始化失败', 'red');
    log('====================================\n', 'red');

    log('错误信息:', 'red');
    console.error(error);

    log('\n可能的原因:', 'yellow');
    log('  1. PostgreSQL服务未运行');
    log('  2. 数据库连接信息错误（检查.env文件）');
    log('  3. 用户权限不足');
    log('  4. 端口被占用');

    log('\n解决方法:', 'yellow');
    log('  1. 启动PostgreSQL服务');
    log('  2. 检查.env中的数据库配置');
    log('  3. 确保用户有创建数据库的权限');

    process.exit(1);
  }
}

// 执行初始化
if (require.main === module) {
  initDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { initDatabase };
