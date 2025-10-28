/**
 * 共享类型定义
 */

// 角色类型
export enum CharacterType {
  CAT = 'cat',
  DOG = 'dog',
  TURTLE = 'turtle',
}

// 房间状态
export enum RoomStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  PAUSED = 'paused',
  FINISHED = 'finished',
}

// 玩家信息
export interface Player {
  id: string;
  username: string;
  character: CharacterType;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  socketId?: string;
}

// 道具
export interface Item {
  id: string;
  name: string;
  description?: string;
  status?: 'normal' | 'damaged' | 'used';
}

// 游戏状态
export interface GameState {
  levelId: number;
  phase: string;
  inventory: Item[];
  eventLog: EventLogEntry[];
  unlockedAreas: string[];
  flags: Record<string, boolean | number | string>;
  players: Player[];
  currentTurn?: string; // 当前回合的玩家ID
}

// 事件日志条目
export interface EventLogEntry {
  id?: string;
  type: 'action' | 'system' | 'error' | 'dialogue';
  text: string;
  character?: CharacterType;
  timestamp?: number;
}

// 房间信息
export interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: RoomStatus;
  creatorId: string;
  createdAt: Date;
  startedAt?: Date;
}

// 游戏动作
export interface GameAction {
  playerId: string;
  input: string;
  timestamp?: number;
}

// 游戏结果
export interface GameResult {
  success: boolean;
  message: string;
  effects?: Effect[];
  newState?: Partial<GameState>;
}

// 效果类型
export interface Effect {
  type: 'obtain_item' | 'modify_hp' | 'set_flag' | 'unlock_area' | 'show_password_prompt';
  [key: string]: any;
}

// 条件类型
export interface Condition {
  type: 'has_item' | 'flag_set' | 'character_status' | 'item_not_damaged';
  [key: string]: any;
  errorMessage?: string;
}

// 事件配置
export interface EventConfig {
  id: string;
  triggers: string[];
  preconditions: Condition[];
  effects: Effect[];
  repeatable: boolean;
  text?: string;
}

// 关卡配置
export interface LevelConfig {
  id: number;
  name: string;
  events: EventConfig[];
  synonyms: Record<string, string[]>;
  items: Item[];
}

// Socket事件数据
export interface SocketEventData {
  roomId?: string;
  playerId?: string;
  [key: string]: any;
}

// 导出房间相关类型
export * from './room.types';

// 导出游戏逻辑相关类型
export * from './game.types';
