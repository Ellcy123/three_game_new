/**
 * 游戏逻辑相关类型定义
 * 基于《level-01.md》第一关：密室
 */

// Import and re-export CharacterType so it's available to consumers of this module
import { CharacterType } from './index';
export { CharacterType };

// ==================== 玩家状态 ====================

/**
 * 玩家状态枚举
 */
export enum PlayerStatus {
  /** 活跃状态，可以正常行动 */
  ACTIVE = 'active',
  /** 被困状态，无法行动 */
  TRAPPED = 'trapped',
  /** 断线状态 */
  DISCONNECTED = 'disconnected',
  /** 死亡状态（第一关不会真正死亡，生命值锁定为1） */
  DEAD = 'dead',
}

/**
 * 玩家被困位置
 */
export enum TrappedLocation {
  /** 被困在行李箱内 */
  SUITCASE = 'suitcase',
  /** 被困在囚笼内 */
  CAGE = 'cage',
  /** 未被困 */
  NONE = 'none',
}

/**
 * 玩家状态接口
 */
export interface PlayerState {
  /** 玩家ID */
  id: string;
  /** 玩家用户名 */
  username: string;
  /** 角色类型（猫/狗/龟） */
  character: CharacterType;
  /** 当前生命值 */
  hp: number;
  /** 最大生命值 */
  maxHp: number;
  /** 玩家状态 */
  status: PlayerStatus;
  /** 被困位置（如果状态为TRAPPED） */
  trappedLocation?: TrappedLocation;
  /** 是否可以行动 */
  canAct: boolean;
  /** Socket连接ID */
  socketId?: string;
}

// ==================== 游戏状态 ====================

/**
 * 游戏章节
 */
export interface Chapter {
  /** 章节编号 */
  id: number;
  /** 章节名称 */
  name: string;
}

/**
 * 游戏关卡
 */
export interface Level {
  /** 关卡编号 */
  id: number;
  /** 关卡名称 */
  name: string;
  /** 所属章节ID */
  chapterId: number;
}

/**
 * 道具状态
 */
export enum ItemStatus {
  /** 正常状态 */
  NORMAL = 'normal',
  /** 已损坏 */
  DAMAGED = 'damaged',
  /** 已使用/已打开 */
  USED = 'used',
  /** 已消失 */
  DISAPPEARED = 'disappeared',
}

/**
 * 道具接口
 */
export interface GameItem {
  /** 道具ID */
  id: string;
  /** 道具名称 */
  name: string;
  /** 道具描述 */
  description?: string;
  /** 道具状态 */
  status: ItemStatus;
  /** 是否为关键道具（通关必需） */
  isKeyItem: boolean;
  /** 获得时间戳 */
  obtainedAt?: number;
}

/**
 * 已收集的字母
 */
export interface CollectedLetter {
  /** 字母 */
  letter: string;
  /** 收集时间戳 */
  collectedAt: number;
  /** 通过何种方式收集 */
  source: string;
}

/**
 * 游戏标志（用于记录游戏中的各种状态）
 */
export interface GameFlags {
  /** 小房间是否已开启 */
  smallRoomUnlocked: boolean;
  /** 行李箱是否已打开 */
  suitcaseOpened: boolean;
  /** 囚笼是否已打开 */
  cageOpened: boolean;
  /** 电脑是否正常运行 */
  computerWorking: boolean;
  /** 其他动态标志 */
  [key: string]: boolean | number | string;
}

/**
 * 游戏状态接口
 */
export interface GameState {
  /** 当前章节 */
  currentChapter: number;
  /** 当前关卡 */
  currentLevel: number;
  /** 关卡阶段（用于标记线性流程的进度） */
  phase: string;
  /** 玩家状态数组 */
  players: PlayerState[];
  /** 物品清单 */
  inventory: GameItem[];
  /** 已解锁的区域 */
  unlockedAreas: string[];
  /** 已收集的字母 */
  collectedLetters: CollectedLetter[];
  /** 游戏标志 */
  flags: GameFlags;
  /** 已触发的事件ID列表（用于标记一次性事件） */
  triggeredEvents: string[];
  /** 当前回合的玩家ID（如果是回合制） */
  currentTurn?: string;
  /** 游戏开始时间 */
  startedAt: number;
  /** 最后更新时间 */
  lastUpdatedAt: number;
}

// ==================== 游戏操作 ====================

/**
 * 操作类型
 */
export enum ActionType {
  /** 道具组合操作 */
  ITEM_COMBINATION = 'item_combination',
  /** 角色与道具交互 */
  CHARACTER_INTERACTION = 'character_interaction',
  /** 角色之间的交互 */
  CHARACTER_TO_CHARACTER = 'character_to_character',
  /** 密码输入 */
  PASSWORD_INPUT = 'password_input',
  /** 区域探索 */
  EXPLORE_AREA = 'explore_area',
  /** 其他系统操作 */
  SYSTEM = 'system',
}

/**
 * 游戏操作接口
 */
export interface GameAction {
  /** 操作类型 */
  type: ActionType;
  /** 执行操作的玩家ID */
  playerId: string;
  /** 操作目标1（道具ID或角色类型等） */
  target1?: string;
  /** 操作目标2（用于组合操作） */
  target2?: string;
  /** 原始输入文本 */
  rawInput?: string;
  /** 操作时间戳 */
  timestamp: number;
  /** 其他操作数据 */
  data?: Record<string, any>;
}

// ==================== 操作结果 ====================

/**
 * 效果类型
 */
export enum EffectType {
  /** 获得道具 */
  OBTAIN_ITEM = 'obtain_item',
  /** 修改生命值 */
  MODIFY_HP = 'modify_hp',
  /** 设置标志 */
  SET_FLAG = 'set_flag',
  /** 解锁区域 */
  UNLOCK_AREA = 'unlock_area',
  /** 更新道具状态 */
  UPDATE_ITEM_STATUS = 'update_item_status',
  /** 更新玩家状态 */
  UPDATE_PLAYER_STATUS = 'update_player_status',
  /** 收集字母 */
  COLLECT_LETTER = 'collect_letter',
  /** 显示密码输入界面 */
  SHOW_PASSWORD_PROMPT = 'show_password_prompt',
  /** 触发剧情文本 */
  TRIGGER_DIALOGUE = 'trigger_dialogue',
  /** 播放音效 */
  PLAY_SOUND = 'play_sound',
  /** 播放动画 */
  PLAY_ANIMATION = 'play_animation',
}

/**
 * 游戏效果接口
 */
export interface GameEffect {
  /** 效果类型 */
  type: EffectType;
  /** 效果目标（玩家ID、道具ID等） */
  target?: string;
  /** 效果值（如生命值变化量、标志值等） */
  value?: any;
  /** 效果描述 */
  description?: string;
  /** 其他效果数据 */
  data?: Record<string, any>;
}

/**
 * 生命值变化记录
 */
export interface HpChange {
  /** 玩家ID */
  playerId: string;
  /** 角色类型 */
  character: CharacterType;
  /** 变化量（正数为增加，负数为减少） */
  amount: number;
  /** 变化前的生命值 */
  oldHp: number;
  /** 变化后的生命值 */
  newHp: number;
}

/**
 * 操作结果接口
 */
export interface ActionResult {
  /** 操作是否成功 */
  success: boolean;
  /** 描述文本（显示给玩家的叙事文本） */
  message: string;
  /** 效果列表 */
  effects: GameEffect[];
  /** 生命值变化列表 */
  hpChanges: HpChange[];
  /** 游戏状态变化（部分更新） */
  stateChanges?: Partial<GameState>;
  /** 是否触发了通关条件 */
  isLevelComplete?: boolean;
  /** 是否需要弹出UI界面 */
  showUI?: {
    type: 'password' | 'choice' | 'dialogue';
    data?: any;
  };
  /** 操作时间戳 */
  timestamp: number;
}

// ==================== 道具组合 ====================

/**
 * 前置条件类型
 */
export enum PreconditionType {
  /** 拥有特定道具 */
  HAS_ITEM = 'has_item',
  /** 道具状态检查 */
  ITEM_STATUS = 'item_status',
  /** 标志检查 */
  FLAG_SET = 'flag_set',
  /** 角色状态检查 */
  CHARACTER_STATUS = 'character_status',
  /** 区域已解锁 */
  AREA_UNLOCKED = 'area_unlocked',
  /** 已收集特定字母 */
  HAS_LETTER = 'has_letter',
  /** 自定义条件 */
  CUSTOM = 'custom',
}

/**
 * 前置条件接口
 */
export interface Precondition {
  /** 条件类型 */
  type: PreconditionType;
  /** 条件参数 */
  key?: string;
  /** 期望值 */
  value?: any;
  /** 条件不满足时的错误提示 */
  errorMessage?: string;
}

/**
 * 道具组合接口
 */
export interface ItemCombination {
  /** 组合ID */
  id: string;
  /** 触发关键词列表（支持同义词） */
  triggers: string[];
  /** 物品1（可以是道具名称或角色类型） */
  item1: string;
  /** 物品2（可以是道具名称或角色类型） */
  item2: string;
  /** 组合描述（玩家看到的效果文本） */
  description: string;
  /** 前置条件列表 */
  preconditions: Precondition[];
  /** 效果列表 */
  effects: GameEffect[];
  /** 生命值变化（如果有） */
  hpChange?: {
    /** 目标（角色类型或玩家ID，"all"表示所有玩家） */
    target: string;
    /** 变化量 */
    amount: number;
  };
  /** 是否为关键组合（通关必需） */
  isKeyAction: boolean;
  /** 是否可重复触发 */
  repeatable: boolean;
  /** 已触发次数（运行时数据） */
  triggeredCount?: number;
}

// ==================== 关卡配置 ====================

/**
 * 密码配置
 */
export interface PasswordConfig {
  /** 密码ID */
  id: string;
  /** 密码类型 */
  type: 'numeric' | 'letter' | 'mixed';
  /** 正确的密码 */
  correctPassword: string;
  /** 密码长度 */
  length: number;
  /** 是否区分大小写 */
  caseSensitive: boolean;
  /** 密码提示 */
  hint?: string;
  /** 密码正确时的效果 */
  successEffects: GameEffect[];
  /** 密码错误时的提示 */
  errorMessage: string;
}

/**
 * 区域配置
 */
export interface AreaConfig {
  /** 区域ID */
  id: string;
  /** 区域名称 */
  name: string;
  /** 区域描述 */
  description: string;
  /** 是否初始可见 */
  initiallyVisible: boolean;
  /** 解锁条件 */
  unlockConditions?: Precondition[];
}

/**
 * 关卡配置接口
 */
export interface LevelConfig {
  /** 关卡ID */
  id: number;
  /** 关卡名称 */
  name: string;
  /** 关卡描述 */
  description: string;
  /** 关卡类型 */
  type: 'linear' | 'open' | 'puzzle';
  /** 预计时长（分钟） */
  estimatedDuration: number;
  /** 初始玩家状态配置 */
  initialPlayerStates: Partial<PlayerState>[];
  /** 初始可见道具列表 */
  initialItems: GameItem[];
  /** 区域配置列表 */
  areas: AreaConfig[];
  /** 密码配置列表 */
  passwords: PasswordConfig[];
  /** 道具组合列表 */
  combinations: ItemCombination[];
  /** 通关条件 */
  winConditions: Precondition[];
  /** 同义词映射（用于关键词识别） */
  synonyms: Record<string, string[]>;
  /** 开场剧情文本 */
  introText: string;
  /** 通关剧情文本 */
  outroText: string;
  /** 特殊机制配置 */
  specialMechanics?: {
    /** 生命值是否锁定（第一关特殊机制） */
    hpLockEnabled?: boolean;
    /** 生命值锁定下限 */
    hpLockMinimum?: number;
    /** 新手引导文本 */
    tutorialText?: string[];
    /** 卡关提示配置 */
    hintSystem?: {
      /** 提示等级及对应的延迟时间（秒） */
      levels: { delay: number; message: string }[];
    };
  };
}

// ==================== 事件日志 ====================

/**
 * 事件日志类型
 */
export enum EventLogType {
  /** 系统消息 */
  SYSTEM = 'system',
  /** 玩家操作 */
  ACTION = 'action',
  /** 剧情对话 */
  DIALOGUE = 'dialogue',
  /** 错误提示 */
  ERROR = 'error',
  /** 提示信息 */
  HINT = 'hint',
  /** 生命值变化 */
  HP_CHANGE = 'hp_change',
  /** 道具获得 */
  ITEM_OBTAINED = 'item_obtained',
}

/**
 * 事件日志条目
 */
export interface EventLogEntry {
  /** 日志ID */
  id: string;
  /** 日志类型 */
  type: EventLogType;
  /** 日志文本内容 */
  text: string;
  /** 相关角色（如果有） */
  character?: CharacterType;
  /** 相关玩家ID（如果有） */
  playerId?: string;
  /** 时间戳 */
  timestamp: number;
  /** 额外数据 */
  metadata?: Record<string, any>;
}

// ==================== 游戏会话 ====================

/**
 * 游戏会话状态
 */
export enum GameSessionStatus {
  /** 等待开始 */
  WAITING = 'waiting',
  /** 游戏进行中 */
  PLAYING = 'playing',
  /** 游戏暂停 */
  PAUSED = 'paused',
  /** 游戏已完成 */
  COMPLETED = 'completed',
  /** 游戏已结束（失败或中断） */
  ENDED = 'ended',
}

/**
 * 游戏会话接口
 */
export interface GameSession {
  /** 会话ID（通常与房间ID相同） */
  id: string;
  /** 房间代码 */
  roomCode: string;
  /** 游戏状态 */
  gameState: GameState;
  /** 会话状态 */
  status: GameSessionStatus;
  /** 事件日志 */
  eventLog: EventLogEntry[];
  /** 创建时间 */
  createdAt: number;
  /** 开始时间 */
  startedAt?: number;
  /** 结束时间 */
  endedAt?: number;
  /** 最后活动时间 */
  lastActivityAt: number;
}

// ==================== 工具类型 ====================

/**
 * 关键词解析结果
 */
export interface ParsedInput {
  /** 原始输入 */
  rawInput: string;
  /** 识别出的操作类型 */
  actionType: ActionType;
  /** 目标1 */
  target1?: string;
  /** 目标2 */
  target2?: string;
  /** 是否成功解析 */
  isValid: boolean;
  /** 错误信息（如果解析失败） */
  error?: string;
}

/**
 * 游戏规则验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 验证失败的原因 */
  reason?: string;
  /** 建议的操作 */
  suggestion?: string;
}
