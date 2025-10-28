/**
 * 房间路由
 *
 * 定义所有房间相关的 API 端点
 * 基础路径: /api/v1/rooms
 * 所有路由都需要认证
 */

import express, { Router } from 'express';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomList,
  getRoomDetails,
  getCurrentRoom,
  selectCharacter,
} from '../controllers/roomController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

/**
 * 应用认证中间件到所有房间路由
 * 确保所有房间操作都需要用户登录
 */
router.use(authMiddleware);

/**
 * @route   POST /api/v1/rooms/create
 * @desc    创建新房间
 * @access  Private（需要认证）
 * @body    {
 *   name: string,           // 房间名称（必填，1-50字符）
 *   maxPlayers: number,     // 最大玩家数（必填，1-10）
 *   password?: string,      // 房间密码（可选）
 *   character: string,      // 角色类型（必填，cat/dog/turtle）
 *   username: string        // 显示名称（必填，1-20字符）
 * }
 * @response {
 *   success: true,
 *   data: {
 *     room: GameRoom,
 *     message: string
 *   }
 * }
 */
router.post('/create', createRoom);

/**
 * @route   POST /api/v1/rooms/join
 * @desc    加入已存在的房间
 * @access  Private（需要认证）
 * @body    {
 *   roomId: string,         // 房间ID（必填）
 *   character: string,      // 角色类型（必填，cat/dog/turtle）
 *   username: string,       // 显示名称（必填，1-20字符）
 *   password?: string       // 房间密码（如果房间有密码则必填）
 * }
 * @response {
 *   success: true,
 *   data: {
 *     room: GameRoom,
 *     message: string
 *   }
 * }
 */
router.post('/join', joinRoom);

/**
 * @route   POST /api/v1/rooms/leave
 * @desc    离开当前房间
 * @access  Private（需要认证）
 * @body    {
 *   roomId: string          // 房间ID（必填）
 * }
 * @response {
 *   success: true,
 *   data: {
 *     message: string
 *   }
 * }
 */
router.post('/leave', leaveRoom);

/**
 * @route   GET /api/v1/rooms/current
 * @desc    获取当前用户所在的房间
 * @access  Private（需要认证）
 * @response {
 *   success: true,
 *   data: {
 *     room: GameRoom | null,
 *     inRoom: boolean
 *   }
 * }
 */
router.get('/current', getCurrentRoom);

/**
 * @route   GET /api/v1/rooms
 * @desc    获取房间列表
 * @access  Private（需要认证）
 * @query   status?: string         // 房间状态筛选（waiting/playing/paused/finished）
 * @query   page?: number           // 页码（默认1）
 * @query   pageSize?: number       // 每页数量（默认20，最大100）
 * @response {
 *   success: true,
 *   data: {
 *     rooms: RoomListItem[],
 *     pagination: {
 *       page: number,
 *       pageSize: number,
 *       total: number,
 *       totalPages: number
 *     }
 *   }
 * }
 */
router.get('/', getRoomList);

/**
 * @route   GET /api/v1/rooms/:roomId
 * @desc    获取房间详情
 * @access  Private（需要认证）
 * @params  roomId: string          // 房间ID
 * @response {
 *   success: true,
 *   data: {
 *     room: GameRoom
 *   }
 * }
 */
router.get('/:roomId', getRoomDetails);

/**
 * @route   POST /api/v1/rooms/:roomId/character
 * @desc    选择角色（房间内）
 * @access  Private（需要认证）
 * @params  roomId: string          // 房间ID
 * @body    {
 *   character: string       // 角色类型（必填，cat/dog/turtle）
 * }
 * @response {
 *   success: true,
 *   data: {
 *     room: GameRoom,
 *     message: string
 *   }
 * }
 */
router.post('/:roomId/character', selectCharacter);

/**
 * 路由优先级说明：
 * - /current 放在 /:roomId 之前，确保不会被参数路由捕获
 * - /create, /join, /leave 使用 POST 方法，不会与 GET 方法的 / 和 /:roomId 冲突
 * - /:roomId/character 放在 /:roomId 之后，更具体的路由
 */

export default router;
