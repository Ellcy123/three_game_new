import { v4 as uuidv4 } from 'uuid';
import { Room, RoomStatus } from '../../../shared/src/types/room';
import { Player, CharacterType } from '../../../shared/src/types/player';
import { MAX_PLAYERS, ROOM_CODE_LENGTH } from '../../../shared/src/constants/game';

/**
 * 房间管理器
 * 管理游戏房间的创建、加入和状态
 */
export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private roomsByCode: Map<string, string> = new Map(); // code -> roomId
  private playerRooms: Map<string, string> = new Map(); // playerId -> roomId

  // 角色编号到动物类型的映射（内部使用）
  private static readonly CHARACTER_MAP: Record<number, CharacterType> = {
    1: 'cat',
    2: 'dog',
    3: 'turtle'
  };

  /**
   * 生成唯一的房间代码
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
    let code: string;
    
    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.roomsByCode.has(code));
    
    return code;
  }

  /**
   * 创建新房间
   */
  createRoom(hostPlayer: Omit<Player, 'isHost' | 'isReady'>): Room {
    const roomId = uuidv4();
    const code = this.generateRoomCode();
    
    const player: Player = {
      ...hostPlayer,
      isHost: true,
      isReady: false
    };

    const room: Room = {
      id: roomId,
      code,
      players: [player],
      status: 'waiting',
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    this.roomsByCode.set(code, roomId);
    this.playerRooms.set(player.id, roomId);

    return room;
  }

  /**
   * 加入房间
   * @returns 房间对象，如果加入失败返回null
   */
  joinRoom(roomCode: string, player: Omit<Player, 'isHost' | 'isReady'>): Room | null {
    const roomId = this.roomsByCode.get(roomCode.toUpperCase());
    if (!roomId) {
      return null;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    if (room.players.length >= MAX_PLAYERS) {
      return null;
    }

    if (room.status !== 'waiting') {
      return null;
    }

    const newPlayer: Player = {
      ...player,
      isHost: false,
      isReady: false
    };

    room.players.push(newPlayer);
    this.playerRooms.set(player.id, roomId);

    return room;
  }

  /**
   * 离开房间
   */
  leaveRoom(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) {
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRooms.delete(playerId);

    // 如果房间空了，删除房间
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.roomsByCode.delete(room.code);
      return;
    }

    // 如果离开的是房主，转移房主
    const wasHost = room.players.every(p => !p.isHost);
    if (wasHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }
  }

  /**
   * 获取房间信息
   */
  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * 通过房间代码获取房间
   */
  getRoomByCode(code: string): Room | null {
    const roomId = this.roomsByCode.get(code.toUpperCase());
    if (!roomId) {
      return null;
    }
    return this.rooms.get(roomId) || null;
  }

  /**
   * 获取玩家所在的房间
   */
  getPlayerRoom(playerId: string): Room | null {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) {
      return null;
    }
    return this.rooms.get(roomId) || null;
  }

  /**
   * 玩家选择角色
   */
  selectCharacter(playerId: string, characterIndex: number, customName?: string): boolean {
    const room = this.getPlayerRoom(playerId);
    if (!room) {
      return false;
    }

    // 检查角色编号是否有效
    if (characterIndex < 1 || characterIndex > 3) {
      return false;
    }

    // 检查角色是否已被选择
    const isCharacterTaken = room.players.some(
      p => p.id !== playerId && p.characterIndex === characterIndex
    );
    if (isCharacterTaken) {
      return false;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return false;
    }

    player.characterIndex = characterIndex;
    if (customName) {
      player.customName = customName;
    }

    return true;
  }

  /**
   * 玩家准备
   */
  setPlayerReady(playerId: string, ready: boolean): boolean {
    const room = this.getPlayerRoom(playerId);
    if (!room) {
      return false;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return false;
    }

    // 必须先选择角色才能准备
    if (ready && !player.characterIndex) {
      return false;
    }

    player.isReady = ready;

    // 检查是否所有玩家都准备好了
    if (room.players.length === MAX_PLAYERS && room.players.every(p => p.isReady)) {
      room.status = 'ready';
    } else {
      room.status = 'waiting';
    }

    return true;
  }

  /**
   * 检查房间是否可以开始游戏
   */
  canStartGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    return (
      room.players.length === MAX_PLAYERS &&
      room.players.every(p => p.isReady && p.characterIndex)
    );
  }

  /**
   * 开始游戏
   */
  startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !this.canStartGame(roomId)) {
      return false;
    }

    room.status = 'playing';
    return true;
  }

  /**
   * 获取角色的动物类型（内部使用）
   */
  static getCharacterType(characterIndex: number): CharacterType | null {
    return RoomManager.CHARACTER_MAP[characterIndex] || null;
  }

  /**
   * 获取可用的角色编号
   */
  getAvailableCharacters(roomId: string): number[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }

    const takenCharacters = new Set(
      room.players.map(p => p.characterIndex).filter(Boolean)
    );

    return [1, 2, 3].filter(i => !takenCharacters.has(i));
  }

  /**
   * 更新玩家Socket ID（重连时使用）
   */
  updatePlayerSocket(playerId: string, newSocketId: string): boolean {
    const room = this.getPlayerRoom(playerId);
    if (!room) {
      return false;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return false;
    }

    player.socketId = newSocketId;
    return true;
  }
}
