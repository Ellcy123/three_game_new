/**
 * 房间相关类型定义（前端）
 */

// 角色类型常量
export const CharacterType = {
  CAT: 'cat',
  DOG: 'dog',
  TURTLE: 'turtle',
} as const;

// 角色类型
export type CharacterType = typeof CharacterType[keyof typeof CharacterType];

// 房间状态常量
export const RoomStatus = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished',
} as const;

// 房间状态类型
export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus];

// 房间中的玩家信息
export interface RoomPlayer {
  id: string;
  username: string;
  character: CharacterType;
  isReady: boolean;
  isRoomCreator: boolean;
  socketId: string;
  joinedAt: Date;
}

// 完整的游戏房间信息
export interface GameRoom {
  id: string;
  roomCode: string; // 6位房间码（必需）
  name: string;
  creatorId: string;
  maxPlayers: number;
  currentPlayers: number;
  status: RoomStatus;
  players: RoomPlayer[];
  createdAt: Date;
  startedAt?: Date;
  password?: string;
}

// 创建房间请求
export interface CreateRoomRequest {
  name: string;
  maxPlayers: number;
  password?: string;
  character: CharacterType;
  username: string;
}

// 加入房间请求
export interface JoinRoomRequest {
  roomId: string;
  character?: CharacterType; // 可选：加入时可以不选角色，在房间内再选
  username: string;
  password?: string;
}

// 选择角色请求
export interface SelectCharacterRequest {
  roomId: string;
  character: CharacterType;
}

// 房间列表项（用于显示房间列表）
export interface RoomListItem {
  id: string;
  name: string;
  currentPlayers: number;
  maxPlayers: number;
  status: RoomStatus;
  hasPassword: boolean;
  createdAt: Date;
}

// 离开房间请求
export interface LeaveRoomRequest {
  roomId: string;
  playerId: string;
}

// 准备状态更新请求
export interface ReadyStatusRequest {
  roomId: string;
  playerId: string;
  isReady: boolean;
}

// 开始游戏请求
export interface StartGameRequest {
  roomId: string;
  playerId: string;
}

// 房间相关的响应类型
export interface RoomResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// 房间事件数据（用于Socket通信）
export interface RoomEventData {
  room: GameRoom;
  player?: RoomPlayer;
  message?: string;
}

// 角色选择数据
export interface CharacterOption {
  type: CharacterType;
  name: string;
  description: string;
  icon?: string;
}
