# 控制器文档

控制器负责处理 HTTP 请求，验证输入，调用服务层，返回响应。

## 认证控制器 (authController.ts)

处理用户认证相关的所有 API 端点。

### API 端点

#### 1. 注册新用户

**端点:** `POST /api/auth/register`

**请求体:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**成功响应 (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 86400
    }
  }
}
```

**错误响应:**

- **400 Bad Request** - 输入验证失败
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "输入数据验证失败",
      "details": {
        "errors": ["username 是必填项"]
      }
    }
  }
  ```

- **409 Conflict** - 用户名或邮箱已存在
  ```json
  {
    "success": false,
    "error": {
      "code": "USERNAME_EXISTS",
      "message": "用户名已被使用"
    }
  }
  ```

**验证规则:**
- `username`: 3-50 字符，只能包含字母、数字、下划线和连字符
- `email`: 有效的邮箱格式
- `password`: 至少 6 个字符，最多 100 个字符

---

#### 2. 用户登录

**端点:** `POST /api/auth/login`

**请求体:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 86400
    }
  }
}
```

**错误响应:**

- **400 Bad Request** - 输入验证失败
- **401 Unauthorized** - 邮箱或密码错误
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_CREDENTIALS",
      "message": "邮箱或密码错误"
    }
  }
  ```

---

#### 3. 验证 Token

**端点:** `GET /api/auth/verify`

**请求头:**
```
Authorization: Bearer <access_token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**错误响应:**

- **401 Unauthorized** - Token 无效或已过期
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_TOKEN",
      "message": "Token 已过期"
    }
  }
  ```

- **401 Unauthorized** - Token 已被撤销
  ```json
  {
    "success": false,
    "error": {
      "code": "TOKEN_REVOKED",
      "message": "Token 已被撤销或过期"
    }
  }
  ```

---

#### 4. 用户登出

**端点:** `POST /api/auth/logout`

**请求头:**
```
Authorization: Bearer <access_token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "message": "登出成功"
  }
}
```

**错误响应:**

- **401 Unauthorized** - 未提供 Token
  ```json
  {
    "success": false,
    "error": {
      "code": "NO_TOKEN",
      "message": "未提供认证 Token"
    }
  }
  ```

---

## 使用示例

### 在路由中使用

```typescript
import express from 'express';
import { register, login, verify, logout } from '@controllers/authController';

const router = express.Router();

// 注册路由
router.post('/register', register);
router.post('/login', login);
router.get('/verify', verify);
router.post('/logout', logout);

export default router;
```

### 客户端调用示例

#### 注册

```typescript
const response = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
  }),
});

const data = await response.json();

if (data.success) {
  // 保存 Token
  localStorage.setItem('accessToken', data.data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
  console.log('注册成功:', data.data.user);
} else {
  console.error('注册失败:', data.error.message);
}
```

#### 登录

```typescript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'password123',
  }),
});

const data = await response.json();

if (data.success) {
  localStorage.setItem('accessToken', data.data.tokens.accessToken);
  console.log('登录成功:', data.data.user);
}
```

#### 验证 Token

```typescript
const token = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/auth/verify', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();

if (data.success && data.data.valid) {
  console.log('Token 有效:', data.data.user);
} else {
  // Token 无效，需要重新登录
  localStorage.removeItem('accessToken');
  window.location.href = '/login';
}
```

#### 登出

```typescript
const token = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();

if (data.success) {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  console.log('登出成功');
  window.location.href = '/login';
}
```

---

## 统一响应格式

所有 API 端点都使用统一的响应格式：

### 成功响应
```typescript
{
  success: true,
  data: {
    // 响应数据
  }
}
```

### 错误响应
```typescript
{
  success: false,
  error: {
    code: string,      // 错误代码
    message: string,   // 错误消息
    details?: any      // 可选的详细信息
  }
}
```

### 常见错误代码

| 错误代码 | 说明 | HTTP 状态码 |
|---------|------|-----------|
| `VALIDATION_ERROR` | 输入数据验证失败 | 400 |
| `INVALID_USERNAME` | 用户名格式不正确 | 400 |
| `INVALID_EMAIL` | 邮箱格式不正确 | 400 |
| `WEAK_PASSWORD` | 密码强度不足 | 400 |
| `USERNAME_EXISTS` | 用户名已被使用 | 409 |
| `EMAIL_EXISTS` | 邮箱已被注册 | 409 |
| `INVALID_CREDENTIALS` | 邮箱或密码错误 | 401 |
| `NO_TOKEN` | 未提供认证 Token | 401 |
| `INVALID_TOKEN` | Token 无效或已过期 | 401 |
| `TOKEN_REVOKED` | Token 已被撤销 | 401 |
| `USER_NOT_FOUND` | 用户不存在 | 404 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |

---

## 安全特性

### 1. 密码安全
- 使用 bcrypt 加密密码（saltRounds = 10）
- 密码最小长度 6 个字符
- 密码不会在响应中返回

### 2. Token 安全
- 使用 JWT 进行身份验证
- Token 存储在 Redis 中，支持撤销
- 支持访问令牌和刷新令牌
- Token 包含过期时间

### 3. 输入验证
- 所有输入都经过严格验证
- 防止 SQL 注入（使用参数化查询）
- 防止 XSS 攻击（输入清理）

### 4. 错误处理
- 统一的错误响应格式
- 不暴露敏感的系统信息
- 开发环境提供详细错误信息

---

## 数据库依赖

控制器依赖以下数据库表：

### users 表
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

### user_stats 表
```sql
CREATE TABLE user_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_playtime INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Redis 依赖

控制器使用 Redis 存储 Token：

### Token 存储格式
```
Key: auth:token:{userId}
Value: <access_token_string>
TTL: 86400 秒（24 小时）
```

---

## 环境变量

控制器使用以下环境变量：

```env
# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d

# 环境
NODE_ENV=development  # 或 production
```

---

## 测试

### 使用 curl 测试

#### 注册
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 登录
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 验证 Token
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 登出
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 最佳实践

1. **始终使用 HTTPS** - 在生产环境中，确保所有认证请求都通过 HTTPS
2. **Token 刷新** - 在 Token 即将过期时主动刷新
3. **安全存储** - 不要在 localStorage 中存储敏感信息，考虑使用 httpOnly cookies
4. **错误处理** - 优雅处理所有错误情况
5. **日志记录** - 记录所有认证相关的操作
6. **限流** - 对登录和注册端点实施限流保护
7. **监控** - 监控异常的认证活动

---

## 未来扩展

可以考虑添加以下功能：

- [ ] 邮箱验证
- [ ] 密码重置
- [ ] 两步验证（2FA）
- [ ] OAuth 登录（Google, GitHub 等）
- [ ] Token 刷新端点
- [ ] 用户资料更新
- [ ] 密码修改
- [ ] 账户注销
