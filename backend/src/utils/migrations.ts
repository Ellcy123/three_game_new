/**
 * 数据库迁移工具
 *
 * 在应用启动时自动运行必要的数据库迁移
 */

import pool from '../config/database';
import { logger } from './logger';

/**
 * 检查并运行所有待执行的迁移
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    logger.info('🔄 检查数据库迁移...');

    // 创建迁移记录表（如果不存在）
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 迁移 1: 允许 character_type 为 NULL
    const migration1 = '002_make_character_nullable';
    const result = await client.query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      [migration1]
    );

    if (result.rows.length === 0) {
      logger.info(`📝 执行迁移: ${migration1}`);

      await client.query('BEGIN');

      try {
        // 修改列约束
        await client.query(`
          ALTER TABLE room_players
          ALTER COLUMN character_type DROP NOT NULL;
        `);

        // 添加注释
        await client.query(`
          COMMENT ON COLUMN room_players.character_type
          IS '角色类型（可选，玩家可以在房间内选择）';
        `);

        // 记录迁移
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [migration1]
        );

        await client.query('COMMIT');

        logger.info(`✅ 迁移完成: ${migration1}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } else {
      logger.info(`⏭️  迁移已执行，跳过: ${migration1}`);
    }

    logger.info('✅ 所有迁移检查完成');
  } catch (error) {
    logger.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
}
