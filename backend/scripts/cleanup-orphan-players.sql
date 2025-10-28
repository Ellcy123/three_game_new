-- =====================================================
-- 清理孤儿玩家记录脚本
-- =====================================================
-- 用途：删除数据库中的孤儿玩家记录（没有关联用户或房间状态异常）
-- =====================================================

-- 1. 查看所有房间的玩家情况
SELECT
    gr.room_id,
    gr.room_code,
    gr.room_name,
    gr.room_status,
    gr.current_players,
    rp.user_id,
    rp.character_type,
    rp.player_status
FROM game_rooms gr
LEFT JOIN room_players rp ON gr.room_id = rp.room_id
ORDER BY gr.room_id, rp.user_id;

-- 2. 查找current_players不匹配的房间
SELECT
    gr.room_id,
    gr.room_code,
    gr.current_players AS recorded_count,
    COUNT(rp.id) AS actual_count
FROM game_rooms gr
LEFT JOIN room_players rp ON gr.room_id = rp.room_id AND rp.player_status != 'dead'
GROUP BY gr.room_id, gr.room_code, gr.current_players
HAVING gr.current_players != COUNT(rp.id);

-- 3. 修复current_players计数（不删除数据，只更新计数）
UPDATE game_rooms
SET current_players = (
    SELECT COUNT(*)
    FROM room_players
    WHERE room_id = game_rooms.room_id
    AND player_status != 'dead'
);

-- 4. 验证修复结果
SELECT
    gr.room_id,
    gr.room_code,
    gr.current_players AS recorded_count,
    COUNT(rp.id) AS actual_count
FROM game_rooms gr
LEFT JOIN room_players rp ON gr.room_id = rp.room_id AND rp.player_status != 'dead'
GROUP BY gr.room_id, gr.room_code, gr.current_players;

-- =====================================================
-- 可选：清理特定房间的所有玩家（危险操作！）
-- =====================================================
-- 取消下面的注释并替换 <ROOM_ID> 来清理特定房间
-- DELETE FROM room_players WHERE room_id = <ROOM_ID>;
-- UPDATE game_rooms SET current_players = 0 WHERE room_id = <ROOM_ID>;
