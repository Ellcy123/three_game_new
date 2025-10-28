/**
 * 房间 API 服务
 *
 * 提供房间管理相关的 API 调用函数
 */

import api from './api';
import type {
  GameRoom,
  RoomListItem,
  CreateRoomRequest,
  JoinRoomRequest,
  RoomStatus,
} from '../types/room.types';

/**
 * API 响应接口
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
 * 房间列表响应数据
 */
interface RoomListResponse {
  rooms: RoomListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 创建房间响应数据
 */
interface CreateRoomResponse {
  room: GameRoom;
  message: string;
}

/**
 * 加入房间响应数据
 */
interface JoinRoomResponse {
  room: GameRoom;
  message: string;
}

/**
 * 房间详情响应数据
 */
interface RoomDetailsResponse {
  room: GameRoom;
}

/**
 * 当前房间响应数据
 */
interface CurrentRoomResponse {
  room: GameRoom | null;
  inRoom: boolean;
}

/**
 * 离开房间响应数据
 */
interface LeaveRoomResponse {
  message: string;
}

/**
 * 房间 API 对象
 */
export const roomApi = {
  /**
   * 获取房间列表
   *
   * @param status 房间状态筛选（可选）
   * @param page 页码（默认1）
   * @param limit 每页数量（默认20）
   * @returns 房间列表和分页信息
   */
  getRoomList: async (
    status?: RoomStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<RoomListResponse> => {
    const params = new URLSearchParams();

    if (status) {
      params.append('status', status);
    }
    params.append('page', page.toString());
    params.append('pageSize', limit.toString());

    const response = await api.get<ApiResponse<RoomListResponse>>(
      `/api/v1/rooms?${params.toString()}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || '获取房间列表失败');
    }

    return response.data.data;
  },

  /**
   * 创建房间（完整参数版本）
   *
   * @param data 创建房间请求数据
   * @returns 创建的房间信息
   */
  createRoomFull: async (data: CreateRoomRequest): Promise<GameRoom> => {
    const response = await api.post<ApiResponse<CreateRoomResponse>>(
      '/api/v1/rooms/create',
      data
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || '创建房间失败');
    }

    return response.data.data.room;
  },

  /**
   * 创建房间（简化版本）
   *
   * @param name 房间名称
   * @param maxPlayers 最大玩家数（可选，默认3）
   * @param character 角色类型（可选）
   * @param username 用户名（可选）
   * @returns 创建的房间信息
   */
  createRoom: async (
    name: string,
    maxPlayers: number = 3,
    character?: string,
    username?: string
  ): Promise<GameRoom> => {
    const data: CreateRoomRequest = {
      name,
      maxPlayers,
      character: character as any || 'cat',
      username: username || '玩家',
    };

    return roomApi.createRoomFull(data);
  },

  /**
   * 加入房间（完整参数版本）
   *
   * @param data 加入房间请求数据
   * @returns 加入的房间信息
   */
  joinRoomFull: async (data: JoinRoomRequest): Promise<GameRoom> => {
    const response = await api.post<ApiResponse<JoinRoomResponse>>(
      '/api/v1/rooms/join',
      data
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || '加入房间失败');
    }

    return response.data.data.room;
  },

  /**
   * 加入房间（简化版本）
   *
   * @param roomCode 房间码或房间 ID
   * @param characterType 角色类型
   * @param characterName 角色名称（用户名）
   * @param password 房间密码（可选）
   * @returns 加入的房间信息
   */
  joinRoom: async (
    roomCode: string,
    characterType: string,
    characterName: string,
    password?: string
  ): Promise<GameRoom> => {
    const data: JoinRoomRequest = {
      roomId: roomCode,
      character: characterType as any,
      username: characterName,
      password,
    };

    return roomApi.joinRoomFull(data);
  },

  /**
   * 离开房间
   *
   * @param roomId 房间 ID
   * @returns 成功消息
   */
  leaveRoom: async (roomId: string): Promise<string> => {
    const response = await api.post<ApiResponse<LeaveRoomResponse>>(
      '/api/v1/rooms/leave',
      { roomId }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || '离开房间失败');
    }

    return response.data.data.message;
  },

  /**
   * 获取房间详情
   *
   * @param roomId 房间 ID
   * @returns 房间详细信息
   */
  getRoomDetails: async (roomId: string): Promise<GameRoom> => {
    const response = await api.get<ApiResponse<RoomDetailsResponse>>(
      `/api/v1/rooms/${roomId}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || '获取房间详情失败');
    }

    return response.data.data.room;
  },

  /**
   * 获取当前用户所在的房间
   *
   * @returns 当前房间信息（如果在房间中）
   */
  getCurrentRoom: async (): Promise<GameRoom | null> => {
    const response = await api.get<ApiResponse<CurrentRoomResponse>>(
      '/api/v1/rooms/current'
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || '获取当前房间失败');
    }

    return response.data.data.room;
  },
};

export default roomApi;
