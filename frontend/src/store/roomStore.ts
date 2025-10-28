/**
 * 房间状态管理 Store
 *
 * 使用 zustand 管理房间相关的全局状态
 */

import { create } from 'zustand';
import { roomApi } from '../services/roomApi';
import type {
  GameRoom,
  RoomListItem,
  CreateRoomRequest,
  JoinRoomRequest,
  RoomStatus,
} from '../types/room.types';

/**
 * 房间状态接口
 */
interface RoomState {
  // 状态数据
  rooms: RoomListItem[];
  currentRoom: GameRoom | null;
  isLoading: boolean;
  error: string | null;

  // 分页信息
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null;

  // 动作方法
  fetchRooms: (status?: RoomStatus, page?: number, pageSize?: number) => Promise<void>;
  createRoom: (data: CreateRoomRequest) => Promise<GameRoom>;
  joinRoom: (data: JoinRoomRequest) => Promise<GameRoom>;
  leaveRoom: (roomId: string) => Promise<void>;
  fetchRoomDetails: (roomId: string) => Promise<void>;
  fetchCurrentRoom: () => Promise<void>;
  setCurrentRoom: (room: GameRoom | null) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * 初始状态
 */
const initialState = {
  rooms: [],
  currentRoom: null,
  isLoading: false,
  error: null,
  pagination: null,
};

/**
 * 创建房间 Store
 */
export const useRoomStore = create<RoomState>((set) => ({
  // 初始状态
  ...initialState,

  /**
   * 获取房间列表
   *
   * @param status 房间状态筛选（可选）
   * @param page 页码（默认1）
   * @param pageSize 每页数量（默认20）
   */
  fetchRooms: async (
    status?: RoomStatus,
    page: number = 1,
    pageSize: number = 20
  ) => {
    set({ isLoading: true, error: null });

    try {
      const result = await roomApi.getRoomList(status, page, pageSize);

      set({
        rooms: result.rooms,
        pagination: result.pagination,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        '获取房间列表失败';

      set({
        rooms: [],
        pagination: null,
        isLoading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * 创建房间
   *
   * @param data 创建房间请求数据
   * @returns 创建的房间信息
   */
  createRoom: async (data: CreateRoomRequest): Promise<GameRoom> => {
    set({ isLoading: true, error: null });

    try {
      const room = await roomApi.createRoomFull(data);

      set({
        currentRoom: room,
        isLoading: false,
        error: null,
      });

      return room;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        '创建房间失败';

      set({
        isLoading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * 加入房间
   *
   * @param data 加入房间请求数据
   * @returns 加入的房间信息
   */
  joinRoom: async (data: JoinRoomRequest): Promise<GameRoom> => {
    set({ isLoading: true, error: null });

    try {
      const room = await roomApi.joinRoomFull(data);

      set({
        currentRoom: room,
        isLoading: false,
        error: null,
      });

      return room;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        '加入房间失败';

      set({
        isLoading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * 离开房间
   *
   * @param roomId 房间 ID
   */
  leaveRoom: async (roomId: string): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      await roomApi.leaveRoom(roomId);

      set({
        currentRoom: null,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        '离开房间失败';

      set({
        isLoading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * 获取房间详情
   *
   * @param roomId 房间 ID
   */
  fetchRoomDetails: async (roomId: string): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const room = await roomApi.getRoomDetails(roomId);

      set({
        currentRoom: room,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        '获取房间详情失败';

      set({
        isLoading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * 获取当前用户所在的房间
   */
  fetchCurrentRoom: async (): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const room = await roomApi.getCurrentRoom();

      set({
        currentRoom: room,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        '获取当前房间失败';

      set({
        currentRoom: null,
        isLoading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * 设置当前房间
   * 用于 Socket 更新或其他场景直接设置房间信息
   *
   * @param room 房间信息
   */
  setCurrentRoom: (room: GameRoom | null) => {
    set({ currentRoom: room });
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 重置状态
   * 用于用户登出或需要清空房间状态的场景
   */
  reset: () => {
    set(initialState);
  },
}));

/**
 * 选择器 Hooks
 * 提供便捷的状态访问方式
 */

/**
 * 获取房间列表
 */
export const useRooms = () => useRoomStore((state) => state.rooms);

/**
 * 获取当前房间
 */
export const useCurrentRoom = () => useRoomStore((state) => state.currentRoom);

/**
 * 获取加载状态
 */
export const useRoomLoading = () => useRoomStore((state) => state.isLoading);

/**
 * 获取错误信息
 */
export const useRoomError = () => useRoomStore((state) => state.error);

/**
 * 获取分页信息
 */
export const useRoomPagination = () => useRoomStore((state) => state.pagination);

/**
 * 检查用户是否在房间中
 */
export const useIsInRoom = () => useRoomStore((state) => !!state.currentRoom);

export default useRoomStore;
