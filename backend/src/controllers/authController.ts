/**
 * 认证控制器
 *
 * 处理用户认证相关的 HTTP 请求
 * 包括注册、登录、Token 验证和登出
 */

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, transaction } from '@config/database';
import { setCache, deleteCache, getCache } from '@config/redis';

/**
 * 统一响应格式接口
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 注册请求数据接口
 */
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/**
 * 登录请求数据接口
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 用户数据接口
 */
interface UserData {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
}

/**
 * Token 数据接口
 */
interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * JWT Payload 接口
 */
interface JWTPayload {
  userId: number;
  email: string;
  username: string;
}

/**
 * 验证请求中的 Token
 */
interface VerifyResponse {
  valid: boolean;
  user?: UserData;
}

/**
 * 创建统一的成功响应
 */
const successResponse = <T>(data: T): ApiResponse<T> => {
  return {
    success: true,
    data,
  };
};

/**
 * 创建统一的错误响应
 */
const errorResponse = (code: string, message: string, details?: any): ApiResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
};

/**
 * 验证输入数据
 */
const validateInput = (data: any, requiredFields: string[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} 是必填项`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 验证邮箱格式
 */
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证密码强度
 */
const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少为 6 个字符' };
  }

  if (password.length > 100) {
    return { valid: false, message: '密码长度不能超过 100 个字符' };
  }

  // 可以添加更多密码强度验证规则
  // 如：必须包含大小写字母、数字、特殊字符等

  return { valid: true };
};

/**
 * 验证用户名格式
 */
const validateUsername = (username: string): { valid: boolean; message?: string } => {
  if (username.length < 3) {
    return { valid: false, message: '用户名长度至少为 3 个字符' };
  }

  if (username.length > 50) {
    return { valid: false, message: '用户名长度不能超过 50 个字符' };
  }

  // 只允许字母、数字、下划线和连字符
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, message: '用户名只能包含字母、数字、下划线和连字符' };
  }

  return { valid: true };
};

/**
 * 生成 JWT Token
 */
const generateTokens = (payload: JWTPayload): TokenData => {
  const jwtSecret: string = process.env.JWT_SECRET || 'change_this_to_random_secret_key_123456';
  const jwtRefreshSecret: string = process.env.JWT_REFRESH_SECRET || 'change_this_to_random_refresh_key_789012';
  const jwtExpiresIn: string = process.env.JWT_EXPIRES_IN || '24h';
  const jwtRefreshExpiresIn: string = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  // 生成访问令牌
  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn } as jwt.SignOptions);

  // 生成刷新令牌
  const refreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn } as jwt.SignOptions);

  // 计算过期时间（秒）
  const expiresIn = 24 * 60 * 60; // 24 小时

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
};

/**
 * 验证 JWT Token
 */
const verifyToken = (token: string): { valid: boolean; payload?: JWTPayload; error?: string } => {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'change_this_to_random_secret_key_123456';
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    return {
      valid: true,
      payload: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token 已过期' };
    } else if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Token 无效' };
    } else {
      return { valid: false, error: 'Token 验证失败' };
    }
  }
};

/**
 * 从请求头中提取 Token
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // 支持 "Bearer token" 格式
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1] || null;
  }

  // 也支持直接传 token
  return authHeader || null;
};

/**
 * 注册新用户
 *
 * @route POST /api/auth/register
 * @param req Express Request
 * @param res Express Response
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body as RegisterRequest;

    // 1. 验证必填字段
    const inputValidation = validateInput(req.body, ['username', 'email', 'password']);
    if (!inputValidation.valid) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', '输入数据验证失败', {
          errors: inputValidation.errors,
        })
      );
      return;
    }

    // 2. 验证用户名格式
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      res.status(400).json(errorResponse('INVALID_USERNAME', usernameValidation.message!));
      return;
    }

    // 3. 验证邮箱格式
    if (!validateEmail(email)) {
      res.status(400).json(errorResponse('INVALID_EMAIL', '邮箱格式不正确'));
      return;
    }

    // 4. 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json(errorResponse('WEAK_PASSWORD', passwordValidation.message!));
      return;
    }

    // 5. 检查用户名是否已存在
    const usernameExists = await query('SELECT user_id FROM users WHERE username = $1', [username]);
    if (usernameExists.rows.length > 0) {
      res.status(409).json(errorResponse('USERNAME_EXISTS', '用户名已被使用'));
      return;
    }

    // 6. 检查邮箱是否已存在
    const emailExists = await query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (emailExists.rows.length > 0) {
      res.status(409).json(errorResponse('EMAIL_EXISTS', '邮箱已被注册'));
      return;
    }

    // 7. 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 8. 使用事务创建用户（不需要初始化统计数据，因为表不存在）
    const result = await transaction(async (client) => {
      // 插入用户记录
      const userResult = await client.query(
        `INSERT INTO users (username, email, password_hash, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING user_id, username, email, created_at`,
        [username, email, passwordHash]
      );

      return userResult.rows[0];
    });

    // 9. 生成 Token
    const tokens = generateTokens({
      userId: result.user_id,
      email: result.email,
      username: result.username,
    });

    // 10. 将 Token 存入 Redis（用于后续验证和撤销）
    const tokenKey = `auth:token:${result.user_id}`;
    await setCache(tokenKey, tokens.accessToken, tokens.expiresIn);

    // 11. 返回成功响应
    res.status(201).json(
      successResponse({
        user: {
          id: result.user_id,
          username: result.username,
          email: result.email,
          createdAt: result.created_at,
        },
        token: tokens.accessToken,  // 前端期望的是 token 字段
        tokens,  // 保留完整的 tokens 对象供需要时使用
      })
    );
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json(
      errorResponse(
        'INTERNAL_ERROR',
        '注册失败，请稍后重试',
        process.env.NODE_ENV === 'development' ? { error: (error as Error).message } : undefined
      )
    );
  }
};

/**
 * 用户登录
 *
 * @route POST /api/auth/login
 * @param req Express Request
 * @param res Express Response
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequest;

    // 1. 验证必填字段
    const inputValidation = validateInput(req.body, ['email', 'password']);
    if (!inputValidation.valid) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', '输入数据验证失败', {
          errors: inputValidation.errors,
        })
      );
      return;
    }

    // 2. 验证邮箱格式
    if (!validateEmail(email)) {
      res.status(400).json(errorResponse('INVALID_EMAIL', '邮箱格式不正确'));
      return;
    }

    // 3. 查询用户
    const userResult = await query(
      `SELECT user_id, username, email, password_hash, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json(errorResponse('INVALID_CREDENTIALS', '邮箱或密码错误'));
      return;
    }

    const user = userResult.rows[0];

    // 4. 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json(errorResponse('INVALID_CREDENTIALS', '邮箱或密码错误'));
      return;
    }

    // 5. 生成 Token
    const tokens = generateTokens({
      userId: user.user_id,
      email: user.email,
      username: user.username,
    });

    // 6. 将 Token 存入 Redis
    const tokenKey = `auth:token:${user.user_id}`;
    await setCache(tokenKey, tokens.accessToken, tokens.expiresIn);

    // 7. 更新最后登录时间
    await query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);

    // 8. 返回成功响应（不包含密码哈希）
    res.status(200).json(
      successResponse({
        user: {
          id: user.user_id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at,
        },
        token: tokens.accessToken,  // 前端期望的是 token 字段
        tokens,  // 保留完整的 tokens 对象供需要时使用
      })
    );
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json(
      errorResponse(
        'INTERNAL_ERROR',
        '登录失败，请稍后重试',
        process.env.NODE_ENV === 'development' ? { error: (error as Error).message } : undefined
      )
    );
  }
};

/**
 * 验证 Token 是否有效
 *
 * @route GET /api/auth/verify
 * @param req Express Request
 * @param res Express Response
 */
export const verify = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 从请求头提取 Token
    const token = extractToken(req);
    if (!token) {
      res.status(401).json(errorResponse('NO_TOKEN', '未提供认证 Token'));
      return;
    }

    // 2. 验证 Token 格式和签名
    const verification = verifyToken(token);
    if (!verification.valid) {
      res.status(401).json(errorResponse('INVALID_TOKEN', verification.error || 'Token 无效'));
      return;
    }

    const payload = verification.payload!;

    // 3. 检查 Token 是否在 Redis 中（未被撤销）
    const tokenKey = `auth:token:${payload.userId}`;
    const cachedToken = await getCache<string>(tokenKey);

    if (cachedToken !== token) {
      res.status(401).json(errorResponse('TOKEN_REVOKED', 'Token 已被撤销或过期'));
      return;
    }

    // 4. 查询用户最新信息
    const userResult = await query(
      `SELECT user_id, username, email, created_at, last_login
       FROM users
       WHERE user_id = $1`,
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    const user = userResult.rows[0];

    // 5. 返回验证成功响应
    res.status(200).json(
      successResponse<VerifyResponse>({
        valid: true,
        user: {
          id: user.user_id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at,
        },
      })
    );
  } catch (error) {
    console.error('Token 验证失败:', error);
    res.status(500).json(
      errorResponse(
        'INTERNAL_ERROR',
        'Token 验证失败，请稍后重试',
        process.env.NODE_ENV === 'development' ? { error: (error as Error).message } : undefined
      )
    );
  }
};

/**
 * 用户登出
 *
 * @route POST /api/auth/logout
 * @param req Express Request
 * @param res Express Response
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 从请求头提取 Token
    const token = extractToken(req);
    if (!token) {
      res.status(401).json(errorResponse('NO_TOKEN', '未提供认证 Token'));
      return;
    }

    // 2. 验证 Token
    const verification = verifyToken(token);
    if (!verification.valid) {
      // Token 无效也可以视为登出成功
      res.status(200).json(
        successResponse({
          message: '登出成功',
        })
      );
      return;
    }

    const payload = verification.payload!;

    // 3. 从 Redis 中删除 Token（撤销）
    const tokenKey = `auth:token:${payload.userId}`;
    await deleteCache(tokenKey);

    // 4. 可选：记录登出日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`用户 ${payload.username} (ID: ${payload.userId}) 已登出`);
    }

    // 5. 返回成功响应
    res.status(200).json(
      successResponse({
        message: '登出成功',
      })
    );
  } catch (error) {
    console.error('登出失败:', error);
    res.status(500).json(
      errorResponse(
        'INTERNAL_ERROR',
        '登出失败，请稍后重试',
        process.env.NODE_ENV === 'development' ? { error: (error as Error).message } : undefined
      )
    );
  }
};

/**
 * 导出所有控制器函数
 */
export default {
  register,
  login,
  verify,
  logout,
};
