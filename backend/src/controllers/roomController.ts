/**
 * 房间控制器
 *
 * 处理游戏房间相关的 HTTP 请求
 * 包括创建房间、加入房间、离开房间、获取房间列表和详情
 */

import { Request, Response, NextFunction } from 'express';
import { roomService } from '../services/roomService';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import {
  CreateRoomRequest,
  JoinRoomRequest,
  LeaveRoomRequest,
  RoomStatus,
  CharacterType,
} from '../types';

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
 * 验证角色类型是否有效
 */
function isValidCharacterType(character: any): character is CharacterType {
  return ['cat', 'dog', 'turtle'].includes(character);
}

/**
 * 验证房间状态是否有效
 */
function isValidRoomStatus(status: any): status is RoomStatus {
  return ['waiting', 'playing', 'paused', 'finished'].includes(status);
}

/**
 * 创建房间
 *
 * @route   POST /api/v1/rooms/create
 * @access  Private（需要认证）
 */
export const createRoom = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. 验证用户已认证
      const userId = req.userId;

      if (!userId) {
        throw new AppError('用户未认证', 401, 'UNAUTHORIZED');
      }

      // 2. 验证请求体
      const { name, maxPlayers, password, character, username } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError('房间名称不能为空', 400, 'INVALID_ROOM_NAME');
      }

      if (name.length > 50) {
        throw new AppError('房间名称不能超过50个字符', 400, 'ROOM_NAME_TOO_LONG');
      }

      if (!maxPlayers || typeof maxPlayers !== 'number') {
        throw new AppError('最大玩家数必须是数字', 400, 'INVALID_MAX_PLAYERS');
      }

      if (maxPlayers < 1 || maxPlayers > 10) {
        throw new AppError('最大玩家数必须在1-10之间', 400, 'INVALID_MAX_PLAYERS_RANGE');
      }

      if (!character || !isValidCharacterType(character)) {
        throw new AppError('无效的角色类型', 400, 'INVALID_CHARACTER_TYPE');
      }

      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        throw new AppError('用户名不能为空', 400, 'INVALID_USERNAME');
      }

      if (username.length > 20) {
        throw new AppError('用户名不能超过20个字符', 400, 'USERNAME_TOO_LONG');
      }

      // 3. 检查用户是否已在其他房间中
      const currentRoom = await roomService.getUserCurrentRoom(userId);

      if (currentRoom) {
        throw new AppError(
          '您已在另一个房间中，请先离开当前房间',
          400,
          'ALREADY_IN_ROOM'
        );
      }

      // 4. 构建创建房间请求
      const createRoomRequest: CreateRoomRequest = {
        name: name.trim(),
        maxPlayers,
        password: password?.trim() || undefined,
        character,
        username: username.trim(),
      };

      // 5. 调用服务创建房间
      const room = await roomService.createRoom(createRoomRequest, userId);

      // 6. 返回成功响应
      res.status(201).json({
        success: true,
        data: {
          room,
          message: '房间创建成功',
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 加入房间
 *
 * @route   POST /api/v1/rooms/join
 * @access  Private（需要认证）
 */
export const joinRoom = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. 验证用户已认证
      const userId = req.userId;

      if (!userId) {
        throw new AppError('用户未认证', 401, 'UNAUTHORIZED');
      }

      // 2. 验证请求体
      console.log('🔍 加入房间请求 - userId:', userId);
      console.log('🔍 请求体:', JSON.stringify(req.body, null, 2));

      const { roomId, character, username, password } = req.body;

      if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
        throw new AppError('房间ID不能为空', 400, 'INVALID_ROOM_ID');
      }

      if (!character || !isValidCharacterType(character)) {
        throw new AppError('无效的角色类型', 400, 'INVALID_CHARACTER_TYPE');
      }

      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        throw new AppError('用户名不能为空', 400, 'INVALID_USERNAME');
      }

      if (username.length > 20) {
        throw new AppError('用户名不能超过20个字符', 400, 'USERNAME_TOO_LONG');
      }

      // 3. 检查用户是否已在其他房间中
      const currentRoom = await roomService.getUserCurrentRoom(userId);

      if (currentRoom) {
        // 如果用户已经在目标房间中，直接返回房间信息
        if (currentRoom.id === roomId || currentRoom.roomCode?.toUpperCase() === roomId.trim().toUpperCase()) {
          console.log(`ℹ️  用户 ${userId} 已在房间 ${roomId} 中，返回现有房间信息`);
          res.status(200).json({
            success: true,
            data: {
              room: currentRoom,
              message: '您已在此房间中',
            },
          } as ApiResponse);
          return;
        }

        // 如果在其他房间中，抛出错误
        throw new AppError(
          '您已在另一个房间中，请先离开当前房间',
          400,
          'ALREADY_IN_ROOM'
        );
      }

      // 4. 构建加入房间请求
      const joinRoomRequest: JoinRoomRequest = {
        roomId: roomId.trim(),
        character,
        username: username.trim(),
        password: password?.trim() || undefined,
      };

      // 5. 调用服务加入房间
      const room = await roomService.joinRoom(joinRoomRequest, userId);

      // 6. 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          room,
          message: '成功加入房间',
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 离开房间
 *
 * @route   POST /api/v1/rooms/leave
 * @access  Private（需要认证）
 */
export const leaveRoom = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. 验证用户已认证
      const userId = req.userId;

      if (!userId) {
        throw new AppError('用户未认证', 401, 'UNAUTHORIZED');
      }

      // 2. 验证请求体
      const { roomId } = req.body;

      if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
        throw new AppError('房间ID不能为空', 400, 'INVALID_ROOM_ID');
      }

      // 3. 检查用户是否在该房间中
      const isInRoom = await roomService.isPlayerInRoom(userId, roomId);

      if (!isInRoom) {
        throw new AppError('您不在此房间中', 400, 'NOT_IN_ROOM');
      }

      // 4. 构建离开房间请求
      const leaveRoomRequest: LeaveRoomRequest = {
        roomId: roomId.trim(),
        playerId: userId,
      };

      // 5. 调用服务离开房间
      await roomService.leaveRoom(leaveRoomRequest);

      // 6. 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          message: '成功离开房间',
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取房间列表
 *
 * @route   GET /api/v1/rooms
 * @access  Private（需要认证）
 * @query   status - 房间状态筛选（可选）
 * @query   page - 页码（默认1）
 * @query   pageSize - 每页数量（默认20）
 */
export const getRoomList = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. 验证用户已认证
      const userId = req.userId;

      if (!userId) {
        throw new AppError('用户未认证', 401, 'UNAUTHORIZED');
      }

      // 2. 解析查询参数
      const { status, page, pageSize } = req.query;

      // 验证状态参数
      let roomStatus: RoomStatus | undefined;
      if (status) {
        if (typeof status !== 'string' || !isValidRoomStatus(status)) {
          throw new AppError('无效的房间状态', 400, 'INVALID_ROOM_STATUS');
        }
        roomStatus = status as RoomStatus;
      }

      // 验证分页参数
      const pageNumber = page ? parseInt(page as string, 10) : 1;
      const pageSizeNumber = pageSize ? parseInt(pageSize as string, 10) : 20;

      if (isNaN(pageNumber) || pageNumber < 1) {
        throw new AppError('页码必须是大于0的整数', 400, 'INVALID_PAGE');
      }

      if (isNaN(pageSizeNumber) || pageSizeNumber < 1 || pageSizeNumber > 100) {
        throw new AppError('每页数量必须在1-100之间', 400, 'INVALID_PAGE_SIZE');
      }

      // 3. 调用服务获取房间列表
      const result = await roomService.getRoomList(roomStatus, pageNumber, pageSizeNumber);

      // 4. 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          rooms: result.rooms,
          pagination: {
            page: pageNumber,
            pageSize: pageSizeNumber,
            total: result.total,
            totalPages: Math.ceil(result.total / pageSizeNumber),
          },
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取房间详情
 *
 * @route   GET /api/v1/rooms/:roomId
 * @access  Private（需要认证）
 */
export const getRoomDetails = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. 验证用户已认证
      const userId = req.userId;

      if (!userId) {
        throw new AppError('用户未认证', 401, 'UNAUTHORIZED');
      }

      // 2. 获取房间ID
      const { roomId } = req.params;

      if (!roomId || roomId.trim().length === 0) {
        throw new AppError('房间ID不能为空', 400, 'INVALID_ROOM_ID');
      }

      // 3. 调用服务获取房间详情
      const room = await roomService.getRoomDetails(roomId);

      // 4. 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          room,
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取当前用户所在的房间
 *
 * @route   GET /api/v1/rooms/current
 * @access  Private（需要认证）
 */
export const getCurrentRoom = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. 验证用户已认证
      const userId = req.userId;

      if (!userId) {
        throw new AppError('用户未认证', 401, 'UNAUTHORIZED');
      }

      // 2. 调用服务获取当前房间
      const room = await roomService.getUserCurrentRoom(userId);

      // 3. 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          room: room || null,
          inRoom: !!room,
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 导出控制器函数
 */
export default {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomList,
  getRoomDetails,
  getCurrentRoom,
};
