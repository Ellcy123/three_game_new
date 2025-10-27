/**
 * Jest测试环境设置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.LOG_LEVEL = 'error'; // 测试时只显示错误日志

// 模拟环境变量
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/echo_game_test';
}

if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379/1'; // 使用database 1作为测试库
}

// 全局测试超时
jest.setTimeout(10000);

// 测试前后钩子
beforeAll(() => {
  // 可以在这里初始化测试数据库连接等
});

afterAll(() => {
  // 清理资源
});
