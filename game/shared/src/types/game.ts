import { PlayerState } from './player';

/** 物品 */
export interface InventoryItem {
  /** 物品ID */
  id: string;
  /** 物品名称 */
  name: string;
  /** 是否已消失 */
  isDestroyed: boolean;
}

/** 游戏状态 */
export interface GameState {
  /** 房间ID */
  roomId: string;
  /** 当前关卡ID */
  levelId: string;
  /** 当前回合数 */
  round: number;
  /** 当前行动玩家索引 */
  currentPlayerIndex: number;
  /** 玩家状态列表 */
  players: PlayerState[];
  /** 已触发的一次性事件ID */
  triggeredEvents: string[];
  /** 已收集的字母 */
  collectedLetters: string[];
  /** 已解锁的区域 */
  unlockedAreas: string[];
  /** 团队物品栏 */
  inventory: InventoryItem[];
  /** 小房间是否已开启 */
  smallRoomUnlocked: boolean;
}

/** 关键词组合 */
export interface KeywordCombination {
  /** 标准化后的第一个关键词 */
  keyword1: string;
  /** 标准化后的第二个关键词 */
  keyword2: string;
  /** 原始输入 */
  rawInput: string;
}

/** 事件结果 */
export interface EventResult {
  /** 是否成功 */
  success: boolean;
  /** 剧情文本 */
  storyText: string;
  /** 状态变更 */
  stateChanges?: Partial<GameState>;
  /** 生命值变化 */
  healthChanges?: { playerId: string; change: number }[];
  /** 获得的物品 */
  itemsGained?: string[];
  /** 获得的字母 */
  lettersGained?: string[];
  /** 解锁的区域 */
  areasUnlocked?: string[];
  /** 是否需要密码输入 */
  requiresPassword?: boolean;
  /** 密码类型 */
  passwordType?: 'suitcase' | 'door';
  /** 是否需要选择 */
  requiresChoice?: boolean;
  /** 选择选项 */
  choices?: string[];
}


/** 第二关 - 藏匿区域 */
export interface HidingAreaState {
  id: string;
  name: string;
  capacity: number;
  isDestroyed: boolean;
  currentPlayers: string[];
}

/** 第二关 - 藏匿游戏状态 */
export interface HidingGameState {
  roomId: string;
  levelId: 'level2';
  currentRound: number;
  maxRounds: number;
  phase: 'story' | 'rules' | 'selecting' | 'attacking' | 'result' | 'final' | 'ending';
  areas: HidingAreaState[];
  destroyedAreas: string[];
  playerSelections: Record<string, string | null>;
  playerConfirmed: Record<string, boolean>;
  playerHitCounts: Record<string, number>;
  selectionTimeLeft: number;
  lastAttackedArea: string | null;
  hitPlayersThisRound: string[];
  players: PlayerState[];
}

/** 第二关 - 攻击结果 */
export interface HidingAttackResult {
  attackedAreaId: string;
  attackedAreaName: string;
  hitPlayers: string[];
  attackText: string;
}