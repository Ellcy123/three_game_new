/**
 * 游戏相关类型定义（前端）
 *
 * 注意：这个文件定义了前端需要的游戏类型
 * CharacterType 从 room.types 导入并重新导出
 */

import type { CharacterType } from './room.types';
export type { CharacterType };

// ==================== 操作类型 ====================

/**
 * 操作类型
 */
export type ActionType =
  | 'item_combination'
  | 'character_interaction'
  | 'character_to_character'
  | 'password_input'
  | 'explore_area'
  | 'system'
  | 'combination'; // 前端使用的组合操作类型

// ==================== 游戏状态 ====================

/**
 * 玩家状态接口（简化版）
 */
export interface PlayerState {
  id: string;
  username: string;
  character: CharacterType;
  hp: number;
  maxHp: number;
  status?: string;
  canAct?: boolean;
  socketId?: string;
  trappedLocation?: string; // 被困位置（如 'suitcase', 'cage', 'none'）
}

/**
 * 道具接口（简化版）
 */
export interface GameItem {
  id: string;
  name: string;
  description?: string;
  status?: string;
  isKeyItem?: boolean; // 是否为关键道具
  obtainedAt?: number; // 获得时间戳
}

/**
 * 已收集的字母
 */
export interface CollectedLetter {
  letter: string;
  collectedAt: number;
  source: string;
}

/**
 * 游戏状态接口
 */
export interface GameState {
  currentChapter: number;
  currentLevel: number;
  phase: string;
  players: PlayerState[];
  inventory: GameItem[];
  unlockedAreas: string[];
  collectedLetters: CollectedLetter[];
  flags: Record<string, boolean | number | string>;
  triggeredEvents: string[];
  currentTurn?: string;
  startedAt: number;
  lastUpdatedAt: number;
}

// ==================== 操作结果 ====================

/**
 * 游戏效果接口
 */
export interface GameEffect {
  type: string;
  target?: string;
  value?: any;
  description?: string;
  data?: Record<string, any>;
}

/**
 * 生命值变化记录
 */
export interface HpChange {
  playerId: string;
  character: CharacterType;
  amount: number;
  oldHp: number;
  newHp: number;
}

/**
 * 操作结果接口
 */
export interface ActionResult {
  success: boolean;
  message: string;
  effects: GameEffect[];
  hpChanges: HpChange[];
  stateChanges?: Partial<GameState>;
  isLevelComplete?: boolean;
  showUI?: {
    type: 'password' | 'choice' | 'dialogue';
    data?: any;
  };
  timestamp: number;
}

// ==================== 事件日志 ====================

/**
 * 事件日志类型
 */
export type EventLogType =
  | 'system'
  | 'action'
  | 'dialogue'
  | 'error'
  | 'hint'
  | 'hp_change'
  | 'item_obtained';

/**
 * 事件日志条目
 */
export interface EventLogEntry {
  id: string;
  type: EventLogType;
  text: string;
  character?: CharacterType;
  playerId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ==================== 游戏会话 ====================

/**
 * 游戏会话状态
 */
export type GameSessionStatus =
  | 'waiting'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'ended';

/**
 * 游戏会话接口
 */
export interface GameSession {
  id: string;
  roomCode: string;
  gameState: GameState;
  status: GameSessionStatus;
  eventLog: EventLogEntry[];
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  lastActivityAt: number;
}

// ==================== WebSocket 请求/响应类型 ====================

/**
 * 游戏操作请求
 */
export interface GameActionRequest {
  room_id: string;
  action_type: ActionType;
  item1?: string;
  item2?: string;
  raw_input?: string;
}

/**
 * 游戏操作结果响应
 */
export interface GameActionResultResponse {
  player_id: string;
  player_name: string;
  action_type: ActionType;
  result: ActionResult;
}

/**
 * 游戏状态更新响应
 */
export interface GameStateUpdateResponse {
  state: GameState;
  timestamp: number;
}

/**
 * 操作历史条目
 */
export interface ActionHistoryEntry {
  id: string;
  playerId: string;
  playerName: string;
  actionType: ActionType;
  input: string;
  result: ActionResult;
  timestamp: number;
}
