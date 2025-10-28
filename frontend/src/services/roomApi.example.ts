/**
 * 房间 API 使用示例
 *
 * 演示如何使用 roomApi 的各种方法
 */

import { roomApi } from './roomApi';
import { CharacterType, RoomStatus } from '../types/room.types';

/**
 * 示例 1: 获取房间列表
 */
export async function example1_getRoomList() {
  console.log('=== 示例 1: 获取房间列表 ===');

  try {
    // 获取所有等待中的房间，第1页，每页20条
    const result = await roomApi.getRoomList(RoomStatus.WAITING, 1, 20);

    console.log('房间列表:');
    result.rooms.forEach((room, index) => {
      console.log(
        `  ${index + 1}. ${room.name} - ${room.currentPlayers}/${room.maxPlayers} 玩家`
      );
    });

    console.log('\n分页信息:');
    console.log(`  当前页: ${result.pagination.page}`);
    console.log(`  每页数量: ${result.pagination.pageSize}`);
    console.log(`  总数: ${result.pagination.total}`);
    console.log(`  总页数: ${result.pagination.totalPages}`);
  } catch (error) {
    console.error('获取房间列表失败:', error);
  }
}

/**
 * 示例 2: 创建房间（简化版本）
 */
export async function example2_createRoomSimple() {
  console.log('\n=== 示例 2: 创建房间（简化版本） ===');

  try {
    // 只传房间名称，其他参数使用默认值
    const room = await roomApi.createRoom('我的游戏房间');

    console.log('房间创建成功:');
    console.log(`  房间ID: ${room.id}`);
    console.log(`  房间名称: ${room.name}`);
    console.log(`  最大玩家数: ${room.maxPlayers}`);
    console.log(`  当前玩家数: ${room.currentPlayers}`);
    console.log(`  房间状态: ${room.status}`);

    return room;
  } catch (error) {
    console.error('创建房间失败:', error);
    throw error;
  }
}

/**
 * 示例 3: 创建房间（带参数）
 */
export async function example3_createRoomWithParams() {
  console.log('\n=== 示例 3: 创建房间（带参数） ===');

  try {
    // 传入完整参数
    const room = await roomApi.createRoom(
      '高级房间',          // 房间名称
      4,                   // 最大4名玩家
      CharacterType.CAT,   // 选择猫角色
      '房主玩家'           // 用户名
    );

    console.log('房间创建成功:');
    console.log(`  房间ID: ${room.id}`);
    console.log(`  房间名称: ${room.name}`);
    console.log(`  房主角色: ${room.players[0]?.character}`);
    console.log(`  房主用户名: ${room.players[0]?.username}`);

    return room;
  } catch (error) {
    console.error('创建房间失败:', error);
    throw error;
  }
}

/**
 * 示例 4: 创建房间（完整对象版本）
 */
export async function example4_createRoomFull() {
  console.log('\n=== 示例 4: 创建房间（完整对象版本） ===');

  try {
    const room = await roomApi.createRoomFull({
      name: '专业房间',
      maxPlayers: 3,
      character: CharacterType.DOG,
      username: '专业玩家',
      password: 'secret123', // 可选：设置房间密码
    });

    console.log('房间创建成功（带密码）:');
    console.log(`  房间ID: ${room.id}`);
    console.log(`  房间名称: ${room.name}`);
    console.log(`  是否有密码: ${room.password ? '是' : '否'}`);

    return room;
  } catch (error) {
    console.error('创建房间失败:', error);
    throw error;
  }
}

/**
 * 示例 5: 加入房间（简化版本）
 */
export async function example5_joinRoomSimple() {
  console.log('\n=== 示例 5: 加入房间（简化版本） ===');

  try {
    const roomCode = 'ABC123'; // 房间码或房间ID

    // 传入三个必需参数
    const room = await roomApi.joinRoom(
      roomCode,              // 房间码
      CharacterType.TURTLE,  // 角色类型
      '新玩家'               // 角色名称
    );

    console.log('加入房间成功:');
    console.log(`  房间名称: ${room.name}`);
    console.log(`  当前玩家数: ${room.currentPlayers}/${room.maxPlayers}`);
    console.log(`  我的角色: ${CharacterType.TURTLE}`);

    return room;
  } catch (error) {
    console.error('加入房间失败:', error);
    throw error;
  }
}

/**
 * 示例 6: 加入有密码的房间
 */
export async function example6_joinRoomWithPassword() {
  console.log('\n=== 示例 6: 加入有密码的房间 ===');

  try {
    const roomCode = 'XYZ789';
    const password = 'secret123';

    // 传入密码作为第四个参数
    const room = await roomApi.joinRoom(
      roomCode,
      CharacterType.CAT,
      '访客玩家',
      password  // 房间密码
    );

    console.log('加入房间成功（已验证密码）:');
    console.log(`  房间名称: ${room.name}`);

    return room;
  } catch (error) {
    console.error('加入房间失败（密码可能错误）:', error);
    throw error;
  }
}

/**
 * 示例 7: 加入房间（完整对象版本）
 */
export async function example7_joinRoomFull() {
  console.log('\n=== 示例 7: 加入房间（完整对象版本） ===');

  try {
    const room = await roomApi.joinRoomFull({
      roomId: 'room-uuid-here',
      character: CharacterType.DOG,
      username: '专业玩家2',
      password: 'optional-password',
    });

    console.log('加入房间成功:');
    console.log(`  房间名称: ${room.name}`);
    console.log(`  房间玩家列表:`);
    room.players.forEach((player, index) => {
      console.log(`    ${index + 1}. ${player.username} (${player.character})`);
    });

    return room;
  } catch (error) {
    console.error('加入房间失败:', error);
    throw error;
  }
}

/**
 * 示例 8: 离开房间
 */
export async function example8_leaveRoom() {
  console.log('\n=== 示例 8: 离开房间 ===');

  try {
    const roomId = 'room-uuid-here';

    const message = await roomApi.leaveRoom(roomId);

    console.log('离开房间成功:');
    console.log(`  服务器消息: ${message}`);
  } catch (error) {
    console.error('离开房间失败:', error);
    throw error;
  }
}

/**
 * 示例 9: 获取房间详情
 */
export async function example9_getRoomDetails() {
  console.log('\n=== 示例 9: 获取房间详情 ===');

  try {
    const roomId = 'room-uuid-here';

    const room = await roomApi.getRoomDetails(roomId);

    console.log('房间详情:');
    console.log(`  房间ID: ${room.id}`);
    console.log(`  房间名称: ${room.name}`);
    console.log(`  创建者ID: ${room.creatorId}`);
    console.log(`  玩家数: ${room.currentPlayers}/${room.maxPlayers}`);
    console.log(`  房间状态: ${room.status}`);
    console.log(`  创建时间: ${room.createdAt}`);

    console.log('\n  房间成员:');
    room.players.forEach((player, index) => {
      const role = player.isRoomCreator ? '房主' : '成员';
      console.log(`    ${index + 1}. ${player.username} (${player.character}) - ${role}`);
    });

    return room;
  } catch (error) {
    console.error('获取房间详情失败:', error);
    throw error;
  }
}

/**
 * 示例 10: 获取当前用户所在的房间
 */
export async function example10_getCurrentRoom() {
  console.log('\n=== 示例 10: 获取当前用户所在的房间 ===');

  try {
    const room = await roomApi.getCurrentRoom();

    if (room) {
      console.log('您当前在房间中:');
      console.log(`  房间名称: ${room.name}`);
      console.log(`  房间状态: ${room.status}`);
      console.log(`  玩家数: ${room.currentPlayers}/${room.maxPlayers}`);
    } else {
      console.log('您当前不在任何房间中');
    }

    return room;
  } catch (error) {
    console.error('获取当前房间失败:', error);
    throw error;
  }
}

/**
 * 示例 11: 完整的房间流程
 */
export async function example11_completeFlow() {
  console.log('\n=== 示例 11: 完整的房间流程 ===');

  try {
    // 1. 查看房间列表
    console.log('\n步骤 1: 查看可用房间');
    const roomList = await roomApi.getRoomList(RoomStatus.WAITING, 1, 10);
    console.log(`找到 ${roomList.rooms.length} 个等待中的房间`);

    // 2. 创建新房间
    console.log('\n步骤 2: 创建新房间');
    const newRoom = await roomApi.createRoom('测试房间', 3, CharacterType.CAT, '玩家1');
    console.log(`房间创建成功: ${newRoom.id}`);

    // 3. 获取房间详情
    console.log('\n步骤 3: 查看房间详情');
    const roomDetails = await roomApi.getRoomDetails(newRoom.id);
    console.log(`房间详情: ${roomDetails.name}, 状态: ${roomDetails.status}`);

    // 4. 检查当前房间
    console.log('\n步骤 4: 检查当前所在房间');
    const currentRoom = await roomApi.getCurrentRoom();
    console.log(`当前房间: ${currentRoom?.name || '无'}`);

    // 5. 离开房间
    console.log('\n步骤 5: 离开房间');
    await roomApi.leaveRoom(newRoom.id);
    console.log('已离开房间');

    console.log('\n✓ 完整流程执行成功');
  } catch (error) {
    console.error('流程执行失败:', error);
    throw error;
  }
}

/**
 * 示例 12: 错误处理
 */
export async function example12_errorHandling() {
  console.log('\n=== 示例 12: 错误处理 ===');

  // 尝试加入不存在的房间
  try {
    await roomApi.joinRoom('INVALID', CharacterType.CAT, '玩家');
  } catch (error: any) {
    console.log('预期的错误被捕获:');
    console.log(`  错误类型: ${error.constructor.name}`);
    console.log(`  错误信息: ${error.message}`);
    console.log(`  HTTP 状态码: ${error.response?.status || 'N/A'}`);
    console.log(`  错误代码: ${error.response?.data?.error?.code || 'N/A'}`);
  }

  // 尝试创建无效的房间
  try {
    await roomApi.createRoom(''); // 空名称
  } catch (error: any) {
    console.log('\n另一个预期的错误:');
    console.log(`  错误信息: ${error.message}`);
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   房间 API - 使用示例演示             ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('⚠️  注意：以下示例需要：');
  console.log('  1. 后端服务器运行中');
  console.log('  2. 用户已登录（有效的 JWT Token）');
  console.log('  3. 数据库和 Redis 正常运行');
  console.log('\n如果没有满足以上条件，示例将失败。\n');

  const examples = [
    { name: '获取房间列表', fn: example1_getRoomList },
    { name: '创建房间（简化）', fn: example2_createRoomSimple },
    { name: '创建房间（带参数）', fn: example3_createRoomWithParams },
    { name: '获取当前房间', fn: example10_getCurrentRoom },
    { name: '错误处理', fn: example12_errorHandling },
  ];

  for (const example of examples) {
    try {
      console.log(`\n运行: ${example.name}`);
      await example.fn();
      console.log(`✓ ${example.name} 完成`);
    } catch (error) {
      console.log(`✗ ${example.name} 失败`);
    }
  }

  console.log('\n完成！✨');
}

// 导出所有示例函数
export default {
  example1_getRoomList,
  example2_createRoomSimple,
  example3_createRoomWithParams,
  example4_createRoomFull,
  example5_joinRoomSimple,
  example6_joinRoomWithPassword,
  example7_joinRoomFull,
  example8_leaveRoom,
  example9_getRoomDetails,
  example10_getCurrentRoom,
  example11_completeFlow,
  example12_errorHandling,
  runAllExamples,
};
