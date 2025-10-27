/**
 * Railway 数据库初始化脚本
 *
 * 用途：在 Railway 环境中初始化数据库表结构
 *
 * 使用方法：
 * 1. 本地执行（需要设置 Railway 环境变量）：
 *    node scripts/init-railway-db.js
 *
 * 2. 在 Railway 控制台执行：
 *    添加一次性部署命令：node scripts/init-railway-db.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function initRailwayDatabase() {
  log('\n=== Railway 数据库初始化开始 ===\n', 'cyan');

  // Railway 自动注入的环境变量
  const databaseUrl = process.env.DATABASE_URL;

  // 如果没有 DATABASE_URL，尝试手动构建
  const dbConfig = databaseUrl ? {
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  } : {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432'),
    user: process.env.PGUSER || process.env.DB_USER || 'postgres',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
    database: process.env.PGDATABASE || process.env.DB_NAME || 'three_brothers_game',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };

  log('📊 数据库连接配置：', 'blue');
  if (databaseUrl) {
    log(`   使用 DATABASE_URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`, 'blue');
  } else {
    log(`   Host: ${dbConfig.host}`, 'blue');
    log(`   Port: ${dbConfig.port}`, 'blue');
    log(`   Database: ${dbConfig.database}`, 'blue');
    log(`   User: ${dbConfig.user}`, 'blue');
  }

  const client = new Client(dbConfig);

  try {
    // 连接数据库
    log('\n🔌 正在连接数据库...', 'yellow');
    await client.connect();
    log('✅ 数据库连接成功！', 'green');

    // 读取 SQL 文件
    const sqlFilePath = path.join(__dirname, '../database/migrations/001_initial_schema.sql');
    log(`\n📄 读取 SQL 文件: ${sqlFilePath}`, 'yellow');

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL 文件不存在: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    log('✅ SQL 文件读取成功！', 'green');

    // 执行 SQL
    log('\n🚀 开始执行 SQL 语句...', 'yellow');
    await client.query(sqlContent);
    log('✅ SQL 执行成功！', 'green');

    // 验证表是否创建成功
    log('\n🔍 验证数据库表...', 'yellow');

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const expectedTables = ['users', 'game_rooms', 'room_players', 'game_saves', 'game_events', 'chat_messages'];
    const createdTables = tablesResult.rows.map(row => row.table_name);

    log('\n📊 已创建的表：', 'blue');
    createdTables.forEach(table => {
      const isExpected = expectedTables.includes(table);
      log(`   ${isExpected ? '✅' : '⚠️'} ${table}`, isExpected ? 'green' : 'yellow');
    });

    // 检查是否所有预期的表都已创建
    const missingTables = expectedTables.filter(table => !createdTables.includes(table));
    if (missingTables.length > 0) {
      log('\n⚠️ 缺少以下表：', 'yellow');
      missingTables.forEach(table => log(`   - ${table}`, 'yellow'));
    } else {
      log('\n✅ 所有预期的表都已成功创建！', 'green');
    }

    // 验证索引
    const indexesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public';
    `);
    log(`\n📑 已创建索引数量: ${indexesResult.rows[0].count}`, 'blue');

    // 验证触发器
    const triggersResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.triggers
      WHERE trigger_schema = 'public';
    `);
    log(`⚡ 已创建触发器数量: ${triggersResult.rows[0].count}`, 'blue');

    // 验证视图
    const viewsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.views
      WHERE table_schema = 'public';
    `);
    log(`👁️ 已创建视图数量: ${viewsResult.rows[0].count}`, 'blue');

    // 测试函数
    try {
      const functionResult = await client.query('SELECT generate_room_code() as code;');
      log(`\n🧪 函数测试: generate_room_code() = ${functionResult.rows[0].code}`, 'green');
    } catch (error) {
      log(`\n⚠️ 函数测试失败: ${error.message}`, 'yellow');
    }

    log('\n=== ✅ Railway 数据库初始化完成！ ===\n', 'green');

  } catch (error) {
    log('\n=== ❌ 数据库初始化失败 ===\n', 'red');
    log(`错误信息: ${error.message}`, 'red');
    if (error.stack) {
      log(`\n堆栈跟踪:\n${error.stack}`, 'red');
    }
    process.exit(1);
  } finally {
    await client.end();
    log('🔌 数据库连接已关闭', 'blue');
  }
}

// 执行初始化
initRailwayDatabase().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
