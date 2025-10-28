/**
 * 房间码生成器测试
 *
 * 测试房间码生成、验证和格式化功能
 */

import {
  generateRandomCode,
  generateSecureRandomCode,
  validateRoomCodeFormat,
  formatRoomCode,
  normalizeRoomCode,
  getRoomCodeSpace,
} from '../roomCodeGenerator';

describe('房间码生成器', () => {
  describe('generateRandomCode', () => {
    it('应该生成 6 位房间码', () => {
      const code = generateRandomCode();
      expect(code).toHaveLength(6);
    });

    it('应该只包含允许的字符', () => {
      const code = generateRandomCode();
      const allowedChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

      for (const char of code) {
        expect(allowedChars).toContain(char);
      }
    });

    it('应该生成不同的房间码', () => {
      const codes = new Set<string>();

      // 生成 100 个房间码
      for (let i = 0; i < 100; i++) {
        codes.add(generateRandomCode());
      }

      // 期望至少有 95% 的房间码是唯一的
      expect(codes.size).toBeGreaterThan(95);
    });

    it('不应该包含易混淆字符 (0, 1, O, I, L)', () => {
      const confusingChars = ['0', '1', 'O', 'I', 'L'];

      for (let i = 0; i < 100; i++) {
        const code = generateRandomCode();

        for (const char of confusingChars) {
          expect(code).not.toContain(char);
        }
      }
    });
  });

  describe('generateSecureRandomCode', () => {
    it('应该生成 6 位房间码', () => {
      const code = generateSecureRandomCode();
      expect(code).toHaveLength(6);
    });

    it('应该只包含允许的字符', () => {
      const code = generateSecureRandomCode();
      const allowedChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

      for (const char of code) {
        expect(allowedChars).toContain(char);
      }
    });
  });

  describe('validateRoomCodeFormat', () => {
    it('应该验证正确的房间码格式', () => {
      expect(validateRoomCodeFormat('ABC234')).toBe(true);
      expect(validateRoomCodeFormat('XYZ789')).toBe(true);
      expect(validateRoomCodeFormat('MNPQRS')).toBe(true);
    });

    it('应该拒绝长度不正确的房间码', () => {
      expect(validateRoomCodeFormat('ABC')).toBe(false);
      expect(validateRoomCodeFormat('ABCDEFGH')).toBe(false);
      expect(validateRoomCodeFormat('')).toBe(false);
    });

    it('应该拒绝包含非法字符的房间码', () => {
      expect(validateRoomCodeFormat('ABC0EF')).toBe(false); // 包含 0
      expect(validateRoomCodeFormat('ABC1EF')).toBe(false); // 包含 1
      expect(validateRoomCodeFormat('ABCOEF')).toBe(false); // 包含 O
      expect(validateRoomCodeFormat('ABCIEF')).toBe(false); // 包含 I
      expect(validateRoomCodeFormat('ABCLEF')).toBe(false); // 包含 L
    });

    it('应该拒绝小写字母', () => {
      expect(validateRoomCodeFormat('abc234')).toBe(false);
      expect(validateRoomCodeFormat('aBc234')).toBe(false);
    });

    it('应该拒绝包含特殊字符的房间码', () => {
      expect(validateRoomCodeFormat('ABC-23')).toBe(false);
      expect(validateRoomCodeFormat('ABC 23')).toBe(false);
      expect(validateRoomCodeFormat('ABC_23')).toBe(false);
    });
  });

  describe('formatRoomCode', () => {
    it('应该将房间码格式化为 ABC-123 形式', () => {
      expect(formatRoomCode('ABC234')).toBe('ABC-234');
      expect(formatRoomCode('XYZ789')).toBe('XYZ-789');
    });

    it('应该支持自定义分隔符', () => {
      expect(formatRoomCode('ABC234', ' ')).toBe('ABC 234');
      expect(formatRoomCode('ABC234', '_')).toBe('ABC_234');
      expect(formatRoomCode('ABC234', '')).toBe('ABC234');
    });

    it('长度不正确的房间码应该返回原值', () => {
      expect(formatRoomCode('ABC')).toBe('ABC');
      expect(formatRoomCode('ABCDEFGH')).toBe('ABCDEFGH');
    });
  });

  describe('normalizeRoomCode', () => {
    it('应该将小写转换为大写', () => {
      expect(normalizeRoomCode('abc234')).toBe('ABC234');
      expect(normalizeRoomCode('aBc234')).toBe('ABC234');
    });

    it('应该移除空格和分隔符', () => {
      expect(normalizeRoomCode('ABC-234')).toBe('ABC234');
      expect(normalizeRoomCode('ABC 234')).toBe('ABC234');
      expect(normalizeRoomCode('ABC_234')).toBe('ABC234');
      expect(normalizeRoomCode('  ABC234  ')).toBe('ABC234');
    });

    it('应该移除易混淆字符', () => {
      expect(normalizeRoomCode('ABC0EF')).toBe('ABCEF');
      expect(normalizeRoomCode('ABC1EF')).toBe('ABCEF');
      expect(normalizeRoomCode('ABCOEF')).toBe('ABCEF');
      expect(normalizeRoomCode('ABCIEF')).toBe('ABCEF');
      expect(normalizeRoomCode('ABCLEF')).toBe('ABCEF');
    });

    it('应该移除特殊字符', () => {
      expect(normalizeRoomCode('ABC@#$234')).toBe('ABC234');
      expect(normalizeRoomCode('A!B@C#2$3%4')).toBe('ABC234');
    });

    it('应该处理组合情况', () => {
      expect(normalizeRoomCode('  abc-1o3  ')).toBe('ABC3');
      expect(normalizeRoomCode('a b c 2 3 4')).toBe('ABC234');
    });
  });

  describe('getRoomCodeSpace', () => {
    it('应该返回正确的房间码空间大小', () => {
      const space = getRoomCodeSpace();
      // 31 个字符，6 位长度 = 31^6 = 887,503,681
      expect(space).toBe(Math.pow(31, 6));
      expect(space).toBe(887503681);
    });
  });

  describe('房间码唯一性和碰撞概率', () => {
    it('应该有足够大的房间码空间', () => {
      const space = getRoomCodeSpace();

      // 期望至少有 8 亿个可能的组合
      expect(space).toBeGreaterThan(800_000_000);

      console.log(`房间码空间大小: ${space.toLocaleString()}`);
    });

    it('生成 1000 个房间码应该全部唯一', () => {
      const codes = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        codes.add(generateRandomCode());
      }

      // 期望全部唯一
      expect(codes.size).toBe(1000);
    });
  });
});
