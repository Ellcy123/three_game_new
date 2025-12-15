/** 角色类型（内部使用，不显示给玩家） */
export type CharacterType = 'cat' | 'dog' | 'turtle';

/** 玩家 */
export interface Player {
  /** 玩家ID */
  id: string;
  /** Socket连接ID */
  socketId: string;
  /** 玩家名称 */
  name: string;
  /** 选择的角色编号 (1/2/3) */
  characterIndex?: number;
  /** 自定义角色名称 */
  customName?: string;
  /** 是否已准备 */
  isReady: boolean;
  /** 是否是房主 */
  isHost: boolean;
}

/** 玩家游戏状态 */
export interface PlayerState {
  /** 玩家ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 角色类型（内部记录，不显示给玩家） */
  characterType: CharacterType;
  /** 身份是否已揭示 */
  characterRevealed: boolean;
  /** 生命值 */
  health: number;
  /** 是否阵亡 */
  isIncapacitated: boolean;
  /** 是否被困 */
  isTrapped: boolean;
  /** 被困位置 */
  trappedLocation?: string;
  /** 是否已连接 */
  isConnected: boolean;
}
