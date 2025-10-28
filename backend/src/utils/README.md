# 房间码生成器 (Room Code Generator)

## 概述

房间码生成器是一个用于生成唯一 6 位房间码的工具模块，用于玩家快速加入游戏房间。

## 特性

- ✅ 生成 6 位大写字母和数字组合
- ✅ 排除易混淆字符（0/O, 1/I/L）
- ✅ 确保房间码唯一性
- ✅ 支持加密安全的随机数生成
- ✅ 提供格式化和验证功能
- ✅ 批量生成支持
- ✅ 统计信息查询

## 字符集

使用 31 个字符：`ABCDEFGHJKMNPQRSTUVWXYZ23456789`

**排除的字符：**
- `0` (数字零) - 与字母 O 相似
- `1` (数字一) - 与字母 I、L 相似
- `O` (字母O) - 与数字 0 相似
- `I` (字母I) - 与数字 1 相似
- `L` (字母L) - 与数字 1 相似

## 房间码空间

- **总组合数**: 31^6 = 887,503,681 (8.8 亿)
- **碰撞概率**: 极低（1000 个房间时约 0.0001%）

## API 文档

### 核心功能

#### `generateUniqueRoomCode(maxAttempts?: number): Promise<string>`

生成唯一的房间码（主要方法）

```typescript
const roomCode = await generateUniqueRoomCode();
// 返回: "ABC234"
```

#### `generateRandomCode(): string`

生成随机房间码（不验证唯一性）

```typescript
const code = generateRandomCode();
// 返回: "XYZ789"
```

#### `generateSecureRandomCode(): string`

使用加密安全的随机数生成器（推荐）

```typescript
const code = generateSecureRandomCode();
// 返回: "MNP456"
```

### 验证功能

#### `validateRoomCodeFormat(code: string): boolean`

验证房间码格式是否正确

```typescript
validateRoomCodeFormat('ABC234'); // true
validateRoomCodeFormat('abc234'); // false (小写)
validateRoomCodeFormat('ABC0EF'); // false (包含 0)
```

#### `isCodeExists(code: string): Promise<boolean>`

检查房间码是否已在数据库中存在

```typescript
const exists = await isCodeExists('ABC234');
```

### 格式化功能

#### `formatRoomCode(code: string, separator?: string): string`

格式化房间码为易读形式

```typescript
formatRoomCode('ABC234');        // 'ABC-234'
formatRoomCode('ABC234', ' ');   // 'ABC 234'
formatRoomCode('ABC234', '');    // 'ABC234'
```

#### `normalizeRoomCode(input: string): string`

标准化用户输入的房间码

```typescript
normalizeRoomCode('abc-234');     // 'ABC234'
normalizeRoomCode('  abc 234  '); // 'ABC234'
normalizeRoomCode('abc1o3');      // 'ABC3' (移除 1 和 O)
```

### 批量操作

#### `generateBatchRoomCodes(count: number): Promise<string[]>`

批量生成唯一房间码

```typescript
const codes = await generateBatchRoomCodes(100);
// 返回: ['ABC234', 'XYZ789', ...]
```

### 统计信息

#### `getRoomCodeSpace(): number`

获取房间码空间大小

```typescript
const space = getRoomCodeSpace();
// 返回: 887503681
```

#### `getRoomCodeStats(): Promise<object>`

获取房间码使用统计

```typescript
const stats = await getRoomCodeStats();
// 返回: {
//   totalSpace: 887503681,
//   usedCount: 150,
//   availableCount: 887503531,
//   usagePercentage: 0.0001
// }
```

## 使用示例

### 1. 创建房间时生成房间码

```typescript
import { generateUniqueRoomCode } from './utils/roomCodeGenerator';

async function createRoom() {
  try {
    const roomCode = await generateUniqueRoomCode();
    console.log('房间码:', roomCode);

    // 保存到数据库
    await db.query(
      'INSERT INTO game_rooms (room_code, ...) VALUES ($1, ...)',
      [roomCode]
    );
  } catch (error) {
    console.error('生成房间码失败:', error);
  }
}
```

### 2. 用户加入房间时验证房间码

```typescript
import { normalizeRoomCode, validateRoomCodeFormat } from './utils/roomCodeGenerator';

function joinRoom(userInput: string) {
  // 标准化用户输入
  const roomCode = normalizeRoomCode(userInput);

  // 验证格式
  if (!validateRoomCodeFormat(roomCode)) {
    throw new Error('房间码格式不正确');
  }

  // 查询房间
  const room = await db.query(
    'SELECT * FROM game_rooms WHERE room_code = $1',
    [roomCode]
  );

  if (!room) {
    throw new Error('房间不存在');
  }

  // 加入房间...
}
```

### 3. 显示房间码给用户

```typescript
import { formatRoomCode } from './utils/roomCodeGenerator';

function displayRoom(room) {
  const formattedCode = formatRoomCode(room.code);

  console.log(`房间码: ${formattedCode}`);
  // 显示: 房间码: ABC-234

  // 在 UI 中可以使用更大的字体和间距
  // A B C - 2 3 4
}
```

### 4. 监控房间码使用情况

```typescript
import { getRoomCodeStats } from './utils/roomCodeGenerator';

async function monitorRoomCodes() {
  const stats = await getRoomCodeStats();

  console.log('房间码使用情况:');
  console.log(`已使用: ${stats.usedCount.toLocaleString()}`);
  console.log(`使用率: ${stats.usagePercentage}%`);

  if (stats.usagePercentage > 80) {
    console.warn('⚠️  警告: 房间码使用率超过 80%!');
  }
}
```

## 集成到 RoomService

房间码生成器已集成到 `RoomService` 中：

```typescript
// backend/src/services/roomService.ts

import { generateUniqueRoomCode } from '../utils/roomCodeGenerator';

export class RoomService {
  private async generateRoomCode(): Promise<string> {
    return generateUniqueRoomCode();
  }

  async createRoom(request: CreateRoomRequest, userId: string) {
    const roomCode = await this.generateRoomCode();
    // 创建房间...
  }
}
```

## 测试

运行测试：

```bash
npm test roomCodeGenerator
```

测试覆盖：
- ✅ 房间码长度
- ✅ 字符有效性
- ✅ 唯一性
- ✅ 格式验证
- ✅ 标准化功能
- ✅ 格式化功能
- ✅ 碰撞概率

## 性能考虑

### 生成速度

- 单个房间码生成: < 1ms (不含数据库查询)
- 含唯一性验证: 10-50ms (取决于数据库响应)
- 批量生成 100 个: 1-5 秒

### 碰撞概率

| 活跃房间数 | 碰撞概率 |
|-----------|---------|
| 1,000     | 0.0001% |
| 10,000    | 0.001%  |
| 100,000   | 0.01%   |
| 1,000,000 | 0.1%    |

即使有 100 万个活跃房间，碰撞概率仍然很低。

### 优化建议

1. **缓存预生成的房间码**（可选）
   ```typescript
   // 在系统启动时预生成一批房间码缓存
   const codeCache = await generateBatchRoomCodes(1000);
   ```

2. **使用 Redis 存储房间码池**
   ```typescript
   await redis.sAdd('room_code_pool', codes);
   const code = await redis.sPop('room_code_pool');
   ```

3. **定期清理过期房间**
   ```sql
   DELETE FROM game_rooms
   WHERE room_status = 'finished'
   AND finished_at < NOW() - INTERVAL '24 hours';
   ```

## 安全性

- ✅ 使用加密安全的随机数生成器
- ✅ 不包含敏感信息
- ✅ 排除易混淆字符防止社会工程学攻击
- ✅ 足够长度防止暴力破解（8.8 亿组合）

## 常见问题

### Q: 为什么是 6 位？

**A:** 6 位提供了足够的组合数（8.8 亿），同时保持用户易于输入和记忆的平衡。

### Q: 为什么排除某些字符？

**A:** 排除 0/O, 1/I/L 等易混淆字符，减少用户输入错误和支持请求。

### Q: 如何处理房间码耗尽？

**A:** 当使用率超过 80% 时，可以：
1. 清理过期房间
2. 增加房间码长度到 7 位
3. 实施房间码回收机制

### Q: 是否支持自定义房间码？

**A:** 当前版本不支持。如需支持，建议：
1. 添加自定义房间码验证
2. 确保自定义码也使用相同字符集
3. 检查是否与自动生成的码冲突

## 更新日志

### v1.0.0 (2025-10-28)
- ✨ 初始版本
- ✅ 基本生成功能
- ✅ 验证和格式化功能
- ✅ 批量生成支持
- ✅ 统计信息查询

## 许可证

MIT

## 作者

ECHO Game Backend Team
