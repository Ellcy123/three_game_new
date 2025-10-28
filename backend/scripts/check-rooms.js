/**
 * 检查数据库中的房间
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkRooms() {
  const client = await pool.connect();

  try {
    console.log('🔍 检查数据库中的房间...\n');

    // 查询所有房间
    const roomsResult = await client.query(`
      SELECT
        room_id,
        room_code,
        room_name,
        host_user_id,
        max_players,
        current_players,
        room_status,
        created_at
      FROM game_rooms
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`📊 找到 ${roomsResult.rows.length} 个房间:\n`);

    if (roomsResult.rows.length === 0) {
      console.log('❌ 数据库中没有房间\n');
    } else {
      roomsResult.rows.forEach((room, index) => {
        console.log(`${index + 1}. 房间 ID: ${room.room_id}`);
        console.log(`   房间码: ${room.room_code}`);
        console.log(`   名称: ${room.room_name}`);
        console.log(`   房主: ${room.host_user_id}`);
        console.log(`   玩家: ${room.current_players}/${room.max_players}`);
        console.log(`   状态: ${room.room_status}`);
        console.log(`   创建时间: ${room.created_at}`);
        console.log('');
      });
    }

    // 查询所有玩家
    const playersResult = await client.query(`
      SELECT
        rp.id,
        rp.room_id,
        rp.user_id,
        rp.character_type,
        rp.player_status,
        u.username
      FROM room_players rp
      LEFT JOIN users u ON rp.user_id = u.user_id
      ORDER BY rp.room_id, rp.id
      LIMIT 50
    `);

    console.log(`👥 找到 ${playersResult.rows.length} 个玩家记录:\n`);

    if (playersResult.rows.length === 0) {
      console.log('❌ 数据库中没有玩家记录\n');
    } else {
      playersResult.rows.forEach((player, index) => {
        console.log(`${index + 1}. 玩家记录 ID: ${player.id}`);
        console.log(`   房间 ID: ${player.room_id}`);
        console.log(`   用户 ID: ${player.user_id} (${player.username})`);
        console.log(`   角色: ${player.character_type || 'NULL'}`);
        console.log(`   状态: ${player.player_status}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 执行检查
checkRooms()
  .then(() => {
    console.log('✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 检查失败:', error);
    process.exit(1);
  });
