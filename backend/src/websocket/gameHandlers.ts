/**
 * 游戏事件的 WebSocket 处理器
 *
 * 负责处理游戏逻辑的实时通信：
 * - 玩家操作（道具组合、角色互动等）
 * - 游戏状态请求
 * - 定期状态同步
 *
 * 参考：后端架构文档第 5.3 节
 */

import { Socket, Server } from 'socket.io';
import { logger } from '../utils/logger';
import { roomService } from '../services/roomService';
import { GameEngine, createGameEngine } from '../game/GameEngine';
import { Chapter1, createChapter1 } from '../game/Chapter1';
import {
  GameState,
  GameAction,
  ActionResult,
  ActionType,
  CharacterType,
} from '../types/game.types';

/**
 * 扩展 Socket 接口，添加用户信息
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
}

/**
 * 游戏引擎实例缓存
 * key: roomId
 * value: { engine: GameEngine, chapter1: Chapter1, lastAccessed: number }
 */
const gameEngineCache = new Map<
  string,
  {
    engine: GameEngine;
    chapter1: Chapter1;
    lastAccessed: number;
  }
>();

/**
 * 状态同步定时器映射
 * key: roomId
 * value: NodeJS.Timeout
 */
const stateSyncTimers = new Map<string, NodeJS.Timeout>();

/**
 * 获取或创建游戏引擎实例
 *
 * @param roomId 房间ID
 * @returns 游戏引擎实例
 */
function getOrCreateGameEngine(roomId: string): {
  engine: GameEngine;
  chapter1: Chapter1;
} {
  const cached = gameEngineCache.get(roomId);

  if (cached) {
    // 更新最后访问时间
    cached.lastAccessed = Date.now();
    return { engine: cached.engine, chapter1: cached.chapter1 };
  }

  // 创建新实例
  const engine = createGameEngine(roomId);
  const chapter1 = createChapter1();

  gameEngineCache.set(roomId, {
    engine,
    chapter1,
    lastAccessed: Date.now(),
  });

  logger.info(`[GameEngine] 为房间 ${roomId} 创建了新的游戏引擎实例`);

  return { engine, chapter1 };
}

/**
 * 清理游戏引擎实例
 * 清理超过 30 分钟未访问的实例
 */
function cleanupGameEngines(): void {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 分钟

  let cleanedCount = 0;

  for (const [roomId, cached] of gameEngineCache.entries()) {
    if (now - cached.lastAccessed > timeout) {
      gameEngineCache.delete(roomId);
      cleanedCount++;
      logger.info(`[GameEngine] 清理房间 ${roomId} 的游戏引擎实例（超时）`);
    }
  }

  if (cleanedCount > 0) {
    logger.info(`[GameEngine] 清理了 ${cleanedCount} 个游戏引擎实例`);
  }
}

// 定期清理游戏引擎实例（每 10 分钟）
setInterval(cleanupGameEngines, 10 * 60 * 1000);

/**
 * 启动房间的状态同步定时器
 *
 * @param io Socket.IO 服务器实例
 * @param roomId 房间ID
 */
function startStateSyncTimer(io: Server, roomId: string): void {
  // 如果已经存在定时器，先清除
  if (stateSyncTimers.has(roomId)) {
    clearInterval(stateSyncTimers.get(roomId)!);
  }

  // 创建新的定时器（每 5 秒同步一次）
  const timer = setInterval(async () => {
    try {
      const { engine } = getOrCreateGameEngine(roomId);
      const state = await engine.loadGameState();

      if (state) {
        // 广播完整游戏状态给房间内所有玩家
        io.to(roomId).emit('game:state_sync', {
          state,
          timestamp: Date.now(),
        });

        logger.debug(`[StateSyn] 房间 ${roomId} 状态已同步`);
      }
    } catch (error) {
      logger.error(`[StateSync] 房间 ${roomId} 状态同步失败:`, error);
    }
  }, 5000); // 5 秒

  stateSyncTimers.set(roomId, timer);
  logger.info(`[StateSync] 房间 ${roomId} 状态同步定时器已启动（5秒间隔）`);
}

/**
 * 停止房间的状态同步定时器
 *
 * @param roomId 房间ID
 */
function stopStateSyncTimer(roomId: string): void {
  const timer = stateSyncTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    stateSyncTimers.delete(roomId);
    logger.info(`[StateSync] 房间 ${roomId} 状态同步定时器已停止`);
  }
}

/**
 * 替换描述文本中的占位符
 *
 * @param text 原始文本
 * @param state 游戏状态
 * @param actorId 执行者ID
 * @returns 替换后的文本
 */
function replaceTextPlaceholders(text: string, state: GameState, actorId: string): string {
  let result = text;

  // 查找执行操作的玩家
  const actor = state.players.find((p) => p.id === actorId);

  // 替换 <玩家名> 或 <玩家?自定义名>
  if (actor) {
    result = result.replace(/<玩家名>/g, actor.username);
    result = result.replace(/<玩家\?自定义名>/g, actor.username);
  }

  // 替换特定角色名称
  const catPlayer = state.players.find((p) => p.character === CharacterType.CAT);
  const dogPlayer = state.players.find((p) => p.character === CharacterType.DOG);
  const turtlePlayer = state.players.find((p) => p.character === CharacterType.TURTLE);

  if (catPlayer) {
    result = result.replace(/<猫玩家名>/g, catPlayer.username);
    result = result.replace(/<玩家1自定义名>/g, catPlayer.username);
  }

  if (dogPlayer) {
    result = result.replace(/<狗玩家名>/g, dogPlayer.username);
    result = result.replace(/<玩家2自定义名>/g, dogPlayer.username);
  }

  if (turtlePlayer) {
    result = result.replace(/<龟玩家名>/g, turtlePlayer.username);
    result = result.replace(/<玩家3自定义名>/g, turtlePlayer.username);
  }

  return result;
}

/**
 * 注册游戏相关的 WebSocket 事件处理器
 *
 * @param io Socket.IO 服务器实例
 * @param socket 已认证的 Socket 连接
 */
export function registerGameHandlers(io: Server, socket: AuthenticatedSocket): void {
  // ========================================
  // 游戏操作事件：game:action
  // ========================================
  socket.on(
    'game:action',
    async (
      data: {
        room_id: string;
        action_type: ActionType | 'combination'; // 兼容旧格式
        item1?: string;
        item2?: string;
        raw_input?: string;
        data?: any;
      },
      callback?: (response: any) => void
    ) => {
      try {
        logger.info(
          `[GameAction] 用户 ${socket.username} (${socket.userId}) 执行操作: ${data.action_type} - ${data.raw_input || `${data.item1}+${data.item2}`}`
        );

        // ========================================
        // 1. 验证必需参数
        // ========================================
        if (!data.room_id) {
          throw new Error('缺少房间ID');
        }

        if (!socket.userId) {
          throw new Error('用户未认证');
        }

        // ========================================
        // 2. 验证玩家在房间中
        // ========================================
        const room = await roomService.getRoomDetails(data.room_id);
        const playerInRoom = room.players.some((p) => p.id === socket.userId);

        if (!playerInRoom) {
          throw new Error('你不在此房间中');
        }

        // ========================================
        // 3. 获取游戏引擎实例
        // ========================================
        const { engine, chapter1 } = getOrCreateGameEngine(data.room_id);

        // ========================================
        // 4. 加载当前游戏状态
        // ========================================
        let state = await engine.loadGameState();

        if (!state) {
          throw new Error('游戏尚未开始');
        }

        // ========================================
        // 5. 构建游戏操作对象
        // ========================================
        let actionResult: ActionResult;

        // 判断操作类型
        if (data.action_type === 'combination' || data.action_type === ActionType.ITEM_COMBINATION) {
          // 道具组合操作
          if (!data.item1 || !data.item2) {
            throw new Error('道具组合需要提供 item1 和 item2');
          }

          // 调用 Chapter1 处理器
          actionResult = await chapter1.handleCombination(data.item1, data.item2, state, socket.userId);
        } else {
          // 其他类型的操作（暂时使用 GameEngine 的通用处理）
          const action: GameAction = {
            type: data.action_type as ActionType,
            playerId: socket.userId,
            target1: data.item1,
            target2: data.item2,
            rawInput: data.raw_input,
            timestamp: Date.now(),
            data: data.data,
          };

          actionResult = await engine.handleAction(action);
        }

        // ========================================
        // 6. 替换文本占位符
        // ========================================
        actionResult.message = replaceTextPlaceholders(actionResult.message, state, socket.userId);

        // ========================================
        // 7. 广播结果给房间内所有玩家
        // ========================================
        io.to(data.room_id).emit('game:action_result', {
          player_id: socket.userId,
          player_name: socket.username,
          action_type: data.action_type,
          result: actionResult,
          timestamp: Date.now(),
        });

        // ========================================
        // 8. 如果操作成功，广播更新后的状态
        // ========================================
        if (actionResult.success && actionResult.stateChanges) {
          // 重新加载最新状态
          state = await engine.loadGameState();
          if (state) {
            io.to(data.room_id).emit('game:state_updated', {
              state,
              timestamp: Date.now(),
            });
          }
        }

        // ========================================
        // 9. 返回结果给发起者
        // ========================================
        callback?.({
          success: true,
          message: '操作已处理',
          data: {
            result: actionResult,
          },
        });

        logger.info(
          `[GameAction] 操作处理完成 - 房间: ${data.room_id}, 玩家: ${socket.username}, 成功: ${actionResult.success}`
        );
      } catch (error) {
        logger.error(`[GameAction] 处理游戏操作失败:`, error);
        callback?.({
          success: false,
          error: {
            code: 'GAME_ACTION_ERROR',
            message: error instanceof Error ? error.message : '处理游戏操作失败',
          },
        });
      }
    }
  );

  // ========================================
  // 请求完整游戏状态：game:request_state
  // ========================================
  socket.on(
    'game:request_state',
    async (
      data: {
        room_id: string;
      },
      callback?: (response: any) => void
    ) => {
      try {
        logger.info(`[GameState] 用户 ${socket.username} (${socket.userId}) 请求游戏状态: ${data.room_id}`);

        // ========================================
        // 1. 验证必需参数
        // ========================================
        if (!data.room_id) {
          throw new Error('缺少房间ID');
        }

        if (!socket.userId) {
          throw new Error('用户未认证');
        }

        // ========================================
        // 2. 验证玩家在房间中
        // ========================================
        const room = await roomService.getRoomDetails(data.room_id);
        const playerInRoom = room.players.some((p) => p.id === socket.userId);

        if (!playerInRoom) {
          throw new Error('你不在此房间中');
        }

        // ========================================
        // 3. 获取游戏引擎实例并加载状态
        // ========================================
        const { engine } = getOrCreateGameEngine(data.room_id);
        const state = await engine.loadGameState();

        if (!state) {
          throw new Error('游戏尚未开始');
        }

        // ========================================
        // 4. 获取游戏会话信息
        // ========================================
        const session = await engine.getGameSession();

        // ========================================
        // 5. 返回完整状态
        // ========================================
        callback?.({
          success: true,
          message: '游戏状态已获取',
          data: {
            state,
            session,
            room,
          },
        });

        logger.info(`[GameState] 游戏状态已返回 - 房间: ${data.room_id}, 玩家: ${socket.username}`);
      } catch (error) {
        logger.error(`[GameState] 获取游戏状态失败:`, error);
        callback?.({
          success: false,
          error: {
            code: 'GET_STATE_ERROR',
            message: error instanceof Error ? error.message : '获取游戏状态失败',
          },
        });
      }
    }
  );

  // ========================================
  // 启动游戏状态同步：game:start_sync
  // ========================================
  socket.on(
    'game:start_sync',
    async (
      data: {
        room_id: string;
      },
      callback?: (response: any) => void
    ) => {
      try {
        logger.info(`[StateSync] 用户 ${socket.username} (${socket.userId}) 请求启动状态同步: ${data.room_id}`);

        // ========================================
        // 1. 验证必需参数
        // ========================================
        if (!data.room_id) {
          throw new Error('缺少房间ID');
        }

        if (!socket.userId) {
          throw new Error('用户未认证');
        }

        // ========================================
        // 2. 验证玩家在房间中
        // ========================================
        const room = await roomService.getRoomDetails(data.room_id);
        const playerInRoom = room.players.some((p) => p.id === socket.userId);

        if (!playerInRoom) {
          throw new Error('你不在此房间中');
        }

        // ========================================
        // 3. 启动状态同步定时器
        // ========================================
        startStateSyncTimer(io, data.room_id);

        // ========================================
        // 4. 返回成功响应
        // ========================================
        callback?.({
          success: true,
          message: '状态同步已启动',
        });

        logger.info(`[StateSync] 状态同步已启动 - 房间: ${data.room_id}`);
      } catch (error) {
        logger.error(`[StateSync] 启动状态同步失败:`, error);
        callback?.({
          success: false,
          error: {
            code: 'START_SYNC_ERROR',
            message: error instanceof Error ? error.message : '启动状态同步失败',
          },
        });
      }
    }
  );

  // ========================================
  // 停止游戏状态同步：game:stop_sync
  // ========================================
  socket.on(
    'game:stop_sync',
    async (
      data: {
        room_id: string;
      },
      callback?: (response: any) => void
    ) => {
      try {
        logger.info(`[StateSync] 用户 ${socket.username} (${socket.userId}) 请求停止状态同步: ${data.room_id}`);

        // ========================================
        // 1. 验证必需参数
        // ========================================
        if (!data.room_id) {
          throw new Error('缺少房间ID');
        }

        // ========================================
        // 2. 停止状态同步定时器
        // ========================================
        stopStateSyncTimer(data.room_id);

        // ========================================
        // 3. 返回成功响应
        // ========================================
        callback?.({
          success: true,
          message: '状态同步已停止',
        });

        logger.info(`[StateSync] 状态同步已停止 - 房间: ${data.room_id}`);
      } catch (error) {
        logger.error(`[StateSync] 停止状态同步失败:`, error);
        callback?.({
          success: false,
          error: {
            code: 'STOP_SYNC_ERROR',
            message: error instanceof Error ? error.message : '停止状态同步失败',
          },
        });
      }
    }
  );

  // ========================================
  // 断线时清理资源
  // ========================================
  socket.on('disconnect', async () => {
    // 注意：房间相关的断线处理在 roomHandlers 中已经实现
    // 这里只需要清理游戏相关的特定资源

    logger.debug(`[GameHandlers] 用户 ${socket.username} (${socket.userId}) 断开连接`);

    // 游戏引擎实例会在定时清理中处理
    // 状态同步定时器会在房间关闭时停止
  });
}

/**
 * 清理所有游戏相关资源
 * 在服务器关闭时调用
 */
export function cleanupGameHandlers(): void {
  logger.info(`[GameHandlers] 清理游戏处理器资源...`);

  // 清理所有状态同步定时器
  for (const [roomId, timer] of stateSyncTimers.entries()) {
    clearInterval(timer);
    logger.info(`[StateSync] 清理房间 ${roomId} 的状态同步定时器`);
  }
  stateSyncTimers.clear();

  // 清理所有游戏引擎实例
  gameEngineCache.clear();

  logger.info(`[GameHandlers] 游戏处理器资源已清理完成`);
}

/**
 * 手动触发游戏引擎清理
 * 可以由管理员端点调用
 */
export function manualCleanupGameEngines(): { cleaned: number; remaining: number } {
  const beforeCount = gameEngineCache.size;
  cleanupGameEngines();
  const afterCount = gameEngineCache.size;

  return {
    cleaned: beforeCount - afterCount,
    remaining: afterCount,
  };
}

/**
 * 获取当前游戏处理器统计信息
 */
export function getGameHandlerStats(): {
  engineInstances: number;
  activeSyncTimers: number;
} {
  return {
    engineInstances: gameEngineCache.size,
    activeSyncTimers: stateSyncTimers.size,
  };
}
