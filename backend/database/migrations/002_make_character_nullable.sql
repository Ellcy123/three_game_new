-- 迁移脚本：允许 room_players 表中的 character_type 为 NULL
-- 原因：允许玩家先加入房间，再在房间内选择角色

-- 修改 character_type 列，允许 NULL 值
ALTER TABLE room_players
ALTER COLUMN character_type DROP NOT NULL;

-- 注释说明
COMMENT ON COLUMN room_players.character_type IS '角色类型（可选，玩家可以在房间内选择）';
