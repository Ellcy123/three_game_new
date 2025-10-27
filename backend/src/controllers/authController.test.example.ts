/**
 * 认证控制器测试示例
 *
 * 这个文件展示了如何测试认证控制器的各个功能
 * 注意：这是示例代码，实际测试需要使用 Jest 或其他测试框架
 *
 * 使用方法：
 * 1. 确保数据库和 Redis 已启动
 * 2. 运行数据库迁移脚本
 * 3. 启动服务器
 * 4. 使用 curl 或 Postman 测试这些端点
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * 测试场景 1: 完整的用户注册流程
 */
async function testRegistration() {
  const registerData = {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
  };

  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registerData),
  });

  const result = await response.json();

  console.log('注册测试结果:');
  console.log('状态码:', response.status);
  console.log('响应:', JSON.stringify(result, null, 2));

  // 预期结果：
  // - status: 201
  // - result.success: true
  // - result.data.user: 包含用户信息
  // - result.data.tokens: 包含访问令牌和刷新令牌

  return result;
}

/**
 * 测试场景 2: 输入验证测试
 */
async function testValidation() {
  console.log('\n=== 测试输入验证 ===\n');

  // 测试 1: 缺少必填字段
  console.log('测试 1: 缺少必填字段');
  const test1 = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test' }), // 缺少 email 和 password
  });
  console.log('状态码:', test1.status); // 应该是 400
  console.log('响应:', await test1.json());

  // 测试 2: 用户名太短
  console.log('\n测试 2: 用户名太短');
  const test2 = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'ab', // 只有 2 个字符
      email: 'test@example.com',
      password: 'password123',
    }),
  });
  console.log('状态码:', test2.status); // 应该是 400
  console.log('响应:', await test2.json());

  // 测试 3: 邮箱格式错误
  console.log('\n测试 3: 邮箱格式错误');
  const test3 = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testuser',
      email: 'invalid-email', // 无效的邮箱格式
      password: 'password123',
    }),
  });
  console.log('状态码:', test3.status); // 应该是 400
  console.log('响应:', await test3.json());

  // 测试 4: 密码太短
  console.log('\n测试 4: 密码太短');
  const test4 = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testuser',
      email: 'test@example.com',
      password: '12345', // 只有 5 个字符
    }),
  });
  console.log('状态码:', test4.status); // 应该是 400
  console.log('响应:', await test4.json());
}

/**
 * 测试场景 3: 登录流程
 */
async function testLogin() {
  console.log('\n=== 测试登录 ===\n');

  // 首先注册一个用户
  await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'logintest',
      email: 'login@example.com',
      password: 'password123',
    }),
  });

  // 测试正确的登录
  console.log('测试 1: 正确的登录凭据');
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'login@example.com',
      password: 'password123',
    }),
  });
  console.log('状态码:', loginResponse.status); // 应该是 200
  const loginResult = (await loginResponse.json()) as any;
  console.log('响应:', JSON.stringify(loginResult, null, 2));

  // 测试错误的密码
  console.log('\n测试 2: 错误的密码');
  const wrongPasswordResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'login@example.com',
      password: 'wrongpassword',
    }),
  });
  console.log('状态码:', wrongPasswordResponse.status); // 应该是 401
  console.log('响应:', await wrongPasswordResponse.json());

  // 测试不存在的用户
  console.log('\n测试 3: 不存在的用户');
  const nonExistentResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nonexistent@example.com',
      password: 'password123',
    }),
  });
  console.log('状态码:', nonExistentResponse.status); // 应该是 401
  console.log('响应:', await nonExistentResponse.json());

  return loginResult;
}

/**
 * 测试场景 4: Token 验证
 */
async function testTokenVerification() {
  console.log('\n=== 测试 Token 验证 ===\n');

  // 首先登录获取 Token
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'login@example.com',
      password: 'password123',
    }),
  });
  const loginResult = (await loginResponse.json()) as any;
  const token = loginResult.data.tokens.accessToken;

  // 测试有效的 Token
  console.log('测试 1: 有效的 Token');
  const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('状态码:', verifyResponse.status); // 应该是 200
  console.log('响应:', await verifyResponse.json());

  // 测试无效的 Token
  console.log('\n测试 2: 无效的 Token');
  const invalidTokenResponse = await fetch('http://localhost:3000/api/auth/verify', {
    method: 'GET',
    headers: {
      Authorization: 'Bearer invalid_token',
    },
  });
  console.log('状态码:', invalidTokenResponse.status); // 应该是 401
  console.log('响应:', await invalidTokenResponse.json());

  // 测试缺少 Token
  console.log('\n测试 3: 缺少 Token');
  const noTokenResponse = await fetch('http://localhost:3000/api/auth/verify', {
    method: 'GET',
  });
  console.log('状态码:', noTokenResponse.status); // 应该是 401
  console.log('响应:', await noTokenResponse.json());
}

/**
 * 测试场景 5: 登出流程
 */
async function testLogout() {
  console.log('\n=== 测试登出 ===\n');

  // 首先登录获取 Token
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'login@example.com',
      password: 'password123',
    }),
  });
  const loginResult = (await loginResponse.json()) as any;
  const token = loginResult.data.tokens.accessToken;

  // 测试登出
  console.log('测试 1: 登出');
  const logoutResponse = await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('状态码:', logoutResponse.status); // 应该是 200
  console.log('响应:', await logoutResponse.json());

  // 验证 Token 已被撤销
  console.log('\n测试 2: 验证 Token 已被撤销');
  const verifyAfterLogoutResponse = await fetch('http://localhost:3000/api/auth/verify', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('状态码:', verifyAfterLogoutResponse.status); // 应该是 401
  console.log('响应:', await verifyAfterLogoutResponse.json());
}

/**
 * 测试场景 6: 重复注册测试
 */
async function testDuplicateRegistration() {
  console.log('\n=== 测试重复注册 ===\n');

  const userData = {
    username: 'duplicate_test',
    email: 'duplicate@example.com',
    password: 'password123',
  };

  // 第一次注册
  console.log('测试 1: 首次注册');
  const firstRegister = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  console.log('状态码:', firstRegister.status); // 应该是 201
  console.log('响应:', await firstRegister.json());

  // 尝试用相同用户名再次注册
  console.log('\n测试 2: 重复的用户名');
  const duplicateUsername = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'duplicate_test', // 相同的用户名
      email: 'different@example.com',
      password: 'password123',
    }),
  });
  console.log('状态码:', duplicateUsername.status); // 应该是 409
  console.log('响应:', await duplicateUsername.json());

  // 尝试用相同邮箱再次注册
  console.log('\n测试 3: 重复的邮箱');
  const duplicateEmail = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'different_user',
      email: 'duplicate@example.com', // 相同的邮箱
      password: 'password123',
    }),
  });
  console.log('状态码:', duplicateEmail.status); // 应该是 409
  console.log('响应:', await duplicateEmail.json());
}

/**
 * 完整测试套件
 */
async function runAllTests() {
  console.log('========================================');
  console.log('   认证控制器测试套件');
  console.log('========================================\n');

  try {
    // 运行所有测试
    await testValidation();
    await testRegistration();
    await testLogin();
    await testTokenVerification();
    await testLogout();
    await testDuplicateRegistration();

    console.log('\n========================================');
    console.log('   ✅ 所有测试完成！');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('   ❌ 测试失败！');
    console.error('========================================');
    console.error('错误:', error);
  }
}

/**
 * 使用 curl 命令测试（复制到终端运行）
 */
const curlCommands = `
# ========================================
# 使用 curl 测试认证 API
# ========================================

# 1. 注册新用户
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# 2. 登录
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 3. 验证 Token（替换 YOUR_TOKEN 为实际的 Token）
curl -X GET http://localhost:3000/api/auth/verify \\
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. 登出
curl -X POST http://localhost:3000/api/auth/logout \\
  -H "Authorization: Bearer YOUR_TOKEN"

# ========================================
# 测试错误情况
# ========================================

# 缺少必填字段
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"username": "test"}'

# 无效的邮箱格式
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "testuser",
    "email": "invalid-email",
    "password": "password123"
  }'

# 密码太短
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "12345"
  }'

# 错误的登录凭据
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }'
`;

// 导出测试函数
export {
  testRegistration,
  testValidation,
  testLogin,
  testTokenVerification,
  testLogout,
  testDuplicateRegistration,
  runAllTests,
  curlCommands,
};
