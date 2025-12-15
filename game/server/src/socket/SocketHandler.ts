import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from '../engine/RoomManager';
import { StateManager } from '../engine/StateManager';
import { KeywordParser } from '../engine/KeywordParser';
import { EventSystem } from '../engine/EventSystem';
import { TurnManager } from '../engine/TurnManager';
import { PasswordManager } from '../engine/PasswordManager';
import { HealthManager } from '../engine/HealthManager';
import synonymsConfig from '../../../config/synonyms.json';
import level1Config from '../../../config/levels/level1.json';
import { LevelConfig } from '../../../shared/src/types/events';

/**
 * Socket事件处理器
 */
export class SocketHandler {
  private io: Server;
  private roomManager: RoomManager;
  private stateManager: StateManager;
  private keywordParser: KeywordParser;
  private eventSystem: EventSystem;
  private turnManager: TurnManager;
  private passwordManager: PasswordManager;
  private healthManager: HealthManager;
  private socketToPlayer: Map<string, string> = new Map(); // socketId -> playerId

  constructor(io: Server) {
    this.io = io;
    this.roomManager = new RoomManager();
    this.stateManager = new StateManager();
    this.keywordParser = new KeywordParser(synonymsConfig);
    this.eventSystem = new EventSystem(this.keywordParser);
    this.turnManager = new TurnManager();
    this.passwordManager = new PasswordManager();
    this.healthManager = new HealthManager();

    // 加载关卡配置
    this.eventSystem.loadLevelConfig(level1Config as LevelConfig);
  }

  /**
   * 初始化Socket连接处理
   */
  initialize(): void {
    this.io.on('connection', (socket) => {
      console.log('玩家连接:', socket.id);

      // 房间事件
      socket.on('room:create', (playerName: string) => this.handleCreateRoom(socket, playerName));
      socket.on('room:join', (roomCode: string, playerName: string) => this.handleJoinRoom(socket, roomCode, playerName));
      socket.on('room:leave', () => this.handleLeaveRoom(socket));
      socket.on('room:ready', (characterIndex: number, customName: string) => this.handleReady(socket, characterIndex, customName));
      socket.on('game:start', () => this.handleStartGame(socket));

      // 游戏事件
      socket.on('game:action', (input: string) => this.handleGameAction(socket, input));
      socket.on('game:password', (password: string, type: 'suitcase' | 'door') => this.handlePassword(socket, password, type));
      socket.on('game:choice', (choice: string) => this.handleChoice(socket, choice));
      socket.on('game:revive', (targetPlayerId: string) => this.handleRevive(socket, targetPlayerId));

      // 断开连接
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  /**
   * 创建房间
   */
  private handleCreateRoom(socket: Socket, playerName: string): void {
    const playerId = uuidv4();
    this.socketToPlayer.set(socket.id, playerId);

    const room = this.roomManager.createRoom({
      id: playerId,
      socketId: socket.id,
      name: playerName
    });

    socket.join(room.id);
    socket.emit('room:created', { id: room.id, code: room.code, playerId, players: room.players });
    console.log(`房间创建: ${room.code}, 玩家: ${playerName}`);
  }

  /**
   * 加入房间
   */
  private handleJoinRoom(socket: Socket, roomCode: string, playerName: string): void {
    const playerId = uuidv4();
    
    const room = this.roomManager.joinRoom(roomCode, {
      id: playerId,
      socketId: socket.id,
      name: playerName
    });

    if (!room) {
      socket.emit('room:error', '无法加入房间，房间不存在或已满');
      return;
    }

    this.socketToPlayer.set(socket.id, playerId);
    socket.join(room.id);

    // 通知房间内所有玩家
    const playerInfo = room.players.find(p => p.id === playerId);
    socket.to(room.id).emit('room:playerJoined', playerInfo);
    socket.emit('room:joined', { 
      id: room.id, 
      code: room.code, 
      players: room.players,
      playerId 
    });

    console.log(`玩家 ${playerName} 加入房间 ${roomCode}`);
  }

  /**
   * 离开房间
   */
  private handleLeaveRoom(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (room) {
      this.roomManager.leaveRoom(playerId);
      socket.to(room.id).emit('room:playerLeft', playerId);
      socket.leave(room.id);
    }

    this.socketToPlayer.delete(socket.id);
  }

  /**
   * 玩家准备
   */
  private handleReady(socket: Socket, characterIndex: number, customName: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const success = this.roomManager.selectCharacter(playerId, characterIndex, customName);
    if (!success) {
      socket.emit('room:error', '无法选择该角色，可能已被其他玩家选择');
      return;
    }

    this.roomManager.setPlayerReady(playerId, true);
    
    const room = this.roomManager.getPlayerRoom(playerId);
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      this.io.to(room.id).emit('room:playerReady', playerId, characterIndex, player?.customName);
      
      // 检查是否可以开始游戏
      if (this.roomManager.canStartGame(room.id)) {
        this.io.to(room.id).emit('room:canStart');
      }
    }
  }

  /**
   * 开始游戏
   */
  private handleStartGame(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    // 检查是否是房主
    const player = room.players.find(p => p.id === playerId);
    if (!player?.isHost) {
      socket.emit('room:error', '只有房主可以开始游戏');
      return;
    }

    if (!this.roomManager.canStartGame(room.id)) {
      socket.emit('room:error', '还不能开始游戏，请等待所有玩家准备');
      return;
    }

    this.roomManager.startGame(room.id);
    const gameState = this.stateManager.initializeState(room.id, room.players);

    this.io.to(room.id).emit('game:started', this.sanitizeState(gameState));
    console.log(`游戏开始: 房间 ${room.code}`);
  }

  /**
   * 处理游戏行动
   */
  private handleGameAction(socket: Socket, input: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    // 检查是否是当前玩家的回合
    const canAct = this.turnManager.canPlayerAct(state, playerId);
    if (!canAct.canAct) {
      socket.emit('game:eventResult', {
        success: false,
        storyText: canAct.reason
      });
      return;
    }

    // 解析关键词
    const combination = this.keywordParser.parse(input);
    if (!combination) {
      socket.emit('game:eventResult', {
        success: false,
        storyText: '请输入正确的格式，如：水潭+乌龟'
      });
      return;
    }

    // 查找并执行事件
    console.log(`解析关键词: ${combination.keyword1} + ${combination.keyword2}`);
    console.log(`当前状态: unlockedAreas=${JSON.stringify(state.unlockedAreas)}, smallRoomUnlocked=${state.smallRoomUnlocked}`);
    
    const event = this.eventSystem.findEvent(combination, state.levelId);
    console.log(`找到事件: ${event ? event.id : '无'}`);
    
    let result;
    
    if (event) {
      result = this.eventSystem.execute(event, state, playerId);
      console.log(`执行结果: success=${result.success}, requiresPassword=${result.requiresPassword}`);
    } else {
      result = this.eventSystem.handleNoMatch(combination);
    }

    // 替换玩家名称占位符
    result.storyText = this.replacePlaceholders(result.storyText, state);

    // 广播结果
    this.io.to(room.id).emit('game:eventResult', result);

    // 如果需要密码或选择，不推进回合
    if (!result.requiresPassword && !result.requiresChoice && result.success) {
      const nextPlayerId = this.turnManager.advanceTurn(state);
      this.io.to(room.id).emit('game:turnChange', nextPlayerId);
    }

    // 广播状态更新
    this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
  }

  /**
   * 处理密码输入
   */
  private handlePassword(socket: Socket, password: string, type: 'suitcase' | 'door'): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    let result;
    if (type === 'suitcase') {
      result = this.passwordManager.verifySuitcasePassword(password, state);
      if (result.success && result.nextAction === 'free_cat') {
        const catPlayer = state.players.find(p => p.characterType === 'cat');
        if (catPlayer) {
          catPlayer.isTrapped = false;
          catPlayer.trappedLocation = undefined;
          state.triggeredEvents.push('evt_cat_rescued');
        }
      }
    } else {
      result = this.passwordManager.verifyDoorPassword(password, state);
      if (result.success && result.nextAction === 'level_complete') {
        state.levelId = 'level2';
        // TODO: 初始化第二关
      }
    }

    this.io.to(room.id).emit('game:eventResult', {
      success: result.success,
      storyText: result.message
    });

    if (result.success) {
      // 推进回合
      const nextPlayerId = this.turnManager.advanceTurn(state);
      this.io.to(room.id).emit('game:turnChange', nextPlayerId);
      this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
    }
  }

  /**
   * 处理选择
   */
  private handleChoice(socket: Socket, choice: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    if (choice === '按下按钮') {
      // 触发小房间解锁事件
      state.unlockedAreas.push('small_room');
      state.smallRoomUnlocked = true;
      state.triggeredEvents.push('evt_small_room_unlock');

      const dogPlayer = state.players.find(p => p.characterType === 'dog');
      const storyText = `衣柜缓缓移开，后面居然有一个小房间！小房间里有一个巨大的囚笼，${dogPlayer?.name}被困在其中！房间内还有一个花瓶和一台电脑。墙上有一扇只能用四位密码触发打开的大门。`;

      this.io.to(room.id).emit('game:eventResult', {
        success: true,
        storyText
      });
    } else {
      this.io.to(room.id).emit('game:eventResult', {
        success: true,
        storyText: '你决定先不按这个按钮。'
      });
    }

    // 推进回合
    const nextPlayerId = this.turnManager.advanceTurn(state);
    this.io.to(room.id).emit('game:turnChange', nextPlayerId);
    this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
  }

  /**
   * 处理复活
   */
  private handleRevive(socket: Socket, targetPlayerId: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    const result = this.healthManager.revive(state, playerId, targetPlayerId);
    
    this.io.to(room.id).emit('game:eventResult', {
      success: result.success,
      storyText: result.message
    });

    if (result.success) {
      this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (room) {
      // 标记玩家断开连接
      const state = this.stateManager.getState(room.id);
      if (state) {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
          player.isConnected = false;
        }
        this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
      }

      socket.to(room.id).emit('room:playerDisconnected', playerId);
    }

    console.log('玩家断开:', socket.id);
  }

  /**
   * 替换剧情文本中的占位符
   */
  private replacePlaceholders(text: string, state: any): string {
    const catPlayer = state.players.find((p: any) => p.characterType === 'cat');
    const dogPlayer = state.players.find((p: any) => p.characterType === 'dog');
    const turtlePlayer = state.players.find((p: any) => p.characterType === 'turtle');

    return text
      .replace(/{player1}/g, catPlayer?.name || '猫咪')
      .replace(/{player2}/g, dogPlayer?.name || '狗狗')
      .replace(/{player3}/g, turtlePlayer?.name || '乌龟');
  }

  /**
   * 清理状态（隐藏未揭示的角色类型）
   */
  private sanitizeState(state: any): any {
    return {
      ...state,
      players: state.players.map((p: any) => ({
        ...p,
        characterType: p.characterRevealed ? p.characterType : undefined
      }))
    };
  }
}
