import { Player } from './player';

/** 房间状态 */
export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'paused';

/** 房间 */
export interface Room {
  /** 房间ID */
  id: string;
  /** 房间代码（6位） */
  code: string;
  /** 玩家列表 */
  players: Player[];
  /** 房间状态 */
  status: RoomStatus;
  /** 创建时间 */
  createdAt: Date;
}
