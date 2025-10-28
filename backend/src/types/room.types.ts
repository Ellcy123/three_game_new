/**
 * 房间相关类型定义
 */

import { CharacterType, RoomStatus } from './index';

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
  roomCode: string; // 6位房间码
  name: string;
  creatorId: string;
  maxPlayers: number;
  currentPlayers: number;
  status: RoomStatus;
  players: RoomPlayer[];
  createdAt: Date;
  startedAt?: Date;
  password?: string; // 可选的房间密码
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

// 选择角色请求
export interface SelectCharacterRequest {
  roomId: string;
  character: CharacterType;
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

// 房间事件数据
export interface RoomEventData {
  room: GameRoom;
  player?: RoomPlayer;
  message?: string;
}
