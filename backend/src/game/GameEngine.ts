/**
 * 游戏引擎核心类
 *
 * 负责处理游戏逻辑、状态管理和数据持久化
 * 参考文档：docs/sever.md 第5.1节
 */

import { setCache, getCache, deleteCache } from '../config/redis';
import {
  GameState,
  GameAction,
  ActionResult,
  GameSession,
  GameSessionStatus,
  PlayerState,
  PlayerStatus,
  TrappedLocation,
  CharacterType,
  // GameItem, // TODO: Will be used when implementing inventory management
  // ItemStatus, // TODO: Will be used when implementing item status updates
  // GameEffect, // TODO: Will be used when implementing effect application
  // EffectType, // TODO: Will be used when implementing effect types
  // HpChange, // TODO: Will be used when implementing HP change tracking
  EventLogEntry,
  EventLogType,
  // ActionType, // TODO: Will be used when implementing action type validation
  ValidationResult,
  // ParsedInput, // TODO: Will be used when implementing input parsing
} from '../types/game.types';

/**
 * 游戏引擎类
 *
 * 核心职责：
 * 1. 管理游戏状态
 * 2. 处理玩家操作
 * 3. 执行游戏逻辑
 * 4. 持久化存储
 */
export class GameEngine {
  private readonly roomId: string;
  private readonly GAME_STATE_PREFIX = 'game:state:';
  private readonly GAME_SESSION_PREFIX = 'game:session:';
  private readonly STATE_TTL = 86400; // 24小时缓存过期时间

  /**
   * 构造函数
   *
   * @param roomId 房间ID
   */
  constructor(roomId: string) {
    this.roomId = roomId;
  }

  // ==================== 公共方法 ====================

  /**
   * 初始化游戏
   *
   * 创建初始游戏状态并保存到Redis
   *
   * @param players 玩家信息数组
   * @param chapterId 起始章节ID（默认为1）
   * @param levelId 起始关卡ID（默认为1）
   * @returns Promise<GameState> 初始化的游戏状态
   */
  async initializeGame(
    players: Array<{
      id: string;
      username: string;
      character: CharacterType;
    }>,
    chapterId: number = 1,
    levelId: number = 1
  ): Promise<GameState> {
    try {
      console.log(`[GameEngine] 初始化游戏 - 房间: ${this.roomId}`);

      // 创建初始玩家状态
      const playerStates: PlayerState[] = players.map((player) => {
        // 根据关卡配置设置初始状态
        const initialStatus = this.getInitialPlayerStatus(player.character, levelId);

        return {
          id: player.id,
          username: player.username,
          character: player.character,
          hp: 8, // 默认初始生命值
          maxHp: 8,
          status: initialStatus.status,
          trappedLocation: initialStatus.trappedLocation,
          canAct: initialStatus.canAct,
        };
      });

      // 创建初始游戏状态
      const initialState: GameState = {
        currentChapter: chapterId,
        currentLevel: levelId,
        phase: 'intro', // 开场阶段
        players: playerStates,
        inventory: [], // 初始物品清单为空
        unlockedAreas: ['main_area'], // 初始只有主区域可见
        collectedLetters: [], // 尚未收集任何字母
        flags: {
          smallRoomUnlocked: false,
          suitcaseOpened: false,
          cageOpened: false,
          computerWorking: false,
        },
        triggeredEvents: [], // 尚未触发任何事件
        startedAt: Date.now(),
        lastUpdatedAt: Date.now(),
      };

      // 创建游戏会话
      const session: GameSession = {
        id: this.roomId,
        roomCode: this.roomId, // 房间码与房间ID关联
        gameState: initialState,
        status: GameSessionStatus.PLAYING,
        eventLog: [
          {
            id: this.generateEventId(),
            type: EventLogType.SYSTEM,
            text: '游戏开始！',
            timestamp: Date.now(),
          },
        ],
        createdAt: Date.now(),
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      };

      // 保存到Redis
      await this.saveGameState(initialState);
      await this.saveGameSession(session);

      console.log(`[GameEngine] 游戏初始化完成 - 房间: ${this.roomId}`);
      return initialState;
    } catch (error) {
      console.error(`[GameEngine] 初始化游戏失败:`, error);
      throw new Error(`初始化游戏失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理玩家操作
   *
   * 主流程：
   * 1. 验证操作合法性
   * 2. 加载当前游戏状态
   * 3. 根据章节调用相应处理器
   * 4. 更新游戏状态
   * 5. 保存到Redis
   * 6. 返回操作结果
   *
   * @param action 游戏操作
   * @returns Promise<ActionResult> 操作结果
   */
  async handleAction(action: GameAction): Promise<ActionResult> {
    try {
      console.log(`[GameEngine] 处理操作 - 房间: ${this.roomId}, 玩家: ${action.playerId}, 类型: ${action.type}`);

      // 1. 验证操作合法性
      const validation = await this.validateAction(action);
      if (!validation.isValid) {
        return this.createErrorResult(validation.reason || '操作无效');
      }

      // 2. 加载当前游戏状态
      const currentState = await this.loadGameState();
      if (!currentState) {
        return this.createErrorResult('游戏状态不存在，请重新开始游戏');
      }

      // 3. 处理操作
      const result = await this.processAction(action, currentState);

      // 4. 如果操作成功，更新游戏状态
      if (result.success && result.stateChanges) {
        const newState = this.applyStateChanges(currentState, result.stateChanges);
        await this.saveGameState(newState);

        // 更新会话最后活动时间
        await this.updateSessionActivity();

        // 记录事件日志
        await this.addEventLog({
          id: this.generateEventId(),
          type: EventLogType.ACTION,
          text: result.message,
          playerId: action.playerId,
          timestamp: Date.now(),
        });
      }

      console.log(`[GameEngine] 操作处理完成 - 成功: ${result.success}`);
      return result;
    } catch (error) {
      console.error(`[GameEngine] 处理操作失败:`, error);
      return this.createErrorResult(`操作处理失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 保存游戏状态到Redis
   *
   * @param state 游戏状态
   * @returns Promise<void>
   */
  async saveGameState(state: GameState): Promise<void> {
    try {
      const key = this.getGameStateKey();
      state.lastUpdatedAt = Date.now();
      await setCache(key, state, this.STATE_TTL);
      console.log(`[GameEngine] 游戏状态已保存 - 房间: ${this.roomId}`);
    } catch (error) {
      console.error(`[GameEngine] 保存游戏状态失败:`, error);
      throw error;
    }
  }

  /**
   * 从Redis加载游戏状态
   *
   * @returns Promise<GameState | null> 游戏状态，不存在则返回null
   */
  async loadGameState(): Promise<GameState | null> {
    try {
      const key = this.getGameStateKey();
      const state = await getCache<GameState>(key);

      if (state) {
        console.log(`[GameEngine] 游戏状态已加载 - 房间: ${this.roomId}`);
      } else {
        console.log(`[GameEngine] 游戏状态不存在 - 房间: ${this.roomId}`);
      }

      return state;
    } catch (error) {
      console.error(`[GameEngine] 加载游戏状态失败:`, error);
      throw error;
    }
  }

  /**
   * 删除游戏状态
   *
   * @returns Promise<void>
   */
  async deleteGameState(): Promise<void> {
    try {
      const stateKey = this.getGameStateKey();
      const sessionKey = this.getGameSessionKey();
      await deleteCache(stateKey, sessionKey);
      console.log(`[GameEngine] 游戏状态已删除 - 房间: ${this.roomId}`);
    } catch (error) {
      console.error(`[GameEngine] 删除游戏状态失败:`, error);
      throw error;
    }
  }

  /**
   * 获取游戏会话信息
   *
   * @returns Promise<GameSession | null>
   */
  async getGameSession(): Promise<GameSession | null> {
    try {
      const key = this.getGameSessionKey();
      return await getCache<GameSession>(key);
    } catch (error) {
      console.error(`[GameEngine] 获取游戏会话失败:`, error);
      throw error;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 验证操作合法性
   *
   * 检查项：
   * - 玩家是否存在
   * - 玩家是否可以行动
   * - 操作类型是否有效
   *
   * @param action 游戏操作
   * @returns Promise<ValidationResult> 验证结果
   */
  private async validateAction(action: GameAction): Promise<ValidationResult> {
    try {
      // 加载游戏状态
      const state = await this.loadGameState();
      if (!state) {
        return {
          isValid: false,
          reason: '游戏状态不存在',
        };
      }

      // 验证玩家是否存在
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) {
        return {
          isValid: false,
          reason: '玩家不存在',
        };
      }

      // 验证玩家是否可以行动
      if (!player.canAct) {
        return {
          isValid: false,
          reason: `${player.username} 当前无法行动`,
          suggestion: player.status === PlayerStatus.TRAPPED
            ? '需要先解救被困的角色'
            : '角色状态异常',
        };
      }

      // 验证玩家状态
      if (player.status === PlayerStatus.DEAD) {
        return {
          isValid: false,
          reason: `${player.username} 已经无法继续行动`,
        };
      }

      if (player.status === PlayerStatus.DISCONNECTED) {
        return {
          isValid: false,
          reason: `${player.username} 已断线`,
        };
      }

      return {
        isValid: true,
      };
    } catch (error) {
      console.error('[GameEngine] 验证操作失败:', error);
      return {
        isValid: false,
        reason: '验证操作时发生错误',
      };
    }
  }

  /**
   * 处理操作
   *
   * 根据当前章节和操作类型，调用相应的处理器
   *
   * @param action 游戏操作
   * @param state 当前游戏状态
   * @returns Promise<ActionResult> 操作结果
   */
  private async processAction(action: GameAction, state: GameState): Promise<ActionResult> {
    try {
      // 根据章节选择处理器
      // 目前只实现第一章节
      if (state.currentChapter === 1) {
        return await this.processChapter1Action(action, state);
      }

      return this.createErrorResult('当前章节尚未实现');
    } catch (error) {
      console.error('[GameEngine] 处理操作失败:', error);
      return this.createErrorResult(`处理操作失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理第一章节的操作
   *
   * @param action 游戏操作
   * @param state 当前游戏状态
   * @returns Promise<ActionResult> 操作结果
   */
  private async processChapter1Action(action: GameAction, _state: GameState): Promise<ActionResult> {
    // 这里将调用具体的关卡处理器（第一关：密室）
    // 暂时返回一个占位结果
    // Note: _state is prefixed with underscore to indicate it's intentionally unused for now
    return {
      success: true,
      message: `收到操作: ${action.type}`,
      effects: [],
      hpChanges: [],
      timestamp: Date.now(),
    };
  }

  /**
   * 更新游戏状态
   *
   * 应用状态变化到当前状态
   *
   * @param currentState 当前游戏状态
   * @param changes 状态变化
   * @returns GameState 更新后的游戏状态
   */
  private applyStateChanges(currentState: GameState, changes: Partial<GameState>): GameState {
    const newState: GameState = {
      ...currentState,
      ...changes,
      lastUpdatedAt: Date.now(),
    };

    return newState;
  }

  /**
   * 创建错误结果
   *
   * @param message 错误消息
   * @returns ActionResult 错误结果
   */
  private createErrorResult(message: string): ActionResult {
    return {
      success: false,
      message,
      effects: [],
      hpChanges: [],
      timestamp: Date.now(),
    };
  }

  /**
   * 保存游戏会话
   *
   * @param session 游戏会话
   * @returns Promise<void>
   */
  private async saveGameSession(session: GameSession): Promise<void> {
    try {
      const key = this.getGameSessionKey();
      session.lastActivityAt = Date.now();
      await setCache(key, session, this.STATE_TTL);
      console.log(`[GameEngine] 游戏会话已保存 - 房间: ${this.roomId}`);
    } catch (error) {
      console.error(`[GameEngine] 保存游戏会话失败:`, error);
      throw error;
    }
  }

  /**
   * 更新会话最后活动时间
   *
   * @returns Promise<void>
   */
  private async updateSessionActivity(): Promise<void> {
    try {
      const session = await this.getGameSession();
      if (session) {
        session.lastActivityAt = Date.now();
        await this.saveGameSession(session);
      }
    } catch (error) {
      console.error('[GameEngine] 更新会话活动时间失败:', error);
    }
  }

  /**
   * 添加事件日志
   *
   * @param entry 事件日志条目
   * @returns Promise<void>
   */
  private async addEventLog(entry: EventLogEntry): Promise<void> {
    try {
      const session = await this.getGameSession();
      if (session) {
        session.eventLog.push(entry);

        // 限制日志数量（保留最近1000条）
        if (session.eventLog.length > 1000) {
          session.eventLog = session.eventLog.slice(-1000);
        }

        await this.saveGameSession(session);
      }
    } catch (error) {
      console.error('[GameEngine] 添加事件日志失败:', error);
    }
  }

  /**
   * 获取初始玩家状态
   *
   * 根据角色类型和关卡配置，返回初始状态
   *
   * @param character 角色类型
   * @param levelId 关卡ID
   * @returns 初始玩家状态配置
   */
  private getInitialPlayerStatus(
    character: CharacterType,
    levelId: number
  ): {
    status: PlayerStatus;
    trappedLocation: TrappedLocation;
    canAct: boolean;
  } {
    // 第一关：密室
    if (levelId === 1) {
      switch (character) {
        case CharacterType.CAT:
          return {
            status: PlayerStatus.TRAPPED,
            trappedLocation: TrappedLocation.SUITCASE,
            canAct: false,
          };
        case CharacterType.DOG:
          return {
            status: PlayerStatus.TRAPPED,
            trappedLocation: TrappedLocation.CAGE,
            canAct: false,
          };
        case CharacterType.TURTLE:
          return {
            status: PlayerStatus.ACTIVE,
            trappedLocation: TrappedLocation.NONE,
            canAct: true,
          };
      }
    }

    // 默认状态：活跃
    return {
      status: PlayerStatus.ACTIVE,
      trappedLocation: TrappedLocation.NONE,
      canAct: true,
    };
  }

  /**
   * 生成事件ID
   *
   * @returns string 唯一事件ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取游戏状态的Redis键
   *
   * @returns string Redis键
   */
  private getGameStateKey(): string {
    return `${this.GAME_STATE_PREFIX}${this.roomId}`;
  }

  /**
   * 获取游戏会话的Redis键
   *
   * @returns string Redis键
   */
  private getGameSessionKey(): string {
    return `${this.GAME_SESSION_PREFIX}${this.roomId}`;
  }
}

/**
 * 创建游戏引擎实例
 *
 * @param roomId 房间ID
 * @returns GameEngine 游戏引擎实例
 */
export function createGameEngine(roomId: string): GameEngine {
  return new GameEngine(roomId);
}
