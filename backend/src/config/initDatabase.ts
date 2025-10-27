/**
 * 数据库自动初始化模块
 *
 * 在应用启动时自动创建必需的数据库表
 * 适用于 Railway 等云平台部署
 */

import { query } from './database';

/**
 * 初始化数据库表结构
 *
 * 这个函数会在应用启动时被调用，自动创建所有必需的表
 * 使用 CREATE TABLE IF NOT EXISTS 确保不会重复创建
 */
export const initDatabase = async (): Promise<void> => {
  try {
    console.log('🔧 开始初始化数据库表结构...');

    // 1. 创建 users 表
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        is_banned BOOLEAN DEFAULT false,

        CONSTRAINT username_length CHECK (char_length(username) >= 3),
        CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$')
      )
    `);
    console.log('✓ users 表已就绪');

    // 2. 创建索引
    await query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true`);
    console.log('✓ 索引已创建');

    // 3. 创建 game_rooms 表（游戏房间）
    await query(`
      CREATE TABLE IF NOT EXISTS game_rooms (
        room_id SERIAL PRIMARY KEY,
        room_code VARCHAR(6) UNIQUE NOT NULL,
        host_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        room_name VARCHAR(100),
        max_players INTEGER DEFAULT 3,
        current_players INTEGER DEFAULT 0,
        room_status VARCHAR(20) DEFAULT 'waiting',
        current_chapter INTEGER DEFAULT 1,
        current_checkpoint VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        finished_at TIMESTAMP,

        CONSTRAINT valid_status CHECK (room_status IN ('waiting', 'playing', 'paused', 'finished')),
        CONSTRAINT valid_player_count CHECK (current_players >= 0 AND current_players <= max_players),
        CONSTRAINT valid_chapter CHECK (current_chapter >= 1 AND current_chapter <= 5)
      )
    `);
    console.log('✓ game_rooms 表已就绪');

    // 4. 创建 game_rooms 索引
    await query(`CREATE INDEX IF NOT EXISTS idx_rooms_status ON game_rooms(room_status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_rooms_code ON game_rooms(room_code)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_rooms_host ON game_rooms(host_user_id)`);
    console.log('✓ game_rooms 索引已创建');

    // 5. 创建 room_players 表（房间玩家）
    await query(`
      CREATE TABLE IF NOT EXISTS room_players (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES game_rooms(room_id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        character_type VARCHAR(20) NOT NULL,
        character_name VARCHAR(50),
        current_hp INTEGER DEFAULT 8,
        max_hp INTEGER DEFAULT 8,
        player_status VARCHAR(20) DEFAULT 'active',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(room_id, user_id),
        UNIQUE(room_id, character_type),
        CONSTRAINT valid_character CHECK (character_type IN ('cat', 'dog', 'turtle')),
        CONSTRAINT valid_player_status CHECK (player_status IN ('active', 'disconnected', 'dead')),
        CONSTRAINT valid_hp CHECK (current_hp >= 0 AND current_hp <= max_hp)
      )
    `);
    console.log('✓ room_players 表已就绪');

    // 6. 创建 room_players 索引
    await query(`CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_room_players_user ON room_players(user_id)`);
    console.log('✓ room_players 索引已创建');

    // 7. 创建 game_saves 表（游戏存档）
    await query(`
      CREATE TABLE IF NOT EXISTS game_saves (
        save_id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES game_rooms(room_id) ON DELETE CASCADE,
        save_name VARCHAR(100),
        chapter INTEGER NOT NULL,
        checkpoint VARCHAR(50) NOT NULL,
        game_state JSONB NOT NULL,
        players_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_auto_save BOOLEAN DEFAULT false,

        CONSTRAINT valid_chapter CHECK (chapter >= 1 AND chapter <= 5)
      )
    `);
    console.log('✓ game_saves 表已就绪');

    // 8. 创建 chat_messages 表（聊天消息）
    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        message_id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES game_rooms(room_id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        message_type VARCHAR(20) DEFAULT 'text',
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT false,

        CONSTRAINT message_length CHECK (char_length(content) <= 500),
        CONSTRAINT valid_message_type CHECK (message_type IN ('text', 'system', 'emote'))
      )
    `);
    console.log('✓ chat_messages 表已就绪');

    // 9. 验证表是否创建成功
    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'game_rooms', 'room_players', 'game_saves', 'chat_messages')
      ORDER BY table_name
    `);

    console.log('✅ 数据库初始化完成！');
    console.log(`📊 已创建 ${result.rows.length} 个表:`, result.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    console.error('错误详情:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export default initDatabase;
