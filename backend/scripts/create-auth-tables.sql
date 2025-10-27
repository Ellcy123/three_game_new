-- 认证系统所需的数据库表
--
-- 使用方法:
-- psql -U postgres -d three_brothers_game -f scripts/create-auth-tables.sql

-- ========================================
-- 用户表
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,

  -- 添加约束
  CONSTRAINT username_min_length CHECK (LENGTH(username) >= 3),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 添加注释
COMMENT ON TABLE users IS '用户表：存储用户基本信息和认证凭据';
COMMENT ON COLUMN users.id IS '用户唯一标识符';
COMMENT ON COLUMN users.username IS '用户名，3-50 字符，唯一';
COMMENT ON COLUMN users.email IS '用户邮箱，唯一';
COMMENT ON COLUMN users.password_hash IS 'bcrypt 加密的密码哈希';
COMMENT ON COLUMN users.created_at IS '用户注册时间';
COMMENT ON COLUMN users.updated_at IS '用户信息最后更新时间';
COMMENT ON COLUMN users.last_login IS '用户最后登录时间';

-- ========================================
-- 用户统计表
-- ========================================
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0 CHECK (games_played >= 0),
  games_won INTEGER DEFAULT 0 CHECK (games_won >= 0),
  total_playtime INTEGER DEFAULT 0 CHECK (total_playtime >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 确保每个用户只有一条统计记录
  CONSTRAINT unique_user_stats UNIQUE(user_id),

  -- 游戏胜利数不能超过总游戏数
  CONSTRAINT games_won_validation CHECK (games_won <= games_played)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_games_played ON user_stats(games_played DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_games_won ON user_stats(games_won DESC);

-- 添加注释
COMMENT ON TABLE user_stats IS '用户统计表：存储用户游戏统计数据';
COMMENT ON COLUMN user_stats.user_id IS '关联的用户 ID';
COMMENT ON COLUMN user_stats.games_played IS '玩过的游戏总数';
COMMENT ON COLUMN user_stats.games_won IS '获胜的游戏数';
COMMENT ON COLUMN user_stats.total_playtime IS '总游戏时间（秒）';

-- ========================================
-- 用户资料表（可选扩展）
-- ========================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  avatar_url VARCHAR(500),
  bio TEXT,
  country VARCHAR(100),
  preferred_language VARCHAR(10) DEFAULT 'zh-CN',
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_profile UNIQUE(user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- 添加注释
COMMENT ON TABLE user_profiles IS '用户资料表：存储用户个性化设置和资料';
COMMENT ON COLUMN user_profiles.avatar_url IS '用户头像 URL';
COMMENT ON COLUMN user_profiles.bio IS '用户个人简介';
COMMENT ON COLUMN user_profiles.preferred_language IS '偏好语言';
COMMENT ON COLUMN user_profiles.theme IS '界面主题（light/dark）';

-- ========================================
-- 触发器：自动更新 updated_at 字段
-- ========================================

-- 创建通用的更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 users 表添加触发器
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为 user_stats 表添加触发器
DROP TRIGGER IF EXISTS trigger_user_stats_updated_at ON user_stats;
CREATE TRIGGER trigger_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为 user_profiles 表添加触发器
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 视图：用户完整信息
-- ========================================

CREATE OR REPLACE VIEW user_full_info AS
SELECT
  u.id,
  u.username,
  u.email,
  u.created_at,
  u.updated_at,
  u.last_login,
  us.games_played,
  us.games_won,
  us.total_playtime,
  CASE
    WHEN us.games_played > 0 THEN ROUND((us.games_won::NUMERIC / us.games_played::NUMERIC) * 100, 2)
    ELSE 0
  END as win_rate,
  up.avatar_url,
  up.bio,
  up.country,
  up.preferred_language,
  up.theme
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id
LEFT JOIN user_profiles up ON u.id = up.user_id;

COMMENT ON VIEW user_full_info IS '用户完整信息视图：包含用户基本信息、统计数据和资料';

-- ========================================
-- 初始化测试数据（仅用于开发环境）
-- ========================================

-- 插入测试用户（密码为 'password123' 的 bcrypt 哈希）
-- 注意：在生产环境中删除此部分！
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test@example.com') THEN
    INSERT INTO users (username, email, password_hash)
    VALUES (
      'testuser',
      'test@example.com',
      '$2b$10$rBV2kYrBQ/UjQ/x8uOQJJOXxK5FqXqRqYvZkL0mJ5qJL3xK5FqXqR'
    );

    -- 获取刚插入的用户 ID
    DECLARE
      test_user_id INTEGER;
    BEGIN
      SELECT id INTO test_user_id FROM users WHERE email = 'test@example.com';

      -- 插入初始统计数据
      INSERT INTO user_stats (user_id)
      VALUES (test_user_id);

      -- 插入初始资料
      INSERT INTO user_profiles (user_id)
      VALUES (test_user_id);
    END;
  END IF;
END $$;

-- ========================================
-- 输出创建结果
-- ========================================

SELECT 'Tables created successfully!' as message;

-- 显示表结构
\dt users*
\d users
\d user_stats
\d user_profiles
