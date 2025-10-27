# 数据库管理文档

## 📋 目录结构

```
database/
├── migrations/
│   └── 001_initial_schema.sql    # 初始数据库表结构
└── README.md                       # 本文件
```

## 🚀 快速开始

### 1. 准备工作

确保已安装PostgreSQL并创建数据库：

```bash
# 使用psql命令行
psql -U postgres

# 创建数据库
CREATE DATABASE three_brothers_game;

# 退出psql
\q
```

### 2. 执行初始化脚本

#### 方法1：使用psql命令行（推荐）

```bash
# Windows
psql -U postgres -d three_brothers_game -f backend/database/migrations/001_initial_schema.sql

# Linux/Mac
psql -U postgres -d three_brothers_game -f backend/database/migrations/001_initial_schema.sql
```

#### 方法2：使用pgAdmin图形界面

1. 打开pgAdmin
2. 连接到PostgreSQL服务器
3. 选择 `three_brothers_game` 数据库
4. 点击 `Tools` -> `Query Tool`
5. 打开 `001_initial_schema.sql` 文件
6. 点击执行按钮（⚡）

#### 方法3：通过Node.js脚本执行（开发中）

```bash
cd backend
npm run db:migrate
```

### 3. 验证安装

```sql
-- 查看所有表
\dt

-- 应该看到以下表：
-- users (用户表)
-- game_rooms (游戏房间表)
-- room_players (房间玩家表)
-- game_saves (游戏存档表)
-- game_events (游戏事件日志表)
-- chat_messages (聊天消息表)

-- 查看表结构
\d users

-- 查看索引
\di

-- 查看视图
\dv
```

## 📊 数据库表说明

### 1. users（用户表）

存储用户账号信息和基本资料。

**主要字段**：
- `user_id` (UUID) - 用户唯一标识
- `username` (VARCHAR) - 用户名（唯一）
- `email` (VARCHAR) - 邮箱（唯一）
- `password_hash` (VARCHAR) - 密码哈希值
- `display_name` (VARCHAR) - 显示名称
- `is_active` (BOOLEAN) - 账号是否激活
- `is_banned` (BOOLEAN) - 是否被封禁

**索引**：
- `idx_users_username` - 用户名索引
- `idx_users_email` - 邮箱索引
- `idx_users_active` - 活跃用户索引

---

### 2. game_rooms（游戏房间表）

存储游戏房间信息和状态。

**主要字段**：
- `room_id` (UUID) - 房间唯一标识
- `room_code` (VARCHAR) - 6位房间码（用于快速加入）
- `host_user_id` (UUID) - 房主用户ID
- `room_name` (VARCHAR) - 房间名称
- `max_players` (INTEGER) - 最大玩家数（默认3）
- `current_players` (INTEGER) - 当前玩家数
- `room_status` (VARCHAR) - 房间状态（waiting/playing/paused/finished）
- `current_chapter` (INTEGER) - 当前章节（1-5）
- `current_checkpoint` (VARCHAR) - 当前检查点

**索引**：
- `idx_rooms_status` - 状态索引（用于房间列表）
- `idx_rooms_code` - 房间码索引（用于快速加入）
- `idx_rooms_created` - 创建时间索引
- `idx_rooms_host` - 房主索引

---

### 3. room_players（房间玩家表）

存储玩家在房间中的状态和角色信息。

**主要字段**：
- `id` (SERIAL) - 主键
- `room_id` (UUID) - 房间ID
- `user_id` (UUID) - 用户ID
- `character_type` (VARCHAR) - 角色类型（cat/dog/turtle）
- `character_name` (VARCHAR) - 角色名称（如：天一、二水、包子）
- `current_hp` (INTEGER) - 当前生命值
- `max_hp` (INTEGER) - 最大生命值
- `player_status` (VARCHAR) - 玩家状态（active/disconnected/dead）

**唯一约束**：
- 同一房间中，每个用户只能有一个角色
- 同一房间中，每个角色类型只能被选择一次

**索引**：
- `idx_room_players_room` - 房间索引
- `idx_room_players_user` - 用户索引
- `idx_room_players_character` - 角色索引
- `idx_room_players_active` - 活跃玩家索引

---

### 4. game_saves（游戏存档表）

存储游戏进度的完整快照。

**主要字段**：
- `save_id` (UUID) - 存档唯一标识
- `room_id` (UUID) - 房间ID
- `save_name` (VARCHAR) - 存档名称
- `chapter` (INTEGER) - 保存时的章节
- `checkpoint` (VARCHAR) - 保存时的检查点
- `game_state` (JSONB) - 完整游戏状态（JSON格式）
- `players_data` (JSONB) - 玩家数据（JSON格式）
- `is_auto_save` (BOOLEAN) - 是否为自动存档

**索引**：
- `idx_saves_room` - 房间索引
- `idx_saves_created` - 创建时间索引
- `idx_saves_chapter` - 章节索引
- `idx_saves_game_state` - JSON字段GIN索引（加速JSON查询）
- `idx_saves_players_data` - JSON字段GIN索引

---

### 5. game_events（游戏事件日志表）

记录游戏中发生的所有事件（用于分析和回放）。

**主要字段**：
- `event_id` (BIGSERIAL) - 事件ID
- `room_id` (UUID) - 房间ID
- `user_id` (UUID) - 触发事件的用户ID
- `event_type` (VARCHAR) - 事件类型（action/damage/item_get/dialogue等）
- `event_data` (JSONB) - 事件详细数据（JSON格式）
- `created_at` (TIMESTAMP) - 事件发生时间

**索引**：
- `idx_events_room` - 房间索引
- `idx_events_type` - 事件类型索引
- `idx_events_time` - 时间索引
- `idx_events_room_time` - 房间和时间复合索引
- `idx_events_data` - JSON字段GIN索引

---

### 6. chat_messages（聊天消息表）

存储游戏内的聊天记录。

**主要字段**：
- `message_id` (BIGSERIAL) - 消息ID
- `room_id` (UUID) - 房间ID
- `user_id` (UUID) - 发送者用户ID
- `message_type` (VARCHAR) - 消息类型（text/system/emote）
- `content` (TEXT) - 消息内容（最多500字符）
- `is_deleted` (BOOLEAN) - 是否已删除（软删除）

**索引**：
- `idx_chat_room` - 房间索引
- `idx_chat_time` - 时间索引
- `idx_chat_room_time` - 房间和时间复合索引
- `idx_chat_not_deleted` - 未删除消息索引

---

## 🔧 触发器和函数

### 1. generate_room_code()

生成唯一的6位房间码（排除易混淆字符I, O, 0, 1）。

```sql
SELECT generate_room_code();
-- 返回示例：ABC2K7
```

### 2. update_room_player_count()

自动更新房间的玩家数量。

**触发时机**：
- 玩家加入房间（INSERT）
- 玩家离开房间（DELETE）
- 玩家状态更新（UPDATE player_status）

### 3. update_last_active()

自动更新玩家的最后活跃时间。

**触发时机**：
- room_players表的任何更新操作

---

## 📈 统计视图

### 1. active_rooms_stats（活跃房间统计）

```sql
SELECT * FROM active_rooms_stats;

-- 返回示例：
-- room_status | room_count | total_players
-- waiting     | 5          | 8
-- playing     | 12         | 36
```

### 2. player_statistics（玩家统计）

```sql
SELECT * FROM player_statistics WHERE username = 'testuser1';

-- 返回示例：
-- user_id | username  | total_games | completed_games | registered_at
-- ...     | testuser1 | 15          | 10              | 2025-10-27...
```

---

## 🛠️ 常用查询

### 查询所有等待中的房间

```sql
SELECT
    room_code,
    room_name,
    current_players,
    max_players,
    created_at
FROM game_rooms
WHERE room_status = 'waiting'
ORDER BY created_at DESC
LIMIT 20;
```

### 查询房间的所有玩家

```sql
SELECT
    rp.character_type,
    rp.character_name,
    rp.current_hp,
    rp.player_status,
    u.username,
    u.display_name
FROM room_players rp
JOIN users u ON rp.user_id = u.user_id
WHERE rp.room_id = '房间UUID'
ORDER BY rp.joined_at;
```

### 查询玩家的游戏历史

```sql
SELECT
    gr.room_code,
    gr.room_name,
    rp.character_type,
    gr.room_status,
    gr.current_chapter,
    gr.created_at
FROM room_players rp
JOIN game_rooms gr ON rp.room_id = gr.room_id
WHERE rp.user_id = '用户UUID'
ORDER BY gr.created_at DESC;
```

### 查询房间的聊天记录（最近50条）

```sql
SELECT
    cm.content,
    cm.message_type,
    cm.created_at,
    u.username,
    u.display_name
FROM chat_messages cm
JOIN users u ON cm.user_id = u.user_id
WHERE cm.room_id = '房间UUID'
    AND cm.is_deleted = false
ORDER BY cm.created_at DESC
LIMIT 50;
```

### 查询游戏事件日志

```sql
SELECT
    event_type,
    event_data,
    created_at,
    u.username
FROM game_events ge
LEFT JOIN users u ON ge.user_id = u.user_id
WHERE ge.room_id = '房间UUID'
ORDER BY ge.created_at DESC
LIMIT 100;
```

---

## 🔐 数据库维护

### 备份数据库

```bash
# 完整备份
pg_dump -U postgres three_brothers_game > backup_$(date +%Y%m%d).sql

# 仅备份数据（不含结构）
pg_dump -U postgres --data-only three_brothers_game > data_backup_$(date +%Y%m%d).sql

# 仅备份结构（不含数据）
pg_dump -U postgres --schema-only three_brothers_game > schema_backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
# 从备份恢复
psql -U postgres three_brothers_game < backup_20251027.sql
```

### 清理测试数据

```sql
-- 删除所有测试用户及相关数据
DELETE FROM users WHERE username LIKE 'testuser%';

-- 删除所有已完成的房间（保留活跃房间）
DELETE FROM game_rooms WHERE room_status = 'finished';

-- 清理旧的事件日志（保留最近30天）
DELETE FROM game_events WHERE created_at < NOW() - INTERVAL '30 days';

-- 清理旧的聊天消息（保留最近7天）
DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '7 days';
```

### 性能优化

```sql
-- 分析表并更新统计信息
ANALYZE users;
ANALYZE game_rooms;
ANALYZE room_players;
ANALYZE game_saves;
ANALYZE game_events;
ANALYZE chat_messages;

-- 重建索引（如果查询变慢）
REINDEX TABLE users;
REINDEX TABLE game_rooms;

-- 清理死元组
VACUUM FULL users;
VACUUM FULL game_rooms;
```

---

## 📊 监控查询

### 检查数据库大小

```sql
SELECT
    pg_size_pretty(pg_database_size('three_brothers_game')) as database_size;
```

### 检查表大小

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 检查慢查询

```sql
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## ⚠️ 注意事项

1. **密码安全**：
   - 用户密码必须使用bcrypt加密后存储在`password_hash`字段
   - 永远不要在数据库中存储明文密码

2. **UUID使用**：
   - 所有主键ID使用UUID格式（除了自增ID）
   - 使用`gen_random_uuid()`函数自动生成

3. **软删除**：
   - 聊天消息使用软删除（`is_deleted`字段）
   - 其他数据建议使用级联删除（CASCADE）

4. **JSONB性能**：
   - JSONB字段已创建GIN索引
   - 复杂JSON查询时使用索引：`WHERE game_state @> '{"key":"value"}'`

5. **时区**：
   - 所有时间戳使用`TIMESTAMP`类型（不带时区）
   - 建议数据库时区设置为UTC

6. **定期维护**：
   - 每周执行`VACUUM`清理死元组
   - 每月执行`ANALYZE`更新统计信息
   - 定期备份数据库

---

## 🐛 故障排查

### 问题1：无法连接数据库

```bash
# 检查PostgreSQL服务是否运行
# Windows
services.msc

# Linux
systemctl status postgresql

# 测试连接
psql -U postgres -h localhost -p 5432
```

### 问题2：权限错误

```sql
-- 授予用户权限
GRANT ALL PRIVILEGES ON DATABASE three_brothers_game TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

### 问题3：表已存在错误

```sql
-- 删除所有表（谨慎使用！）
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS game_events CASCADE;
DROP TABLE IF EXISTS game_saves CASCADE;
DROP TABLE IF EXISTS room_players CASCADE;
DROP TABLE IF EXISTS game_rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 然后重新运行初始化脚本
```

---

## 📚 参考资料

- [PostgreSQL官方文档](https://www.postgresql.org/docs/)
- [JSONB索引优化](https://www.postgresql.org/docs/current/datatype-json.html)
- [pg_stat_statements扩展](https://www.postgresql.org/docs/current/pgstatstatements.html)

---

**最后更新**: 2025-10-27
**数据库版本**: PostgreSQL 14+
**脚本版本**: v1.0
