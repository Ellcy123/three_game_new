/**
 * 数据库迁移脚本：允许 character_type 为 NULL
 *
 * 运行方式：
 * node scripts/migrate-character-nullable.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🔄 开始迁移：允许 character_type 为 NULL...');

    // 开始事务
    await client.query('BEGIN');

    // 修改列约束
    await client.query(`
      ALTER TABLE room_players
      ALTER COLUMN character_type DROP NOT NULL;
    `);

    console.log('✅ character_type 列已修改为可空');

    // 添加注释
    await client.query(`
      COMMENT ON COLUMN room_players.character_type
      IS '角色类型（可选，玩家可以在房间内选择）';
    `);

    console.log('✅ 列注释已添加');

    // 提交事务
    await client.query('COMMIT');

    console.log('✅ 迁移成功完成！');

  } catch (error) {
    // 回滚事务
    await client.query('ROLLBACK');
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 执行迁移
migrate()
  .then(() => {
    console.log('🎉 迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 迁移脚本执行失败:', error);
    process.exit(1);
  });
