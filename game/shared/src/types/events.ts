import { KeywordCombination } from './game';

/** 事件效果类型 */
export type EventEffectType = 'health' | 'item' | 'unlock' | 'letter' | 'status' | 'destroy_item' | 'free_character';

/** 事件效果 */
export interface EventEffect {
  /** 效果类型 */
  type: EventEffectType;
  /** 目标（角色ID或区域ID） */
  target?: string;
  /** 效果值 */
  value: number | string;
}

/** 游戏事件 */
export interface GameEvent {
  /** 事件唯一标识 */
  id: string;
  /** 触发条件（关键词组合） */
  trigger: KeywordCombination;
  /** 前置事件ID列表 */
  prerequisites: string[];
  /** 前置条件（角色状态等） */
  conditions?: EventCondition[];
  /** 事件效果列表 */
  effects: EventEffect[];
  /** 是否一次性事件 */
  isOneTime: boolean;
  /** 剧情文本 */
  storyText: string;
  /** 是否需要密码 */
  requiresPassword?: boolean;
  /** 密码类型 */
  passwordType?: 'suitcase' | 'door';
  /** 是否需要选择 */
  requiresChoice?: boolean;
  /** 选择选项 */
  choices?: string[];
}

/** 事件条件 */
export interface EventCondition {
  /** 条件类型 */
  type: 'character_free' | 'character_trapped' | 'has_item' | 'area_unlocked' | 'has_letter';
  /** 目标 */
  target: string;
  /** 是否取反 */
  negate?: boolean;
}

/** 关卡配置 */
export interface LevelConfig {
  /** 关卡ID */
  levelId: string;
  /** 关卡名称 */
  name: string;
  /** 初始可见区域 */
  initialAreas: string[];
  /** 事件列表 */
  events: GameEvent[];
}

/** WebSocket客户端事件 */
export interface ClientEvents {
  'room:create': (playerName: string) => void;
  'room:join': (roomCode: string, playerName: string) => void;
  'room:leave': () => void;
  'room:ready': (characterIndex: number, customName: string) => void;
  'game:start': () => void;
  'game:action': (input: string) => void;
  'game:password': (password: string, type: 'suitcase' | 'door') => void;
  'game:choice': (choice: string) => void;
  'game:revive': (targetPlayerId: string) => void;
}

/** WebSocket服务端事件 */
export interface ServerEvents {
  'room:created': (room: { id: string; code: string }) => void;
  'room:joined': (room: { id: string; code: string; players: any[] }) => void;
  'room:playerJoined': (player: any) => void;
  'room:playerLeft': (playerId: string) => void;
  'room:playerReady': (playerId: string, characterIndex: number) => void;
  'room:error': (message: string) => void;
  'game:started': (state: any) => void;
  'game:stateUpdate': (state: any) => void;
  'game:eventResult': (result: any) => void;
  'game:turnChange': (currentPlayerId: string) => void;
  'game:characterRevealed': (playerId: string, characterType: string) => void;
  'game:requirePassword': (type: 'suitcase' | 'door') => void;
  'game:requireChoice': (choices: string[]) => void;
}
