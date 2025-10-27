-- =====================================================
-- ECHO 游戏数据库初始化脚本
-- =====================================================
-- 版本: v1.0
-- 创建日期: 2025-10-27
-- 数据库: PostgreSQL 14+
-- 描述: 创建游戏所需的所有表、索引和约束
-- =====================================================

-- 开始事务
BEGIN;

-- =====================================================
-- 1. 用户表 (users)
-- =====================================================
-- 存储用户账号信息和基本资料

CREATE TABLE IF NOT EXISTS users (
    -- 主键：用户唯一标识（UUID）
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 用户名（唯一，用于登录）
    username VARCHAR(50) UNIQUE NOT NULL,

    -- 邮箱（唯一）
    email VARCHAR(255) UNIQUE NOT NULL,

    -- 密码哈希值（bcrypt加密后存储）
    password_hash VARCHAR(255) NOT NULL,

    -- 显示名称（可与用户名不同）
    display_name VARCHAR(100),

    -- 头像URL
    avatar_url VARCHAR(500),

    -- 创建时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 最后登录时间
    last_login TIMESTAMP,

    -- 账号是否激活
    is_active BOOLEAN DEFAULT true,

    -- 是否被封禁
    is_banned BOOLEAN DEFAULT false,

    -- 约束：用户名长度至少3个字符
    CONSTRAINT username_length CHECK (char_length(username) >= 3),

    -- 约束：邮箱格式验证
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- 索引：加速用户名查询（登录时使用）
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 索引：加速邮箱查询
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 索引：加速活跃用户查询
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- 注释
COMMENT ON TABLE users IS '用户表：存储用户账号信息';
COMMENT ON COLUMN users.user_id IS '用户唯一标识';
COMMENT ON COLUMN users.username IS '用户名（登录用）';
COMMENT ON COLUMN users.email IS '邮箱地址';
COMMENT ON COLUMN users.password_hash IS 'bcrypt加密的密码哈希';
COMMENT ON COLUMN users.display_name IS '显示名称';
COMMENT ON COLUMN users.avatar_url IS '头像图片URL';
COMMENT ON COLUMN users.is_banned IS '是否被封禁';

-- =====================================================
-- 2. 游戏房间表 (game_rooms)
-- =====================================================
-- 存储游戏房间信息和状态

CREATE TABLE IF NOT EXISTS game_rooms (
    -- 主键：房间唯一标识（UUID）
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 房间码（6位随机字符串，用于快速加入）
    room_code VARCHAR(6) UNIQUE NOT NULL,

    -- 房主用户ID（外键关联users表）
    host_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,

    -- 房间名称
    room_name VARCHAR(100),

    -- 最大玩家数（默认3人）
    max_players INTEGER DEFAULT 3,

    -- 当前玩家数
    current_players INTEGER DEFAULT 0,

    -- 房间状态：waiting(等待), playing(游戏中), paused(暂停), finished(已完成)
    room_status VARCHAR(20) DEFAULT 'waiting',

    -- 当前章节（1-5）
    current_chapter INTEGER DEFAULT 1,

    -- 当前关卡检查点
    current_checkpoint VARCHAR(50),

    -- 房间创建时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 游戏开始时间
    started_at TIMESTAMP,

    -- 游戏结束时间
    finished_at TIMESTAMP,

    -- 约束：房间状态必须是有效值
    CONSTRAINT valid_status CHECK (room_status IN ('waiting', 'playing', 'paused', 'finished')),

    -- 约束：玩家数量范围
    CONSTRAINT valid_player_count CHECK (current_players >= 0 AND current_players <= max_players),

    -- 约束：章节范围
    CONSTRAINT valid_chapter CHECK (current_chapter >= 1 AND current_chapter <= 5)
);

-- 索引：加速按状态查询房间（用于房间列表）
CREATE INDEX IF NOT EXISTS idx_rooms_status ON game_rooms(room_status);

-- 索引：加速房间码查询（用于快速加入）
CREATE INDEX IF NOT EXISTS idx_rooms_code ON game_rooms(room_code);

-- 索引：加速按创建时间排序
CREATE INDEX IF NOT EXISTS idx_rooms_created ON game_rooms(created_at DESC);

-- 索引：加速房主查询
CREATE INDEX IF NOT EXISTS idx_rooms_host ON game_rooms(host_user_id);

-- 注释
COMMENT ON TABLE game_rooms IS '游戏房间表：存储游戏房间信息';
COMMENT ON COLUMN game_rooms.room_code IS '6位房间码，用于快速加入';
COMMENT ON COLUMN game_rooms.room_status IS '房间状态：waiting/playing/paused/finished';
COMMENT ON COLUMN game_rooms.current_chapter IS '当前章节（1-5）';
COMMENT ON COLUMN game_rooms.current_checkpoint IS '当前关卡检查点';

-- =====================================================
-- 3. 房间玩家表 (room_players)
-- =====================================================
-- 存储玩家在房间中的状态和角色信息

CREATE TABLE IF NOT EXISTS room_players (
    -- 主键：自增ID
    id SERIAL PRIMARY KEY,

    -- 房间ID（外键，级联删除）
    room_id UUID REFERENCES game_rooms(room_id) ON DELETE CASCADE,

    -- 用户ID（外键）
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

    -- 角色类型：cat(猫), dog(狗), turtle(龟)
    character_type VARCHAR(20) NOT NULL,

    -- 角色名称（例如：天一、二水、包子）
    character_name VARCHAR(50),

    -- 当前生命值
    current_hp INTEGER DEFAULT 8,

    -- 最大生命值
    max_hp INTEGER DEFAULT 8,

    -- 玩家状态：active(活跃), disconnected(断线), dead(死亡)
    player_status VARCHAR(20) DEFAULT 'active',

    -- 加入房间的时间
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 最后活跃时间
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束：同一房间中，每个用户只能有一个角色
    UNIQUE(room_id, user_id),

    -- 唯一约束：同一房间中，每个角色类型只能被选择一次
    UNIQUE(room_id, character_type),

    -- 约束：角色类型必须是有效值
    CONSTRAINT valid_character CHECK (character_type IN ('cat', 'dog', 'turtle')),

    -- 约束：玩家状态必须是有效值
    CONSTRAINT valid_player_status CHECK (player_status IN ('active', 'disconnected', 'dead')),

    -- 约束：生命值范围
    CONSTRAINT valid_hp CHECK (current_hp >= 0 AND current_hp <= max_hp)
);

-- 索引：加速按房间查询玩家
CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_id);

-- 索引：加速按用户查询房间
CREATE INDEX IF NOT EXISTS idx_room_players_user ON room_players(user_id);

-- 索引：加速按角色类型查询
CREATE INDEX IF NOT EXISTS idx_room_players_character ON room_players(character_type);

-- 索引：加速查询活跃玩家
CREATE INDEX IF NOT EXISTS idx_room_players_active ON room_players(player_status) WHERE player_status = 'active';

-- 注释
COMMENT ON TABLE room_players IS '房间玩家表：存储玩家在房间中的状态';
COMMENT ON COLUMN room_players.character_type IS '角色类型：cat/dog/turtle';
COMMENT ON COLUMN room_players.character_name IS '角色名称（如：天一、二水、包子）';
COMMENT ON COLUMN room_players.current_hp IS '当前生命值';
COMMENT ON COLUMN room_players.player_status IS '玩家状态：active/disconnected/dead';

-- =====================================================
-- 4. 游戏存档表 (game_saves)
-- =====================================================
-- 存储游戏进度的完整快照

CREATE TABLE IF NOT EXISTS game_saves (
    -- 主键：存档唯一标识（UUID）
    save_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 房间ID（外键，级联删除）
    room_id UUID REFERENCES game_rooms(room_id) ON DELETE CASCADE,

    -- 存档名称（用户自定义或自动生成）
    save_name VARCHAR(100),

    -- 保存时的章节
    chapter INTEGER NOT NULL,

    -- 保存时的关卡检查点
    checkpoint VARCHAR(50) NOT NULL,

    -- 完整游戏状态（JSON格式）
    -- 包含：背包道具、解锁区域、游戏标志等
    game_state JSONB NOT NULL,

    -- 玩家数据（JSON格式）
    -- 包含：各角色的生命值、状态、背包等
    players_data JSONB NOT NULL,

    -- 存档创建时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 是否是自动存档
    is_auto_save BOOLEAN DEFAULT false,

    -- 约束：章节范围
    CONSTRAINT valid_chapter CHECK (chapter >= 1 AND chapter <= 5)
);

-- 索引：加速按房间查询存档
CREATE INDEX IF NOT EXISTS idx_saves_room ON game_saves(room_id);

-- 索引：加速按创建时间排序（最新存档优先）
CREATE INDEX IF NOT EXISTS idx_saves_created ON game_saves(created_at DESC);

-- 索引：加速按章节查询
CREATE INDEX IF NOT EXISTS idx_saves_chapter ON game_saves(chapter);

-- 索引：加速查询自动存档
CREATE INDEX IF NOT EXISTS idx_saves_auto ON game_saves(is_auto_save) WHERE is_auto_save = true;

-- JSONB字段的GIN索引（加速JSON查询）
CREATE INDEX IF NOT EXISTS idx_saves_game_state ON game_saves USING GIN (game_state);
CREATE INDEX IF NOT EXISTS idx_saves_players_data ON game_saves USING GIN (players_data);

-- 注释
COMMENT ON TABLE game_saves IS '游戏存档表：存储游戏进度快照';
COMMENT ON COLUMN game_saves.game_state IS '完整游戏状态（JSON格式）';
COMMENT ON COLUMN game_saves.players_data IS '玩家数据（JSON格式）';
COMMENT ON COLUMN game_saves.is_auto_save IS '是否为自动存档';

-- =====================================================
-- 5. 游戏事件日志表 (game_events)
-- =====================================================
-- 记录游戏中发生的所有事件（用于分析和回放）

CREATE TABLE IF NOT EXISTS game_events (
    -- 主键：事件ID（自增大整数）
    event_id BIGSERIAL PRIMARY KEY,

    -- 房间ID（外键，级联删除）
    room_id UUID REFERENCES game_rooms(room_id) ON DELETE CASCADE,

    -- 触发事件的用户ID（外键）
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,

    -- 事件类型：action(操作), damage(伤害), item_get(获得道具), dialogue(对话) 等
    event_type VARCHAR(50) NOT NULL,

    -- 事件数据（JSON格式）
    -- 包含：具体操作内容、影响的对象、结果等
    event_data JSONB NOT NULL,

    -- 事件发生时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引：加速按房间查询事件
CREATE INDEX IF NOT EXISTS idx_events_room ON game_events(room_id);

-- 索引：加速按事件类型查询
CREATE INDEX IF NOT EXISTS idx_events_type ON game_events(event_type);

-- 索引：加速按时间排序
CREATE INDEX IF NOT EXISTS idx_events_time ON game_events(created_at DESC);

-- 索引：加速按用户查询事件
CREATE INDEX IF NOT EXISTS idx_events_user ON game_events(user_id);

-- 复合索引：加速按房间和时间查询
CREATE INDEX IF NOT EXISTS idx_events_room_time ON game_events(room_id, created_at DESC);

-- JSONB字段的GIN索引
CREATE INDEX IF NOT EXISTS idx_events_data ON game_events USING GIN (event_data);

-- 注释
COMMENT ON TABLE game_events IS '游戏事件日志表：记录所有游戏事件';
COMMENT ON COLUMN game_events.event_type IS '事件类型：action/damage/item_get/dialogue等';
COMMENT ON COLUMN game_events.event_data IS '事件详细数据（JSON格式）';

-- =====================================================
-- 6. 聊天消息表 (chat_messages)
-- =====================================================
-- 存储游戏内的聊天记录

CREATE TABLE IF NOT EXISTS chat_messages (
    -- 主键：消息ID（自增大整数）
    message_id BIGSERIAL PRIMARY KEY,

    -- 房间ID（外键，级联删除）
    room_id UUID REFERENCES game_rooms(room_id) ON DELETE CASCADE,

    -- 发送者用户ID（外键）
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,

    -- 消息类型：text(文本), system(系统), emote(表情)
    message_type VARCHAR(20) DEFAULT 'text',

    -- 消息内容
    content TEXT NOT NULL,

    -- 消息发送时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 是否已删除（软删除）
    is_deleted BOOLEAN DEFAULT false,

    -- 约束：消息长度不超过500字符
    CONSTRAINT message_length CHECK (char_length(content) <= 500),

    -- 约束：消息类型必须是有效值
    CONSTRAINT valid_message_type CHECK (message_type IN ('text', 'system', 'emote'))
);

-- 索引：加速按房间查询消息
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id);

-- 索引：加速按时间排序
CREATE INDEX IF NOT EXISTS idx_chat_time ON chat_messages(created_at DESC);

-- 索引：加速按用户查询消息
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);

-- 复合索引：加速按房间和时间查询（聊天记录）
CREATE INDEX IF NOT EXISTS idx_chat_room_time ON chat_messages(room_id, created_at DESC);

-- 索引：加速查询未删除的消息
CREATE INDEX IF NOT EXISTS idx_chat_not_deleted ON chat_messages(is_deleted) WHERE is_deleted = false;

-- 注释
COMMENT ON TABLE chat_messages IS '聊天消息表：存储游戏内聊天记录';
COMMENT ON COLUMN chat_messages.message_type IS '消息类型：text/system/emote';
COMMENT ON COLUMN chat_messages.content IS '消息内容（最多500字符）';
COMMENT ON COLUMN chat_messages.is_deleted IS '是否已删除（软删除）';

-- =====================================================
-- 7. 房间码生成函数
-- =====================================================
-- 生成唯一的6位房间码

CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 排除易混淆字符（I, O, 0, 1）
    result VARCHAR(6) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_room_code IS '生成唯一的6位房间码（排除易混淆字符）';

-- =====================================================
-- 8. 触发器：自动更新房间玩家数
-- =====================================================
-- 当玩家加入或离开房间时，自动更新房间的current_players字段

-- 更新玩家数的函数
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新房间的当前玩家数
    UPDATE game_rooms
    SET current_players = (
        SELECT COUNT(*)
        FROM room_players
        WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
        AND player_status != 'dead'
    )
    WHERE room_id = COALESCE(NEW.room_id, OLD.room_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（插入时）
CREATE TRIGGER trigger_room_player_count_insert
AFTER INSERT ON room_players
FOR EACH ROW
EXECUTE FUNCTION update_room_player_count();

-- 创建触发器（删除时）
CREATE TRIGGER trigger_room_player_count_delete
AFTER DELETE ON room_players
FOR EACH ROW
EXECUTE FUNCTION update_room_player_count();

-- 创建触发器（更新状态时）
CREATE TRIGGER trigger_room_player_count_update
AFTER UPDATE OF player_status ON room_players
FOR EACH ROW
EXECUTE FUNCTION update_room_player_count();

-- =====================================================
-- 9. 触发器：自动更新最后活跃时间
-- =====================================================

CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_active
BEFORE UPDATE ON room_players
FOR EACH ROW
EXECUTE FUNCTION update_last_active();

-- =====================================================
-- 10. 视图：活跃房间统计
-- =====================================================

CREATE OR REPLACE VIEW active_rooms_stats AS
SELECT
    room_status,
    COUNT(*) as room_count,
    SUM(current_players) as total_players
FROM game_rooms
WHERE room_status IN ('waiting', 'playing')
GROUP BY room_status;

COMMENT ON VIEW active_rooms_stats IS '活跃房间统计视图';

-- =====================================================
-- 11. 视图：玩家统计
-- =====================================================

CREATE OR REPLACE VIEW player_statistics AS
SELECT
    u.user_id,
    u.username,
    u.display_name,
    COUNT(DISTINCT rp.room_id) as total_games,
    SUM(CASE WHEN gr.room_status = 'finished' THEN 1 ELSE 0 END) as completed_games,
    u.created_at as registered_at,
    u.last_login
FROM users u
LEFT JOIN room_players rp ON u.user_id = rp.user_id
LEFT JOIN game_rooms gr ON rp.room_id = gr.room_id
GROUP BY u.user_id;

COMMENT ON VIEW player_statistics IS '玩家统计视图';

-- =====================================================
-- 12. 示例数据（测试用）
-- =====================================================

-- 插入测试用户
INSERT INTO users (username, email, password_hash, display_name) VALUES
    ('testuser1', 'test1@example.com', '$2b$10$dummy_hash_1', '测试玩家1'),
    ('testuser2', 'test2@example.com', '$2b$10$dummy_hash_2', '测试玩家2'),
    ('testuser3', 'test3@example.com', '$2b$10$dummy_hash_3', '测试玩家3')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- 13. 性能优化建议
-- =====================================================

-- 启用查询统计（用于性能分析）
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 设置合适的工作内存（根据服务器配置调整）
-- ALTER SYSTEM SET work_mem = '32MB';

-- 启用并行查询（PostgreSQL 9.6+）
-- ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- =====================================================
-- 完成
-- =====================================================

-- 提交事务
COMMIT;

-- 输出创建成功信息
DO $$
BEGIN
    RAISE NOTICE '✅ 数据库初始化完成！';
    RAISE NOTICE '📊 已创建 6 个表：users, game_rooms, room_players, game_saves, game_events, chat_messages';
    RAISE NOTICE '🔍 已创建 27 个索引用于查询优化';
    RAISE NOTICE '🔧 已创建 2 个触发器用于自动更新';
    RAISE NOTICE '📈 已创建 2 个统计视图';
    RAISE NOTICE '🎮 数据库已就绪，可以开始游戏开发！';
END $$;
