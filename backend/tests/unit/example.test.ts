/**
 * 示例测试文件
 */

describe('Example Test Suite', () => {
  test('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should work with async operations', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  describe('Nested Test Suite', () => {
    test('should handle objects', () => {
      const obj = { name: 'ECHO Game', version: '1.0.0' };
      expect(obj).toHaveProperty('name');
      expect(obj.name).toBe('ECHO Game');
    });

    test('should handle arrays', () => {
      const arr = ['cat', 'dog', 'turtle'];
      expect(arr).toHaveLength(3);
      expect(arr).toContain('cat');
    });
  });
});
