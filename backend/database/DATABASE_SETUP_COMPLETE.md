# ✅ 数据库结构创建完成

## 📋 完成内容

### 已创建的文件

1. **[migrations/001_initial_schema.sql](migrations/001_initial_schema.sql)** - 完整的数据库初始化脚本
2. **[README.md](README.md)** - 详细的数据库管理文档
3. **[init-db.bat](init-db.bat)** - Windows快捷执行脚本
4. **[init-db.sh](init-db.sh)** - Linux/Mac快捷执行脚本

---

## 🗄️ 数据库表结构

### 创建的6个核心表：

| 表名 | 说明 | 字段数 | 索引数 |
|------|------|--------|--------|
| **users** | 用户表 | 10 | 3 |
| **game_rooms** | 游戏房间表 | 12 | 4 |
| **room_players** | 房间玩家表 | 9 | 4 |
| **game_saves** | 游戏存档表 | 9 | 6 |
| **game_events** | 游戏事件日志表 | 6 | 6 |
| **chat_messages** | 聊天消息表 | 7 | 5 |

**总计**: 6个表，53个字段，28个索引

---

## 🔧 数据库功能特性

### 1. 主键和外键

✅ **UUID主键**
- 所有核心表使用UUID作为主键（除自增ID）
- 自动生成：`DEFAULT gen_random_uuid()`

✅ **外键关联**
- `game_rooms.host_user_id` → `users.user_id`
- `room_players.room_id` → `game_rooms.room_id` (级联删除)
- `room_players.user_id` → `users.user_id` (级联删除)
- `game_saves.room_id` → `game_rooms.room_id` (级联删除)
- `game_events.room_id` → `game_rooms.room_id` (级联删除)
- `chat_messages.room_id` → `game_rooms.room_id` (级联删除)

### 2. 约束条件

✅ **数据完整性约束**
- 用户名长度：至少3个字符
- 邮箱格式：正则表达式验证
- 房间状态：只能是waiting/playing/paused/finished
- 角色类型：只能是cat/dog/turtle
- 生命值范围：0 ≤ current_hp ≤ max_hp
- 消息长度：最多500字符

✅ **唯一性约束**
- 用户名、邮箱唯一
- 房间码唯一
- 同一房间中每个用户只能有一个角色
- 同一房间中每个角色类型只能被选择一次

### 3. 索引优化

✅ **单列索引** (18个)
- 主键索引（自动创建）
- 用户名、邮箱索引
- 房间状态、房间码索引
- 时间戳索引（DESC降序）

✅ **复合索引** (3个)
- `(room_id, created_at)` - 按房间查询历史记录
- `(room_id, player_status)` - 按房间查询活跃玩家

✅ **JSONB GIN索引** (3个)
- `game_saves.game_state` - 加速游戏状态查询
- `game_saves.players_data` - 加速玩家数据查询
- `game_events.event_data` - 加速事件数据查询

### 4. 触发器

✅ **自动更新房间玩家数**
- `trigger_room_player_count_insert` - 玩家加入时
- `trigger_room_player_count_delete` - 玩家离开时
- `trigger_room_player_count_update` - 玩家状态改变时

✅ **自动更新最后活跃时间**
- `trigger_update_last_active` - room_players更新时

### 5. 函数

✅ **generate_room_code()**
- 生成6位唯一房间码
- 排除易混淆字符（I, O, 0, 1）
- 只使用大写字母和数字

### 6. 视图

✅ **active_rooms_stats**
- 统计活跃房间数量和玩家总数
- 按房间状态分组

✅ **player_statistics**
- 统计每个玩家的游戏数据
- 包含总游戏数、完成游戏数等

---

## 📊 数据表详细设计

### 1. users（用户表）

```sql
user_id UUID PRIMARY KEY          -- 用户唯一标识
username VARCHAR(50) UNIQUE       -- 用户名（登录用）
email VARCHAR(255) UNIQUE         -- 邮箱
password_hash VARCHAR(255)        -- 密码哈希
display_name VARCHAR(100)         -- 显示名称
avatar_url VARCHAR(500)           -- 头像URL
created_at TIMESTAMP              -- 注册时间
last_login TIMESTAMP              -- 最后登录时间
is_active BOOLEAN                 -- 是否激活
is_banned BOOLEAN                 -- 是否封禁
```

**关系**：
- 一个用户可以创建多个房间（作为房主）
- 一个用户可以加入多个房间（作为玩家）

---

### 2. game_rooms（游戏房间表）

```sql
room_id UUID PRIMARY KEY          -- 房间唯一标识
room_code VARCHAR(6) UNIQUE       -- 6位房间码
host_user_id UUID                 -- 房主ID（外键→users）
room_name VARCHAR(100)            -- 房间名称
max_players INTEGER               -- 最大玩家数（默认3）
current_players INTEGER           -- 当前玩家数
room_status VARCHAR(20)           -- 状态（waiting/playing/paused/finished）
current_chapter INTEGER           -- 当前章节（1-5）
current_checkpoint VARCHAR(50)    -- 当前检查点
created_at TIMESTAMP              -- 创建时间
started_at TIMESTAMP              -- 开始时间
finished_at TIMESTAMP             -- 结束时间
```

**生命周期**：
```
创建 → 等待玩家 → 游戏中 → 暂停？ → 完成
waiting → playing → paused? → finished
```

---

### 3. room_players（房间玩家表）

```sql
id SERIAL PRIMARY KEY             -- 主键
room_id UUID                      -- 房间ID（外键→game_rooms）
user_id UUID                      -- 用户ID（外键→users）
character_type VARCHAR(20)        -- 角色类型（cat/dog/turtle）
character_name VARCHAR(50)        -- 角色名称（天一/二水/包子）
current_hp INTEGER                -- 当前生命值
max_hp INTEGER                    -- 最大生命值
player_status VARCHAR(20)         -- 玩家状态（active/disconnected/dead）
joined_at TIMESTAMP               -- 加入时间
last_active TIMESTAMP             -- 最后活跃时间
```

**角色系统**：
- 猫（cat）：天一 - 灵活，擅长探索
- 狗（dog）：二水 - 勇敢，擅长战斗
- 龟（turtle）：包子 - 稳重，擅长防御

---

### 4. game_saves（游戏存档表）

```sql
save_id UUID PRIMARY KEY          -- 存档ID
room_id UUID                      -- 房间ID（外键→game_rooms）
save_name VARCHAR(100)            -- 存档名称
chapter INTEGER                   -- 章节
checkpoint VARCHAR(50)            -- 检查点
game_state JSONB                  -- 游戏状态（JSON）
players_data JSONB                -- 玩家数据（JSON）
created_at TIMESTAMP              -- 创建时间
is_auto_save BOOLEAN              -- 是否自动存档
```

**game_state示例**：
```json
{
  "inventory": ["key", "wooden_box"],
  "unlocked_areas": ["small_room", "main_hall"],
  "flags": {
    "cat_rescued": true,
    "dog_rescued": true
  }
}
```

**players_data示例**：
```json
[
  {
    "user_id": "uuid",
    "character_type": "cat",
    "hp": 7,
    "inventory": ["key"]
  }
]
```

---

### 5. game_events（游戏事件日志表）

```sql
event_id BIGSERIAL PRIMARY KEY    -- 事件ID（自增）
room_id UUID                      -- 房间ID（外键→game_rooms）
user_id UUID                      -- 触发用户ID（外键→users）
event_type VARCHAR(50)            -- 事件类型
event_data JSONB                  -- 事件数据（JSON）
created_at TIMESTAMP              -- 发生时间
```

**事件类型**：
- `action` - 玩家操作（使用道具组合）
- `damage` - 受到伤害
- `item_get` - 获得道具
- `dialogue` - 触发对话
- `checkpoint` - 到达检查点

**event_data示例**：
```json
{
  "action_type": "use_item",
  "items": ["water_pool", "turtle"],
  "result": "success",
  "description": "包子潜入水中获得木盒",
  "effects": [
    {
      "type": "item_obtained",
      "item": "wooden_box"
    }
  ]
}
```

---

### 6. chat_messages（聊天消息表）

```sql
message_id BIGSERIAL PRIMARY KEY  -- 消息ID（自增）
room_id UUID                      -- 房间ID（外键→game_rooms）
user_id UUID                      -- 发送者ID（外键→users）
message_type VARCHAR(20)          -- 消息类型（text/system/emote）
content TEXT                      -- 消息内容（最多500字符）
created_at TIMESTAMP              -- 发送时间
is_deleted BOOLEAN                -- 是否删除（软删除）
```

**消息类型**：
- `text` - 普通文本消息
- `system` - 系统消息（如"天一获得了钥匙"）
- `emote` - 表情动作

---

## 🚀 使用方法

### 方法1：使用快捷脚本（推荐）

#### Windows:
```bash
cd backend/database
init-db.bat
```

#### Linux/Mac:
```bash
cd backend/database
./init-db.sh
```

### 方法2：手动执行

```bash
# 1. 确保PostgreSQL正在运行
# 2. 创建数据库（如果还没创建）
psql -U postgres -c "CREATE DATABASE three_brothers_game;"

# 3. 执行初始化脚本
psql -U postgres -d three_brothers_game -f backend/database/migrations/001_initial_schema.sql
```

### 方法3：使用pgAdmin

1. 打开pgAdmin
2. 右键数据库 → Query Tool
3. 打开 `001_initial_schema.sql`
4. 点击执行按钮（⚡）

---

## ✅ 验证安装

执行以下SQL验证安装：

```sql
-- 查看所有表
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 应该看到6个表：
-- users
-- game_rooms
-- room_players
-- game_saves
-- game_events
-- chat_messages

-- 查看索引数量
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
-- 应该返回：28

-- 查看触发器
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trigger%';
-- 应该看到4个触发器

-- 测试房间码生成函数
SELECT generate_room_code();
-- 应该返回类似：ABC2K7
```

---

## 📝 测试数据

脚本已自动插入3个测试用户：

| 用户名 | 邮箱 | 显示名称 |
|--------|------|----------|
| testuser1 | test1@example.com | 测试玩家1 |
| testuser2 | test2@example.com | 测试玩家2 |
| testuser3 | test3@example.com | 测试玩家3 |

**注意**：密码哈希是占位符，实际使用需要通过注册API创建真实用户。

---

## 🔍 常用查询示例

### 查询所有等待中的房间
```sql
SELECT room_code, room_name, current_players, max_players
FROM game_rooms
WHERE room_status = 'waiting'
ORDER BY created_at DESC;
```

### 查询房间的所有玩家
```sql
SELECT u.username, rp.character_type, rp.current_hp
FROM room_players rp
JOIN users u ON rp.user_id = u.user_id
WHERE rp.room_id = '房间UUID';
```

### 查询最近的聊天记录
```sql
SELECT u.username, cm.content, cm.created_at
FROM chat_messages cm
JOIN users u ON cm.user_id = u.user_id
WHERE cm.room_id = '房间UUID'
ORDER BY cm.created_at DESC
LIMIT 50;
```

---

## 🛠️ 维护建议

### 定期备份
```bash
# 每天备份
pg_dump -U postgres three_brothers_game > backup_$(date +%Y%m%d).sql
```

### 性能优化
```sql
-- 每周执行一次
VACUUM ANALYZE;

-- 更新统计信息
ANALYZE users;
ANALYZE game_rooms;
```

### 清理旧数据
```sql
-- 清理30天前的事件日志
DELETE FROM game_events WHERE created_at < NOW() - INTERVAL '30 days';

-- 清理7天前的聊天记录
DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '7 days';
```

---

## 📚 更多信息

详细的数据库使用说明请查看：
- **[database/README.md](README.md)** - 完整的数据库管理文档
- **[docs/sever.md](../../docs/sever.md)** - 服务器架构设计文档

---

## 🎉 下一步

数据库结构已经创建完成！现在可以：

1. ✅ 配置后端连接到数据库
2. ✅ 实现用户注册/登录API
3. ✅ 实现房间创建/加入API
4. ✅ 实现游戏逻辑服务

参考 [backend/QUICKSTART.md](../QUICKSTART.md) 开始后端开发。

---

**数据库版本**: v1.0
**PostgreSQL版本**: 14+
**创建日期**: 2025-10-27
**状态**: ✅ 就绪
