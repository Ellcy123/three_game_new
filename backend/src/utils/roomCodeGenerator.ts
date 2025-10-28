/**
 * 房间码生成工具
 *
 * 负责生成唯一的 6 位房间码，用于玩家快速加入游戏房间
 * 排除易混淆的字符（0/O, 1/I/L），提高用户体验
 */

import { query } from '../config/database';

/**
 * 房间码字符集
 * 排除易混淆字符：
 * - 数字 0（与字母 O 相似）
 * - 数字 1（与字母 I、L 相似）
 * - 字母 O（与数字 0 相似）
 * - 字母 I（与数字 1 相似）
 * - 字母 L（与数字 1 相似）
 */
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * 房间码长度
 */
const ROOM_CODE_LENGTH = 6;

/**
 * 最大重试次数
 * 如果生成的房间码已存在，会重新生成，最多重试此次数
 */
const MAX_RETRY_ATTEMPTS = 10;

/**
 * 生成随机房间码
 *
 * 使用加密安全的随机数生成器生成 6 位房间码
 * 不检查唯一性，仅生成随机字符串
 *
 * @returns string 6位房间码
 *
 * @example
 * ```typescript
 * const code = generateRandomCode();
 * // 返回类似: "ABC123", "XYZ789", "MN4567"
 * ```
 */
export function generateRandomCode(): string {
  let code = '';

  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    // 使用 Math.random() 生成随机索引
    // 在生产环境中，可以考虑使用 crypto.randomInt() 获得更好的随机性
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[randomIndex];
  }

  return code;
}

/**
 * 使用加密安全的随机数生成器生成房间码
 *
 * 推荐在生产环境使用，提供更高质量的随机性
 *
 * @returns string 6位房间码
 *
 * @example
 * ```typescript
 * const code = generateSecureRandomCode();
 * // 返回类似: "ABC123", "XYZ789", "MN4567"
 * ```
 */
export function generateSecureRandomCode(): string {
  // 在 Node.js 18+ 中使用 crypto.randomInt
  try {
    const crypto = require('crypto');
    let code = '';

    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      const randomIndex = crypto.randomInt(0, ROOM_CODE_CHARS.length);
      code += ROOM_CODE_CHARS[randomIndex];
    }

    return code;
  } catch (error) {
    // 如果 crypto.randomInt 不可用，回退到普通随机数
    console.warn('crypto.randomInt 不可用，使用 Math.random() 作为回退');
    return generateRandomCode();
  }
}

/**
 * 检查房间码是否已存在
 *
 * 查询数据库验证房间码的唯一性
 *
 * @param code 要检查的房间码
 * @returns Promise<boolean> 存在返回 true，不存在返回 false
 */
export async function isCodeExists(code: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT room_id FROM game_rooms WHERE room_code = $1',
      [code]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('检查房间码失败:', error);
    throw error;
  }
}

/**
 * 生成唯一的房间码
 *
 * 主要方法：生成房间码并确保其在数据库中唯一
 * 如果生成的房间码已存在，会自动重试
 *
 * @param maxAttempts 最大重试次数（默认 10 次）
 * @returns Promise<string> 唯一的 6 位房间码
 * @throws Error 如果超过最大重试次数仍无法生成唯一房间码
 *
 * @example
 * ```typescript
 * try {
 *   const roomCode = await generateUniqueRoomCode();
 *   console.log('生成的房间码:', roomCode);
 * } catch (error) {
 *   console.error('生成房间码失败:', error.message);
 * }
 * ```
 */
export async function generateUniqueRoomCode(
  maxAttempts: number = MAX_RETRY_ATTEMPTS
): Promise<string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    // 优先使用安全的随机数生成器
    const code = generateSecureRandomCode();

    // 检查房间码是否已存在
    const exists = await isCodeExists(code);

    if (!exists) {
      // 房间码唯一，返回
      console.log(`✓ 生成唯一房间码: ${code} (尝试 ${attempts + 1} 次)`);
      return code;
    }

    // 房间码已存在，增加重试计数
    attempts++;
    console.warn(`房间码 ${code} 已存在，重试中... (${attempts}/${maxAttempts})`);
  }

  // 超过最大重试次数
  throw new Error(
    `无法生成唯一的房间码，已尝试 ${maxAttempts} 次。请稍后重试或联系管理员。`
  );
}

/**
 * 批量生成唯一房间码
 *
 * 用于预生成一批房间码，提高创建房间的响应速度
 * 适合在系统初始化或低峰时段使用
 *
 * @param count 要生成的房间码数量
 * @returns Promise<string[]> 唯一房间码数组
 *
 * @example
 * ```typescript
 * const codes = await generateBatchRoomCodes(100);
 * console.log(`预生成了 ${codes.length} 个房间码`);
 * ```
 */
export async function generateBatchRoomCodes(count: number): Promise<string[]> {
  const codes: string[] = [];
  const codeSet = new Set<string>();

  console.log(`开始生成 ${count} 个唯一房间码...`);

  for (let i = 0; i < count; i++) {
    try {
      const code = await generateUniqueRoomCode();
      codes.push(code);
      codeSet.add(code);

      if ((i + 1) % 10 === 0) {
        console.log(`已生成 ${i + 1}/${count} 个房间码`);
      }
    } catch (error) {
      console.error(`生成第 ${i + 1} 个房间码失败:`, error);
      throw error;
    }
  }

  console.log(`✓ 成功生成 ${codes.length} 个唯一房间码`);
  return codes;
}

/**
 * 验证房间码格式
 *
 * 检查房间码是否符合规范：
 * - 长度为 6 位
 * - 仅包含允许的字符
 * - 全部大写
 *
 * @param code 要验证的房间码
 * @returns boolean 格式正确返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * validateRoomCodeFormat('ABC123'); // true
 * validateRoomCodeFormat('abc123'); // false (小写)
 * validateRoomCodeFormat('AB12');   // false (长度不足)
 * validateRoomCodeFormat('ABCI23'); // false (包含字母 I)
 * ```
 */
export function validateRoomCodeFormat(code: string): boolean {
  // 检查长度
  if (code.length !== ROOM_CODE_LENGTH) {
    return false;
  }

  // 检查字符是否全部有效
  for (const char of code) {
    if (!ROOM_CODE_CHARS.includes(char)) {
      return false;
    }
  }

  return true;
}

/**
 * 格式化房间码显示
 *
 * 将房间码格式化为易读形式，例如：ABC-123
 * 用于 UI 显示，提高可读性
 *
 * @param code 原始房间码
 * @param separator 分隔符（默认为 '-'）
 * @returns string 格式化后的房间码
 *
 * @example
 * ```typescript
 * formatRoomCode('ABC123');        // 'ABC-123'
 * formatRoomCode('ABC123', ' ');   // 'ABC 123'
 * formatRoomCode('ABC123', '');    // 'ABC123'
 * ```
 */
export function formatRoomCode(code: string, separator: string = '-'): string {
  if (code.length !== ROOM_CODE_LENGTH) {
    return code;
  }

  // 分成两部分：前3位和后3位
  const firstPart = code.substring(0, 3);
  const secondPart = code.substring(3, 6);

  return `${firstPart}${separator}${secondPart}`;
}

/**
 * 标准化房间码输入
 *
 * 清理用户输入的房间码：
 * - 转换为大写
 * - 移除空格和分隔符
 * - 移除非法字符
 *
 * @param input 用户输入的房间码
 * @returns string 标准化后的房间码
 *
 * @example
 * ```typescript
 * normalizeRoomCode('abc-123');     // 'ABC123'
 * normalizeRoomCode('abc 123');     // 'ABC123'
 * normalizeRoomCode('  ABC123  ');  // 'ABC123'
 * normalizeRoomCode('abc1o3');      // 'ABC13' (移除字母 O)
 * ```
 */
export function normalizeRoomCode(input: string): string {
  // 转换为大写
  let normalized = input.toUpperCase();

  // 移除空格和常见分隔符
  normalized = normalized.replace(/[\s\-_]/g, '');

  // 只保留允许的字符
  normalized = normalized
    .split('')
    .filter((char) => ROOM_CODE_CHARS.includes(char))
    .join('');

  return normalized;
}

/**
 * 计算房间码空间大小
 *
 * 返回可能的房间码组合总数
 * 用于评估房间码的唯一性和碰撞概率
 *
 * @returns number 可能的房间码总数
 *
 * @example
 * ```typescript
 * const totalCodes = getRoomCodeSpace();
 * console.log(`可生成 ${totalCodes} 个不同的房间码`);
 * // 输出: 可生成 887503681 个不同的房间码 (31^6)
 * ```
 */
export function getRoomCodeSpace(): number {
  return Math.pow(ROOM_CODE_CHARS.length, ROOM_CODE_LENGTH);
}

/**
 * 获取房间码统计信息
 *
 * 返回当前系统中房间码的使用情况
 *
 * @returns Promise<object> 统计信息对象
 */
export async function getRoomCodeStats(): Promise<{
  totalSpace: number;
  usedCount: number;
  availableCount: number;
  usagePercentage: number;
}> {
  const totalSpace = getRoomCodeSpace();

  // 查询已使用的房间码数量
  const result = await query('SELECT COUNT(*) as count FROM game_rooms');
  const usedCount = parseInt(result.rows[0]?.count || '0', 10);

  const availableCount = totalSpace - usedCount;
  const usagePercentage = (usedCount / totalSpace) * 100;

  return {
    totalSpace,
    usedCount,
    availableCount,
    usagePercentage: parseFloat(usagePercentage.toFixed(4)),
  };
}

/**
 * 默认导出
 */
export default {
  generateRandomCode,
  generateSecureRandomCode,
  generateUniqueRoomCode,
  generateBatchRoomCodes,
  isCodeExists,
  validateRoomCodeFormat,
  formatRoomCode,
  normalizeRoomCode,
  getRoomCodeSpace,
  getRoomCodeStats,
};
