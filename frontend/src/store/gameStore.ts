/**
 * 游戏状态管理 Store
 *
 * 使用 zustand 管理游戏相关的全局状态
 * - 游戏状态
 * - 操作历史
 * - 剧情文本
 * - WebSocket 交互
 */

import { create } from 'zustand';
import socketService from '../services/socket';
import type {
  GameState,
  GameSession,
  ActionResult,
  ActionHistoryEntry,
  GameActionRequest,
  GameActionResultResponse,
  GameStateUpdateResponse,
  ActionType,
  EventLogEntry,
} from '../types/game.types';

/**
 * 游戏状态接口
 */
interface GameStoreState {
  // ==================== 状态数据 ====================

  /** 完整游戏状态 */
  gameState: GameState | null;

  /** 游戏会话信息 */
  gameSession: GameSession | null;

  /** 当前显示的剧情文本 */
  currentStory: string;

  /** 操作历史记录 */
  actionHistory: ActionHistoryEntry[];

  /** 事件日志 */
  eventLog: EventLogEntry[];

  /** 加载状态 */
  isLoading: boolean;

  /** 错误信息 */
  error: string | null;

  /** 是否正在同步状态 */
  isSyncing: boolean;

  /** 最后同步时间 */
  lastSyncTime: number | null;

  // ==================== 动作方法 ====================

  /**
   * 执行游戏操作
   *
   * @param roomId 房间ID
   * @param actionType 操作类型
   * @param item1 物品1
   * @param item2 物品2
   * @param rawInput 原始输入
   * @returns Promise<ActionResult>
   */
  performAction: (
    roomId: string,
    actionType: ActionType | 'combination',
    item1?: string,
    item2?: string,
    rawInput?: string
  ) => Promise<ActionResult>;

  /**
   * 应用操作结果
   * 更新本地状态并添加到历史记录
   *
   * @param playerName 玩家名称
   * @param result 操作结果
   */
  applyActionResult: (
    playerId: string,
    playerName: string,
    actionType: ActionType | 'combination',
    input: string,
    result: ActionResult
  ) => void;

  /**
   * 同步完整游戏状态
   *
   * @param state 游戏状态
   */
  syncState: (state: GameState) => void;

  /**
   * 请求完整游戏状态
   *
   * @param roomId 房间ID
   * @returns Promise<void>
   */
  requestGameState: (roomId: string) => Promise<void>;

  /**
   * 启动状态同步
   *
   * @param roomId 房间ID
   */
  startStateSync: (roomId: string) => Promise<void>;

  /**
   * 停止状态同步
   *
   * @param roomId 房间ID
   */
  stopStateSync: (roomId: string) => Promise<void>;

  /**
   * 设置游戏会话
   *
   * @param session 游戏会话
   */
  setGameSession: (session: GameSession | null) => void;

  /**
   * 添加事件日志
   *
   * @param entry 事件日志条目
   */
  addEventLog: (entry: EventLogEntry) => void;

  /**
   * 设置剧情文本
   *
   * @param story 剧情文本
   */
  setCurrentStory: (story: string) => void;

  /**
   * 追加剧情文本
   *
   * @param story 剧情文本
   */
  appendStory: (story: string) => void;

  /**
   * 清除错误信息
   */
  clearError: () => void;

  /**
   * 重置游戏状态
   */
  resetGame: () => void;

  /**
   * 注册 WebSocket 事件监听器
   */
  registerSocketListeners: () => void;

  /**
   * 移除 WebSocket 事件监听器
   */
  unregisterSocketListeners: () => void;
}

/**
 * 初始状态
 */
const initialState = {
  gameState: null,
  gameSession: null,
  currentStory: '',
  actionHistory: [],
  eventLog: [],
  isLoading: false,
  error: null,
  isSyncing: false,
  lastSyncTime: null,
};

/**
 * 生成唯一ID
 */
const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * 创建游戏 Store
 */
export const useGameStore = create<GameStoreState>((set, get) => ({
  // 初始状态
  ...initialState,

  /**
   * 执行游戏操作
   */
  performAction: async (
    roomId: string,
    actionType: ActionType | 'combination',
    item1?: string,
    item2?: string,
    rawInput?: string
  ): Promise<ActionResult> => {
    set({ isLoading: true, error: null });

    return new Promise((resolve, reject) => {
      try {
        // 构建请求数据
        const requestData: GameActionRequest = {
          room_id: roomId,
          action_type: actionType,
          item1,
          item2,
          raw_input: rawInput || (item1 && item2 ? `${item1}+${item2}` : ''),
        };

        console.log('[GameStore] 发送游戏操作:', requestData);

        // 通过 WebSocket 发送操作
        socketService.emit('game:action', requestData, (response: any) => {
          set({ isLoading: false });

          if (response.success) {
            const result: ActionResult = response.data.result;
            console.log('[GameStore] 操作成功:', result);
            resolve(result);
          } else {
            const errorMessage = response.error?.message || '操作失败';
            console.error('[GameStore] 操作失败:', errorMessage);
            set({ error: errorMessage });
            reject(new Error(errorMessage));
          }
        });
      } catch (error: any) {
        const errorMessage = error.message || '执行操作时发生错误';
        console.error('[GameStore] 执行操作异常:', error);
        set({ isLoading: false, error: errorMessage });
        reject(error);
      }
    });
  },

  /**
   * 应用操作结果
   */
  applyActionResult: (
    playerId: string,
    playerName: string,
    actionType: ActionType | 'combination',
    input: string,
    result: ActionResult
  ) => {
    const { actionHistory, gameState, currentStory } = get();

    // 添加到操作历史
    const newEntry: ActionHistoryEntry = {
      id: generateId(),
      playerId,
      playerName,
      actionType,
      input,
      result,
      timestamp: Date.now(),
    };

    const newHistory = [...actionHistory, newEntry];

    // 限制历史记录数量（保留最近 100 条）
    if (newHistory.length > 100) {
      newHistory.shift();
    }

    // 更新剧情文本
    let newStory = currentStory;
    if (result.message) {
      newStory = currentStory ? `${currentStory}\n\n${result.message}` : result.message;
    }

    // 应用状态变化
    let newState = gameState;
    if (result.success && result.stateChanges && gameState) {
      newState = {
        ...gameState,
        ...result.stateChanges,
        lastUpdatedAt: Date.now(),
      };
    }

    set({
      actionHistory: newHistory,
      currentStory: newStory,
      gameState: newState,
    });

    console.log('[GameStore] 操作结果已应用:', {
      player: playerName,
      success: result.success,
      historyCount: newHistory.length,
    });
  },

  /**
   * 同步完整游戏状态
   */
  syncState: (state: GameState) => {
    console.log('[GameStore] 同步游戏状态:', state);
    set({
      gameState: state,
      lastSyncTime: Date.now(),
    });
  },

  /**
   * 请求完整游戏状态
   */
  requestGameState: async (roomId: string): Promise<void> => {
    set({ isLoading: true, error: null });

    return new Promise((resolve, reject) => {
      try {
        console.log('[GameStore] 请求游戏状态:', roomId);

        socketService.emit('game:request_state', { room_id: roomId }, (response: any) => {
          set({ isLoading: false });

          if (response.success) {
            const { state, session } = response.data;

            console.log('[GameStore] 游戏状态已获取:', { state, session });

            set({
              gameState: state,
              gameSession: session,
              eventLog: session?.eventLog || [],
              lastSyncTime: Date.now(),
            });

            resolve();
          } else {
            const errorMessage = response.error?.message || '获取游戏状态失败';
            console.error('[GameStore] 获取状态失败:', errorMessage);
            set({ error: errorMessage });
            reject(new Error(errorMessage));
          }
        });
      } catch (error: any) {
        const errorMessage = error.message || '请求游戏状态时发生错误';
        console.error('[GameStore] 请求状态异常:', error);
        set({ isLoading: false, error: errorMessage });
        reject(error);
      }
    });
  },

  /**
   * 启动状态同步
   */
  startStateSync: async (roomId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[GameStore] 启动状态同步:', roomId);

      socketService.emit('game:start_sync', { room_id: roomId }, (response: any) => {
        if (response.success) {
          console.log('[GameStore] 状态同步已启动');
          set({ isSyncing: true });
          resolve();
        } else {
          const errorMessage = response.error?.message || '启动状态同步失败';
          console.error('[GameStore] 启动同步失败:', errorMessage);
          set({ error: errorMessage });
          reject(new Error(errorMessage));
        }
      });
    });
  },

  /**
   * 停止状态同步
   */
  stopStateSync: async (roomId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[GameStore] 停止状态同步:', roomId);

      socketService.emit('game:stop_sync', { room_id: roomId }, (response: any) => {
        if (response.success) {
          console.log('[GameStore] 状态同步已停止');
          set({ isSyncing: false });
          resolve();
        } else {
          const errorMessage = response.error?.message || '停止状态同步失败';
          console.error('[GameStore] 停止同步失败:', errorMessage);
          set({ error: errorMessage });
          reject(new Error(errorMessage));
        }
      });
    });
  },

  /**
   * 设置游戏会话
   */
  setGameSession: (session: GameSession | null) => {
    set({ gameSession: session });

    // 如果会话包含事件日志，同步到 store
    if (session?.eventLog) {
      set({ eventLog: session.eventLog });
    }
  },

  /**
   * 添加事件日志
   */
  addEventLog: (entry: EventLogEntry) => {
    const { eventLog } = get();
    const newLog = [...eventLog, entry];

    // 限制日志数量（保留最近 200 条）
    if (newLog.length > 200) {
      newLog.shift();
    }

    set({ eventLog: newLog });
  },

  /**
   * 设置剧情文本
   */
  setCurrentStory: (story: string) => {
    set({ currentStory: story });
  },

  /**
   * 追加剧情文本
   */
  appendStory: (story: string) => {
    const { currentStory } = get();
    const newStory = currentStory ? `${currentStory}\n\n${story}` : story;
    set({ currentStory: newStory });
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 重置游戏状态
   */
  resetGame: () => {
    console.log('[GameStore] 重置游戏状态');
    set(initialState);
  },

  /**
   * 注册 WebSocket 事件监听器
   */
  registerSocketListeners: () => {
    console.log('[GameStore] 注册 WebSocket 事件监听器');

    // 监听操作结果
    socketService.on('game:action_result', (data: GameActionResultResponse) => {
      console.log('[GameStore] 收到操作结果:', data);

      const { player_id, player_name, action_type, result } = data;
      const input = result.message; // 使用结果消息作为输入描述

      // 应用操作结果
      get().applyActionResult(player_id, player_name, action_type, input, result);
    });

    // 监听状态更新
    socketService.on('game:state_updated', (data: GameStateUpdateResponse) => {
      console.log('[GameStore] 收到状态更新:', data);
      get().syncState(data.state);
    });

    // 监听定期状态同步
    socketService.on('game:state_sync', (data: GameStateUpdateResponse) => {
      console.log('[GameStore] 收到定期状态同步');
      get().syncState(data.state);
    });

    // 监听游戏开始
    socketService.on('game:started', (data: any) => {
      console.log('[GameStore] 游戏已开始:', data);

      if (data.initial_state) {
        set({
          gameState: data.initial_state,
          currentStory: '游戏开始！欢迎来到《三兄弟的冒险2》',
        });
      }
    });
  },

  /**
   * 移除 WebSocket 事件监听器
   */
  unregisterSocketListeners: () => {
    console.log('[GameStore] 移除 WebSocket 事件监听器');

    socketService.off('game:action_result');
    socketService.off('game:state_updated');
    socketService.off('game:state_sync');
    socketService.off('game:started');
  },
}));

/**
 * 选择器 Hooks
 * 提供便捷的状态访问方式
 */

/**
 * 获取游戏状态
 */
export const useGameState = () => useGameStore((state) => state.gameState);

/**
 * 获取游戏会话
 */
export const useGameSession = () => useGameStore((state) => state.gameSession);

/**
 * 获取当前剧情文本
 */
export const useCurrentStory = () => useGameStore((state) => state.currentStory);

/**
 * 获取操作历史
 */
export const useActionHistory = () => useGameStore((state) => state.actionHistory);

/**
 * 获取事件日志
 */
export const useEventLog = () => useGameStore((state) => state.eventLog);

/**
 * 获取加载状态
 */
export const useGameLoading = () => useGameStore((state) => state.isLoading);

/**
 * 获取错误信息
 */
export const useGameError = () => useGameStore((state) => state.error);

/**
 * 获取同步状态
 */
export const useIsSyncing = () => useGameStore((state) => state.isSyncing);

/**
 * 获取玩家列表
 */
export const useGamePlayers = () => useGameStore((state) => state.gameState?.players || []);

/**
 * 获取物品清单
 */
export const useInventory = () => useGameStore((state) => state.gameState?.inventory || []);

/**
 * 获取已收集的字母
 */
export const useCollectedLetters = () => useGameStore((state) => state.gameState?.collectedLetters || []);

/**
 * 检查是否正在游戏中
 */
export const useIsInGame = () => useGameStore((state) => !!state.gameState);

/**
 * 获取当前章节和关卡
 */
export const useCurrentLevel = () =>
  useGameStore((state) => ({
    chapter: state.gameState?.currentChapter || 0,
    level: state.gameState?.currentLevel || 0,
  }));

export default useGameStore;
