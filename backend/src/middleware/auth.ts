/**
 * 认证中间件
 *
 * 验证请求中的 JWT Token，保护需要认证的路由
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

/**
 * JWT Payload 接口
 */
interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * 扩展 Express Request 接口，添加用户信息
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: string;
    }
  }
}

/**
 * 认证中间件
 *
 * 验证请求头中的 Authorization Token
 * 如果 Token 有效，将用户信息添加到 req.user
 *
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. 获取 Authorization 头
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('未提供认证令牌', 401, 'NO_TOKEN');
    }

    // 2. 检查格式：Bearer <token>
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('认证令牌格式错误', 401, 'INVALID_TOKEN_FORMAT');
    }

    // 3. 提取 Token
    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    if (!token) {
      throw new AppError('认证令牌为空', 401, 'EMPTY_TOKEN');
    }

    // 4. 验证 Token
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET 环境变量未设置');
      throw new AppError('服务器配置错误', 500, 'SERVER_CONFIG_ERROR');
    }

    try {
      // 解析并验证 Token
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      // 5. 将用户信息添加到请求对象
      req.user = decoded;
      req.userId = decoded.userId;

      // 6. 继续处理请求
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new AppError('认证令牌已过期', 401, 'TOKEN_EXPIRED');
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new AppError('认证令牌无效', 401, 'INVALID_TOKEN');
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    // 如果是 AppError，直接传递给错误处理中间件
    if (error instanceof AppError) {
      next(error);
      return;
    }

    // 其他错误
    console.error('认证中间件错误:', error);
    next(new AppError('认证失败', 401, 'AUTH_ERROR'));
  }
};

/**
 * 可选认证中间件
 *
 * 如果提供了 Token 则验证，没有提供则跳过
 * 适用于某些既可以匿名访问也可以认证访问的路由
 *
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // 如果没有提供 Token，直接跳过
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    // 有 Token，尝试验证
    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (jwtSecret && token) {
      try {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        req.user = decoded;
        req.userId = decoded.userId;
      } catch (jwtError) {
        // Token 无效，但不抛出错误，继续处理
        console.warn('可选认证失败:', jwtError);
      }
    }

    next();
  } catch (error) {
    // 不抛出错误，继续处理
    console.error('可选认证中间件错误:', error);
    next();
  }
};

/**
 * 检查用户是否已认证的辅助函数
 *
 * @param req Express Request
 * @returns boolean
 */
export const isAuthenticated = (req: Request): boolean => {
  return !!req.user && !!req.userId;
};

/**
 * 获取当前认证用户 ID
 *
 * @param req Express Request
 * @returns string | null
 */
export const getCurrentUserId = (req: Request): string | null => {
  return req.userId || null;
};

/**
 * 导出默认对象
 */
export default {
  authMiddleware,
  optionalAuthMiddleware,
  isAuthenticated,
  getCurrentUserId,
};
