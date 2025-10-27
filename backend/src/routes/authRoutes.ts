/**
 * 认证路由
 *
 * 定义所有认证相关的 API 端点
 * 基础路径: /api/v1/auth
 */

import express, { Router } from 'express';
import { register, login, verify, logout } from '@controllers/authController';

const router: Router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    注册新用户
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/v1/auth/verify
 * @desc    验证 Token 是否有效
 * @access  Public（需要 Token）
 */
router.get('/verify', verify);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    用户登出
 * @access  Public（需要 Token）
 */
router.post('/logout', logout);

export default router;
