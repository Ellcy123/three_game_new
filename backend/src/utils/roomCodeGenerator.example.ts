/**
 * 房间码生成器使用示例
 *
 * 演示如何使用房间码生成工具的各种功能
 */

import {
  generateRandomCode,
  generateSecureRandomCode,
  generateUniqueRoomCode,
  generateBatchRoomCodes,
  validateRoomCodeFormat,
  formatRoomCode,
  normalizeRoomCode,
  getRoomCodeSpace,
  getRoomCodeStats,
} from './roomCodeGenerator';

/**
 * 示例 1: 基本用法 - 生成唯一房间码
 */
async function example1_generateUniqueCode() {
  console.log('=== 示例 1: 生成唯一房间码 ===');

  try {
    const roomCode = await generateUniqueRoomCode();
    console.log('生成的房间码:', roomCode);
    console.log('格式化显示:', formatRoomCode(roomCode));
  } catch (error) {
    console.error('生成失败:', error);
  }
}

/**
 * 示例 2: 验证房间码格式
 */
function example2_validateFormat() {
  console.log('\n=== 示例 2: 验证房间码格式 ===');

  const testCodes = [
    'ABC234',  // 有效
    'XYZ789',  // 有效
    'abc234',  // 无效 - 小写
    'ABC0EF',  // 无效 - 包含 0
    'ABCI23',  // 无效 - 包含 I
    'ABC-23',  // 无效 - 包含特殊字符
    'ABC',     // 无效 - 长度不足
  ];

  testCodes.forEach(code => {
    const isValid = validateRoomCodeFormat(code);
    console.log(`${code}: ${isValid ? '✓ 有效' : '✗ 无效'}`);
  });
}

/**
 * 示例 3: 标准化用户输入
 */
function example3_normalizeInput() {
  console.log('\n=== 示例 3: 标准化用户输入 ===');

  const userInputs = [
    'abc-234',      // 用户输入小写和分隔符
    'ABC 234',      // 用户输入空格
    '  abc234  ',   // 用户输入带空格
    'abc1o3',       // 用户输入易混淆字符
  ];

  userInputs.forEach(input => {
    const normalized = normalizeRoomCode(input);
    console.log(`输入: "${input}" -> 标准化: "${normalized}"`);
  });
}

/**
 * 示例 4: 格式化房间码显示
 */
function example4_formatDisplay() {
  console.log('\n=== 示例 4: 格式化房间码显示 ===');

  const roomCode = 'ABC234';

  console.log('原始房间码:', roomCode);
  console.log('默认格式:', formatRoomCode(roomCode));           // ABC-234
  console.log('空格分隔:', formatRoomCode(roomCode, ' '));      // ABC 234
  console.log('下划线分隔:', formatRoomCode(roomCode, '_'));    // ABC_234
  console.log('无分隔符:', formatRoomCode(roomCode, ''));       // ABC234
}

/**
 * 示例 5: 生成不同类型的房间码
 */
function example5_generateDifferentTypes() {
  console.log('\n=== 示例 5: 生成不同类型的房间码 ===');

  // 普通随机生成
  const code1 = generateRandomCode();
  console.log('普通随机:', code1);

  // 安全随机生成（推荐）
  const code2 = generateSecureRandomCode();
  console.log('安全随机:', code2);

  // 对比多次生成
  console.log('\n生成 10 个房间码:');
  for (let i = 0; i < 10; i++) {
    console.log(`  ${i + 1}. ${generateSecureRandomCode()}`);
  }
}

/**
 * 示例 6: 批量生成房间码
 */
async function example6_batchGenerate() {
  console.log('\n=== 示例 6: 批量生成房间码 ===');

  try {
    console.log('开始生成 20 个唯一房间码...');
    const codes = await generateBatchRoomCodes(20);

    console.log('\n生成的房间码列表:');
    codes.forEach((code, index) => {
      console.log(`  ${index + 1}. ${formatRoomCode(code)}`);
    });

    console.log(`\n总计: ${codes.length} 个房间码`);
  } catch (error) {
    console.error('批量生成失败:', error);
  }
}

/**
 * 示例 7: 获取房间码空间信息
 */
function example7_codeSpace() {
  console.log('\n=== 示例 7: 房间码空间信息 ===');

  const totalSpace = getRoomCodeSpace();
  console.log('总房间码空间:', totalSpace.toLocaleString());
  console.log('即:', `31^6 = ${totalSpace}`);

  // 计算碰撞概率
  const numRooms = 1000;
  const collisionProbability = (numRooms / totalSpace) * 100;
  console.log(`\n如果有 ${numRooms.toLocaleString()} 个活跃房间:`);
  console.log(`碰撞概率: ${collisionProbability.toFixed(6)}%`);
  console.log('(极低，可以忽略不计)');
}

/**
 * 示例 8: 获取房间码使用统计
 */
async function example8_codeStats() {
  console.log('\n=== 示例 8: 房间码使用统计 ===');

  try {
    const stats = await getRoomCodeStats();

    console.log('房间码统计信息:');
    console.log(`  总空间: ${stats.totalSpace.toLocaleString()}`);
    console.log(`  已使用: ${stats.usedCount.toLocaleString()}`);
    console.log(`  可用: ${stats.availableCount.toLocaleString()}`);
    console.log(`  使用率: ${stats.usagePercentage}%`);

    // 预警检查
    if (stats.usagePercentage > 80) {
      console.log('\n⚠️  警告: 房间码使用率超过 80%!');
    } else if (stats.usagePercentage > 50) {
      console.log('\n⚡ 提示: 房间码使用率超过 50%');
    } else {
      console.log('\n✓ 房间码空间充足');
    }
  } catch (error) {
    console.error('获取统计信息失败:', error);
  }
}

/**
 * 示例 9: 完整的房间创建流程
 */
async function example9_fullRoomCreationFlow() {
  console.log('\n=== 示例 9: 完整的房间创建流程 ===');

  try {
    // 1. 生成唯一房间码
    console.log('步骤 1: 生成唯一房间码...');
    const roomCode = await generateUniqueRoomCode();
    console.log(`  生成成功: ${roomCode}`);

    // 2. 验证格式
    console.log('\n步骤 2: 验证房间码格式...');
    const isValid = validateRoomCodeFormat(roomCode);
    console.log(`  格式验证: ${isValid ? '✓ 通过' : '✗ 失败'}`);

    // 3. 格式化显示
    console.log('\n步骤 3: 格式化显示...');
    const formatted = formatRoomCode(roomCode);
    console.log(`  显示格式: ${formatted}`);

    // 4. 创建房间（伪代码）
    console.log('\n步骤 4: 创建房间记录...');
    console.log(`  INSERT INTO game_rooms (room_code, ...) VALUES ('${roomCode}', ...)`);
    console.log('  ✓ 房间创建成功');

    // 5. 返回给用户
    console.log('\n步骤 5: 返回房间信息给用户...');
    console.log({
      roomCode: roomCode,
      displayCode: formatted,
      message: '房间创建成功！邀请好友使用房间码加入游戏'
    });
  } catch (error) {
    console.error('房间创建流程失败:', error);
  }
}

/**
 * 示例 10: 用户加入房间流程
 */
async function example10_joinRoomFlow() {
  console.log('\n=== 示例 10: 用户加入房间流程 ===');

  // 模拟用户输入
  const userInput = '  abc-234  ';  // 用户可能输入小写、空格、分隔符
  console.log('用户输入的房间码:', `"${userInput}"`);

  // 1. 标准化输入
  console.log('\n步骤 1: 标准化房间码...');
  const normalized = normalizeRoomCode(userInput);
  console.log(`  标准化后: "${normalized}"`);

  // 2. 验证格式
  console.log('\n步骤 2: 验证格式...');
  const isValid = validateRoomCodeFormat(normalized);
  console.log(`  格式验证: ${isValid ? '✓ 通过' : '✗ 失败'}`);

  if (!isValid) {
    console.log('  ✗ 房间码格式不正确，请重新输入');
    return;
  }

  // 3. 查询房间（伪代码）
  console.log('\n步骤 3: 查询房间...');
  console.log(`  SELECT * FROM game_rooms WHERE room_code = '${normalized}'`);
  console.log('  ✓ 找到房间');

  // 4. 加入房间
  console.log('\n步骤 4: 加入房间...');
  console.log('  ✓ 成功加入房间');
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   房间码生成器 - 使用示例演示         ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 运行不需要数据库的示例
  example2_validateFormat();
  example3_normalizeInput();
  example4_formatDisplay();
  example5_generateDifferentTypes();
  example7_codeSpace();

  console.log('\n' + '='.repeat(50));
  console.log('提示: 以下示例需要数据库连接，请在实际环境中运行');
  console.log('='.repeat(50));

  // 以下示例需要数据库连接，仅显示代码
  console.log('\n需要数据库的示例:');
  console.log('  - example1_generateUniqueCode()');
  console.log('  - example6_batchGenerate()');
  console.log('  - example8_codeStats()');
  console.log('  - example9_fullRoomCreationFlow()');
  console.log('  - example10_joinRoomFlow()');

  console.log('\n完成！✨');
}

// 导出示例函数供外部调用
export {
  example1_generateUniqueCode,
  example2_validateFormat,
  example3_normalizeInput,
  example4_formatDisplay,
  example5_generateDifferentTypes,
  example6_batchGenerate,
  example7_codeSpace,
  example8_codeStats,
  example9_fullRoomCreationFlow,
  example10_joinRoomFlow,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
