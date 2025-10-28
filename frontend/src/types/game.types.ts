/**
 * 游戏相关类型定义（前端）
 *
 * 与后端类型保持同步
 */

/**
 * 角色类型
 */
export enum CharacterType {
  CAT = 'cat',
  DOG = 'dog',
  TURTLE = 'turtle',
}

/**
 * 玩家状态枚举
 */
export enum PlayerStatus {
  ACTIVE = 'active',
  TRAPPED = 'trapped',
  DISCONNECTED = 'disconnected',
  DEAD = 'dead',
}

/**
 * 玩家被困位置
 */
export enum TrappedLocation {
  SUITCASE = 'suitcase',
  CAGE = 'cage',
  NONE = 'none',
}

/**
 * 道具状态
 */
export enum ItemStatus {
  NORMAL = 'normal',
  DAMAGED = 'damaged',
  USED = 'used',
  DISAPPEARED = 'disappeared',
}

/**
 * 游戏会话状态
 */
export enum GameSessionStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ENDED = 'ended',
}

/**
 * 玩家状态接口
 */
export interface PlayerState {
  id: string;
  username: string;
  character: CharacterType;
  hp: number;
  maxHp: number;
  status: PlayerStatus;
  trappedLocation?: TrappedLocation;
  canAct: boolean;
  socketId?: string;
}

/**
 * 道具接口
 */
export interface GameItem {
  id: string;
  name: string;
  description?: string;
  status: ItemStatus;
  isKeyItem: boolean;
  obtainedAt?: number;
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
 * 游戏标志
 */
export interface GameFlags {
  smallRoomUnlocked: boolean;
  suitcaseOpened: boolean;
  cageOpened: boolean;
  computerWorking: boolean;
  [key: string]: boolean | number | string;
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
  flags: GameFlags;
  triggeredEvents: string[];
  currentTurn?: string;
  startedAt: number;
  lastUpdatedAt: number;
}

/**
 * 操作类型
 */
export enum ActionType {
  ITEM_COMBINATION = 'item_combination',
  CHARACTER_INTERACTION = 'character_interaction',
  CHARACTER_TO_CHARACTER = 'character_to_character',
  PASSWORD_INPUT = 'password_input',
  EXPLORE_AREA = 'explore_area',
  SYSTEM = 'system',
}

/**
 * 效果类型
 */
export enum EffectType {
  OBTAIN_ITEM = 'obtain_item',
  MODIFY_HP = 'modify_hp',
  SET_FLAG = 'set_flag',
  UNLOCK_AREA = 'unlock_area',
  UPDATE_ITEM_STATUS = 'update_item_status',
  UPDATE_PLAYER_STATUS = 'update_player_status',
  COLLECT_LETTER = 'collect_letter',
  SHOW_PASSWORD_PROMPT = 'show_password_prompt',
  TRIGGER_DIALOGUE = 'trigger_dialogue',
  PLAY_SOUND = 'play_sound',
  PLAY_ANIMATION = 'play_animation',
}

/**
 * 游戏效果接口
 */
export interface GameEffect {
  type: EffectType;
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

/**
 * 事件日志类型
 */
export enum EventLogType {
  SYSTEM = 'system',
  ACTION = 'action',
  DIALOGUE = 'dialogue',
  ERROR = 'error',
  HINT = 'hint',
  HP_CHANGE = 'hp_change',
  ITEM_OBTAINED = 'item_obtained',
}

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

/**
 * WebSocket 游戏操作请求
 */
export interface GameActionRequest {
  room_id: string;
  action_type: ActionType | 'combination';
  item1?: string;
  item2?: string;
  raw_input?: string;
  data?: any;
}

/**
 * WebSocket 游戏操作结果响应
 */
export interface GameActionResultResponse {
  player_id: string;
  player_name: string;
  action_type: ActionType | 'combination';
  result: ActionResult;
  timestamp: number;
}

/**
 * WebSocket 游戏状态更新响应
 */
export interface GameStateUpdateResponse {
  state: GameState;
  timestamp: number;
}

/**
 * 操作历史记录
 */
export interface ActionHistoryEntry {
  id: string;
  playerId: string;
  playerName: string;
  actionType: ActionType | 'combination';
  input: string;
  result: ActionResult;
  timestamp: number;
}
