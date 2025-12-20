import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from '../engine/RoomManager';
import { StateManager } from '../engine/StateManager';
import { KeywordParser } from '../engine/KeywordParser';
import { EventSystem } from '../engine/EventSystem';
import { TurnManager } from '../engine/TurnManager';
import { PasswordManager } from '../engine/PasswordManager';
import { HealthManager } from '../engine/HealthManager';
import { HidingManager, HidingLevelConfig } from '../engine/HidingManager';
import { StoryManager } from '../engine/StoryManager';
import { MouseKingManager, AttackResult } from '../engine/MouseKingManager';
import { ParrotManager, RoundResult } from '../engine/ParrotManager';
import { DeathManager, RoundResult as DeathRoundResult } from '../engine/DeathManager';
import { TurtleSoupManager, TurtleSoupConfig } from '../engine/TurtleSoupManager';
import { PlayerSkillInfo } from '../engine/BossManager';
import synonymsConfig from '../../../config/synonyms.json';
import turtleSoupConfig from '../../../config/levels/turtle-soup.json';
import boss1MouseKingConfig from '../../../config/levels/boss1-mouseking.json';
import boss2ParrotConfig from '../../../config/levels/boss2-parrot.json';
import boss3DeathConfig from '../../../config/levels/boss3-death.json';
import level1Config from '../../../config/levels/level1.json';
import level2Config from '../../../config/levels/level2.json';
import level3CatConfig from '../../../config/levels/level3-cat.json';
import level3CatChoicesKungfu from '../../../config/levels/level3-cat-choices.json';
import level3CatChoicesBusiness from '../../../config/levels/level3-cat-business.json';
import level3CatChoicesRobot from '../../../config/levels/level3-cat-robot.json';
// 狗狗线配置
import level3DogConfig from '../../../config/levels/level3-dog.json';
import level3DogCelestial from '../../../config/levels/level3-dog-celestial.json';
import level3DogTransformer from '../../../config/levels/level3-dog-transformer.json';
// 乌龟线配置
import level3TurtleConfig from '../../../config/levels/level3-turtle.json';
import level3TurtleNinja from '../../../config/levels/level3-turtle-ninja.json';
import level3TurtleBlastoise from '../../../config/levels/level3-turtle-blastoise.json';
import level3TurtleGolden from '../../../config/levels/level3-turtle-golden.json';
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
  private hidingManagers: Map<string, HidingManager> = new Map(); // roomId -> HidingManager
  private hidingTimers: Map<string, NodeJS.Timeout> = new Map(); // roomId -> timer
  private storyManagers: Map<string, StoryManager> = new Map(); // roomId -> StoryManager
  private mouseKingManagers: Map<string, MouseKingManager> = new Map(); // roomId -> MouseKingManager
  private parrotManagers: Map<string, ParrotManager> = new Map(); // roomId -> ParrotManager
  private deathManagers: Map<string, DeathManager> = new Map(); // roomId -> DeathManager
  private turtleSoupManagers: Map<string, TurtleSoupManager> = new Map(); // roomId -> TurtleSoupManager
  private socketToPlayer: Map<string, string> = new Map(); // socketId -> playerId
  private chatHistory: Map<string, any[]> = new Map(); // roomId -> messages
  private chatEnabled: Map<string, boolean> = new Map(); // roomId -> enabled
  private lastSystemMessage: Map<string, { content: string; timestamp: number }> = new Map(); // roomId -> last message
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map(); // playerId -> disconnect timer

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

      // 第二关 - 藏匿事件
      socket.on('hiding:nextStory', () => this.handleHidingNextStory(socket));
      socket.on('hiding:nextPhase', () => this.handleHidingNextPhase(socket));
      socket.on('hiding:selectArea', (areaId: string) => this.handleHidingSelectArea(socket, areaId));
      socket.on('hiding:confirmSelection', () => this.handleHidingConfirmSelection(socket));

      // 第三幕 - 个人剧情事件
      socket.on('story:nextStory', () => this.handleStoryNextStory(socket));
      socket.on('story:nextPhase', () => this.handleStoryNextPhase(socket));
      socket.on('story:selectBranch', (branch: string) => this.handleStorySelectBranch(socket, branch));
      socket.on('story:makeChoice', (option: string) => this.handleStoryMakeChoice(socket, option));

      // BOSS战 - 鼠鼠大王事件
      socket.on('boss:nextStory', () => this.handleBossNextStory(socket));
      socket.on('boss:startBattle', () => this.handleBossStartBattle(socket));
      socket.on('boss:selectFighter', (playerId: string) => this.handleBossSelectFighter(socket, playerId));
      socket.on('boss:attackHole', (holeIndex: number) => this.handleBossAttackHole(socket, holeIndex));
      socket.on('boss:nextRound', () => this.handleBossNextRound(socket));

      // BOSS战 - 百变小鹦事件
      socket.on('parrot:startBattle', () => this.handleParrotStartBattle(socket));
      socket.on('parrot:submitAnswer', (answer: string) => this.handleParrotSubmitAnswer(socket, answer));
      socket.on('parrot:nextRound', () => this.handleParrotNextRound(socket));

      // BOSS战 - 死神事件
      socket.on('death:startBattle', () => this.handleDeathStartBattle(socket));
      socket.on('death:setBet', (amount: number) => this.handleDeathSetBet(socket, amount));
      socket.on('death:setChoice', (choice: string) => this.handleDeathSetChoice(socket, choice));
      socket.on('death:confirmBet', () => this.handleDeathConfirmBet(socket));
      socket.on('death:roll', () => this.handleDeathRoll(socket));
      socket.on('death:nextRound', () => this.handleDeathNextRound(socket));

      // 海龟汤事件
      socket.on('soup:nextStory', () => this.handleSoupNextStory(socket));
      socket.on('soup:nextPhase', () => this.handleSoupNextPhase(socket));
      socket.on('soup:goBack', () => this.handleSoupGoBack(socket));
      socket.on('soup:askQuestion', (keywordId: string, questionId: string) => this.handleSoupAskQuestion(socket, keywordId, questionId));
      socket.on('soup:submitDeathCount', (answer: string) => this.handleSoupSubmitDeathCount(socket, answer));
      socket.on('soup:submitIsHuman', (answer: string) => this.handleSoupSubmitIsHuman(socket, answer));
      socket.on('soup:submitIdentity', (animalId: string) => this.handleSoupSubmitIdentity(socket, animalId));
      socket.on('soup:confirmIdentities', () => this.handleSoupConfirmIdentities(socket));

      // 调试：直接跳到第三关
      socket.on('debug:skipToLevel3', () => this.handleDebugSkipToLevel3(socket));
      // 调试：直接跳到海龟汤
      socket.on('debug:skipToSoup', () => this.handleDebugSkipToSoup(socket));
      // 调试：直接跳到BOSS战
      socket.on('debug:skipToBoss1', () => this.handleDebugSkipToBoss1(socket));
      socket.on('debug:skipToBoss2', () => this.handleDebugSkipToBoss2(socket));
      socket.on('debug:skipToBoss3', () => this.handleDebugSkipToBoss3(socket));

      // 聊天室事件
      socket.on('chat:send', (data: { content: string }) => this.handleChatSend(socket, data.content));

      // 重连事件
      socket.on('room:reconnect', (playerId: string, roomId: string) => this.handleReconnect(socket, playerId, roomId));

      // 强制推进游戏（防卡死）
      socket.on('game:forceAdvance', () => this.handleForceAdvance(socket));

      // 重新开始游戏（回到等待房间）
      socket.on('game:restart', () => this.handleRestartGame(socket));

      // 断开连接
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  /**
   * 处理玩家重连
   */
  private handleReconnect(socket: Socket, playerId: string, roomId: string): void {
    console.log(`玩家尝试重连: playerId=${playerId}, roomId=${roomId}`);
    
    // 查找房间
    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      socket.emit('room:reconnectFailed', '房间不存在或已关闭');
      return;
    }
    
    // 查找玩家
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit('room:reconnectFailed', '玩家不在该房间中');
      return;
    }
    
    // 更新socket映射
    this.socketToPlayer.set(socket.id, playerId);
    
    // 取消掉线消息的定时器（如果存在）
    const disconnectTimer = this.disconnectTimers.get(playerId);
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      this.disconnectTimers.delete(playerId);
    }
    
    // 更新玩家的socketId
    (player as any).socketId = socket.id;
    
    // 加入socket房间
    socket.join(roomId);
    
    // 获取游戏状态
    const gameState = this.stateManager.getState(roomId);
    
    // 标记玩家重新连接
    if (gameState) {
      const gamePlayer = gameState.players.find((p: any) => p.id === playerId);
      if (gamePlayer) {
        gamePlayer.isConnected = true;
      }
    }
    
    // 确定当前关卡
    let currentLevel = 'level1';
    if (this.hidingManagers.has(roomId)) currentLevel = 'level2';
    if (this.turtleSoupManagers.has(roomId)) currentLevel = 'turtle-soup';
    if (this.storyManagers.has(roomId)) currentLevel = 'level3';
    if (this.mouseKingManagers.has(roomId)) currentLevel = 'boss1';
    if (this.parrotManagers.has(roomId)) currentLevel = 'boss2';
    if (this.deathManagers.has(roomId)) currentLevel = 'boss3';
    
    // 获取各关卡状态
    const hidingManager = this.hidingManagers.get(roomId);
    const storyManager = this.storyManagers.get(roomId);
    const mouseKingManager = this.mouseKingManagers.get(roomId);
    const parrotManager = this.parrotManagers.get(roomId);
    const deathManager = this.deathManagers.get(roomId);
    const soupManager = this.turtleSoupManagers.get(roomId);
    
    // 发送重连成功消息
    socket.emit('room:reconnected', {
      roomId: room.id,
      roomCode: room.code,
      playerId,
      players: room.players,
      gameState: gameState ? this.sanitizeState(gameState) : null,
      currentLevel,
      hidingState: hidingManager ? this.serializeHidingState(hidingManager.getState(), gameState?.players || []) : null,
      storyState: storyManager ? storyManager.serializeState() : null,
      bossState: mouseKingManager ? mouseKingManager.serializeState() : null,
      parrotState: parrotManager ? parrotManager.serializeState() : null,
      deathState: deathManager ? deathManager.serializeState() : null,
      soupState: soupManager ? soupManager.serializeState() : null,
      endingId: null, // TODO: 如果需要支持结局重连
      chatHistory: this.chatHistory.get(roomId) || []
    });
    
    // 通知其他玩家 - 使用游戏内名字
    const gamePlayer = gameState?.players.find((p: any) => p.id === playerId);
    const displayName = gamePlayer?.name || player.customName || player.name || '玩家';
    this.sendSystemMessage(roomId, `${displayName} 已重新连接`);
    
    // 广播状态更新
    if (gameState) {
      this.io.to(roomId).emit('game:stateUpdate', this.sanitizeState(gameState));
    }
    
    console.log(`玩家重连成功: ${displayName}`);
  }

  /**
   * 强制推进游戏（防卡死）
   */
  private handleForceAdvance(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const roomId = room.id;
    const state = this.stateManager.getState(roomId);
    
    console.log(`玩家 ${playerId} 请求强制推进游戏`);
    
    // 根据当前关卡执行不同的推进逻辑
    const hidingManager = this.hidingManagers.get(roomId);
    const storyManager = this.storyManagers.get(roomId);
    const mouseKingManager = this.mouseKingManagers.get(roomId);
    const parrotManager = this.parrotManagers.get(roomId);
    const deathManager = this.deathManagers.get(roomId);
    const soupManager = this.turtleSoupManagers.get(roomId);
    
    // 海龟汤
    if (soupManager) {
      const soupState = soupManager.getState();
      if (soupState) {
        soupManager.nextPhase();
        this.io.to(roomId).emit('soup:stateUpdate', soupManager.serializeState());
        this.sendSystemMessage(roomId, '🔧 已强制推进到下一阶段');
        return;
      }
    }
    
    // 藏匿关卡
    if (hidingManager) {
      const hidingState = hidingManager.getState();
      if (hidingState) {
        // 如果在选择阶段，为所有未选择的玩家随机分配
        if (hidingState.phase === 'selecting') {
          hidingManager.assignRandomAreas();
          // 强制所有玩家确认
          const playerIds = Array.from(hidingState.playerSelections.keys());
          playerIds.forEach((pid: string) => {
            hidingManager.confirmSelection(pid);
          });
        }
        hidingManager.nextPhase();
        this.io.to(roomId).emit('hiding:stateUpdate', this.serializeHidingState(hidingManager.getState(), state?.players || []));
        this.sendSystemMessage(roomId, '🔧 已强制推进到下一阶段');
        return;
      }
    }
    
    // 第三幕
    if (storyManager) {
      const storyState = storyManager.getState();
      if (storyState) {
        // 根据当前阶段推进到下一阶段
        const phaseOrder = ['intro', 'turn_intro', 'branch_select', 'branch_story', 'choice', 'choice_result', 'ending', 'summary', 'next_player'];
        const currentIndex = phaseOrder.indexOf(storyState.phase);
        if (currentIndex < phaseOrder.length - 1) {
          storyManager.setPhase(phaseOrder[currentIndex + 1] as any);
        }
      }
      this.io.to(roomId).emit('story:stateUpdate', storyManager.serializeState());
      this.sendSystemMessage(roomId, '🔧 已强制推进到下一阶段');
      return;
    }
    
    // BOSS1 - 鼠鼠大王
    if (mouseKingManager) {
      mouseKingManager.nextRound();
      this.io.to(roomId).emit('boss:stateUpdate', mouseKingManager.serializeState());
      this.sendSystemMessage(roomId, '🔧 已强制推进到下一回合');
      return;
    }
    
    // BOSS2 - 百变小鹦
    if (parrotManager) {
      parrotManager.nextRound();
      this.io.to(roomId).emit('parrot:stateUpdate', parrotManager.serializeState());
      this.sendSystemMessage(roomId, '🔧 已强制推进到下一回合');
      return;
    }
    
    // BOSS3 - 死神
    if (deathManager) {
      deathManager.nextRound();
      this.io.to(roomId).emit('death:stateUpdate', deathManager.serializeState());
      this.sendSystemMessage(roomId, '🔧 已强制推进到下一回合');
      return;
    }
    
    // 第一关 - 推进回合
    if (state) {
      const nextPlayerId = this.turnManager.advanceTurn(state);
      this.io.to(roomId).emit('game:turnChange', nextPlayerId);
      this.io.to(roomId).emit('game:stateUpdate', this.sanitizeState(state));
      this.sendSystemMessage(roomId, '🔧 已强制推进到下一回合');
    }
  }

  /**
   * 重新开始游戏（回到等待房间）
   */
  private handleRestartGame(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const roomId = room.id;
    console.log(`玩家 ${playerId} 请求重新开始游戏`);

    // 清理所有游戏状态
    this.stateManager.deleteState(roomId);
    this.hidingManagers.delete(roomId);
    this.storyManagers.delete(roomId);
    this.mouseKingManagers.delete(roomId);
    this.parrotManagers.delete(roomId);
    this.deathManagers.delete(roomId);
    this.turtleSoupManagers.delete(roomId);
    this.chatHistory.delete(roomId);

    // 重置房间中所有玩家的准备状态
    room.players.forEach(player => {
      player.isReady = false;
      player.characterIndex = undefined;
      player.customName = undefined;
    });

    // 通知所有玩家回到等待房间
    this.io.to(roomId).emit('game:restarted', {
      room: {
        id: room.id,
        code: room.code,
        players: room.players
      }
    });

    this.sendSystemMessage(roomId, '🔄 游戏已重置，请重新准备');
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

    // 设置玩家名字映射，让玩家可以用自己的名字作为关键词
    const playerNameMappings = gameState.players.map((p: any) => ({
      playerId: p.id,
      customName: p.name,
      characterType: p.characterType
    }));
    this.keywordParser.setPlayerNames(playerNameMappings);

    this.io.to(room.id).emit('game:started', this.sanitizeState(gameState));
    console.log(`游戏开始: 房间 ${room.code}`);

    // 发送游戏开始系统消息
    this.sendSystemMessage(room.id, '🎮 游戏开始！');
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
        // 初始化第二关
        this.initializeLevel2(room.id, state);
        return; // 不继续执行后面的逻辑，由initializeLevel2处理
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
          
          // 延迟发送掉线消息，给玩家重连的机会
          // 如果玩家在3秒内重连，就不发送掉线消息
          const existingTimer = this.disconnectTimers.get(playerId);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }
          
          const timer = setTimeout(() => {
            // 再次检查玩家是否仍然断开
            const currentState = this.stateManager.getState(room.id);
            const currentPlayer = currentState?.players.find((p: any) => p.id === playerId);
            if (currentPlayer && !currentPlayer.isConnected) {
              this.sendSystemMessage(room.id, `${player.name} 已掉线`);
            }
            this.disconnectTimers.delete(playerId);
          }, 3000);
          
          this.disconnectTimers.set(playerId, timer);
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

  // ==================== 第二关 - 藏匿 ====================

  /**
   * 初始化第二关
   */
  private initializeLevel2(roomId: string, state: any): void {
    const hidingManager = new HidingManager();
    const playerIds = state.players.map((p: any) => p.id);
    
    const hidingState = hidingManager.initialize(level2Config as HidingLevelConfig, playerIds);
    this.hidingManagers.set(roomId, hidingManager);

    // 发送第二关开始事件
    this.io.to(roomId).emit('game:levelChange', {
      levelId: 'level2',
      levelName: '藏匿',
      openingStory: (level2Config as any).openingStory
    });

    // 发送藏匿状态
    this.io.to(roomId).emit('hiding:stateUpdate', this.serializeHidingState(hidingState, state.players));
    
    console.log(`房间 ${roomId} 进入第二关：藏匿`);
  }

  /**
   * 处理藏匿关卡的下一段剧情
   */
  private handleHidingNextStory(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    this.io.to(room.id).emit('hiding:nextStory');
  }

  /**
   * 处理藏匿关卡的下一阶段
   */
  private handleHidingNextPhase(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const hidingManager = this.hidingManagers.get(room.id);
    if (!hidingManager) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    const hidingState = hidingManager.nextPhase();
    if (!hidingState) return;

    // 如果进入选择阶段，启动倒计时
    if (hidingState.phase === 'selecting') {
      this.startSelectionTimer(room.id, state);
      // 发送轮次开始文本
      const roundText = hidingManager.getRoundText();
      this.io.to(room.id).emit('hiding:roundStart', {
        round: hidingState.currentRound,
        text: roundText
      });
    }

    // 如果进入攻击阶段，执行攻击
    if (hidingState.phase === 'attacking') {
      this.executeHidingAttack(room.id, state);
      return;
    }

    // 如果进入最终结算阶段，计算奖励
    if (hidingState.phase === 'final') {
      this.calculateHidingRewards(room.id, state);
    }

    // 如果进入结束剧情阶段，发送结束剧情
    if (hidingState.phase === 'ending') {
      this.io.to(room.id).emit('hiding:endingStory', (level2Config as any).endingStory);
    }

    this.io.to(room.id).emit('hiding:stateUpdate', this.serializeHidingState(hidingState, state.players));

    // 检查是否需要进入海龟汤关卡
    if ((hidingState as any).levelComplete) {
      this.initializeTurtleSoup(room.id, state);
    }
  }

  /**
   * 处理选择藏匿区域
   */
  private handleHidingSelectArea(socket: Socket, areaId: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const hidingManager = this.hidingManagers.get(room.id);
    if (!hidingManager) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    const result = hidingManager.selectArea(playerId, areaId);
    if (!result.success) {
      socket.emit('hiding:error', result.message);
      return;
    }

    const hidingState = hidingManager.getState();
    if (hidingState) {
      this.io.to(room.id).emit('hiding:stateUpdate', this.serializeHidingState(hidingState, state.players));
    }
  }

  /**
   * 处理确认选择
   */
  private handleHidingConfirmSelection(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const hidingManager = this.hidingManagers.get(room.id);
    if (!hidingManager) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    const result = hidingManager.confirmSelection(playerId);
    if (!result.success) {
      socket.emit('hiding:error', result.message);
      return;
    }

    const hidingState = hidingManager.getState();
    if (hidingState) {
      this.io.to(room.id).emit('hiding:stateUpdate', this.serializeHidingState(hidingState, state.players));

      // 检查是否所有玩家都已确认
      if (hidingManager.allPlayersConfirmed()) {
        this.stopSelectionTimer(room.id);
        // 进入攻击阶段
        hidingManager.nextPhase();
        this.executeHidingAttack(room.id, state);
      }
    }
  }

  /**
   * 启动选择阶段倒计时
   */
  private startSelectionTimer(roomId: string, state: any): void {
    this.stopSelectionTimer(roomId);

    const hidingManager = this.hidingManagers.get(roomId);
    if (!hidingManager) return;

    const timer = setInterval(() => {
      const timeLeft = hidingManager.decreaseSelectionTime();
      
      const hidingState = hidingManager.getState();
      if (hidingState) {
        this.io.to(roomId).emit('hiding:timerUpdate', timeLeft);
      }

      if (timeLeft <= 0) {
        this.stopSelectionTimer(roomId);
        // 为未选择的玩家随机分配
        const assignedPlayers = hidingManager.assignRandomAreas();
        if (assignedPlayers.length > 0) {
          const hidingState = hidingManager.getState();
          if (hidingState) {
            this.io.to(roomId).emit('hiding:stateUpdate', this.serializeHidingState(hidingState, state.players));
          }
        }
        // 进入攻击阶段
        hidingManager.nextPhase();
        this.executeHidingAttack(roomId, state);
      }
    }, 1000);

    this.hidingTimers.set(roomId, timer);
  }

  /**
   * 停止选择阶段倒计时
   */
  private stopSelectionTimer(roomId: string): void {
    const timer = this.hidingTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.hidingTimers.delete(roomId);
    }
  }

  /**
   * 执行藏匿攻击
   */
  private executeHidingAttack(roomId: string, state: any): void {
    const hidingManager = this.hidingManagers.get(roomId);
    if (!hidingManager) return;

    const attackResult = hidingManager.executeAttack();
    if (!attackResult) return;

    // 更新玩家生命值
    attackResult.hitPlayers.forEach(playerId => {
      const player = state.players.find((p: any) => p.id === playerId);
      if (player) {
        player.health -= 1;
        // 检查死亡（无保护机制）
        if (player.health <= 0) {
          player.isIncapacitated = true;
        }
      }
    });

    // 获取区域配置
    const areaConfig = (level2Config as any).areas.find((a: any) => a.id === attackResult.attackedArea.id);

    // 发送攻击结果
    this.io.to(roomId).emit('hiding:attackResult', {
      attackedAreaId: attackResult.attackedArea.id,
      attackedAreaName: attackResult.attackedArea.name,
      hitPlayers: attackResult.hitPlayers,
      attackText: areaConfig?.attackText || '区域被摧毁了！'
    });

    // 更新状态
    const hidingState = hidingManager.getState();
    if (hidingState) {
      // 进入结果阶段
      hidingManager.nextPhase();
      this.io.to(roomId).emit('hiding:stateUpdate', this.serializeHidingState(hidingState, state.players));
      this.io.to(roomId).emit('game:stateUpdate', this.sanitizeState(state));
    }
  }

  /**
   * 计算藏匿关卡奖励
   */
  private calculateHidingRewards(roomId: string, state: any): void {
    const hidingManager = this.hidingManagers.get(roomId);
    if (!hidingManager) return;

    const rewards = hidingManager.calculateFinalRewards();
    
    rewards.forEach((bonus, playerId) => {
      const player = state.players.find((p: any) => p.id === playerId);
      if (player) {
        player.health += bonus;
      }
    });

    this.io.to(roomId).emit('game:stateUpdate', this.sanitizeState(state));
  }

  /**
   * 序列化藏匿状态
   */
  private serializeHidingState(hidingState: any, players: any[]): any {
    const playerSelections: Record<string, string | null> = {};
    const playerConfirmed: Record<string, boolean> = {};
    const playerHitCounts: Record<string, number> = {};

    hidingState.playerSelections.forEach((value: string | null, key: string) => {
      playerSelections[key] = value;
    });

    hidingState.playerConfirmed.forEach((value: boolean, key: string) => {
      playerConfirmed[key] = value;
    });

    hidingState.playerHitCounts.forEach((value: number, key: string) => {
      playerHitCounts[key] = value;
    });

    return {
      currentRound: hidingState.currentRound,
      maxRounds: hidingState.maxRounds,
      phase: hidingState.phase,
      areas: hidingState.areas,
      destroyedAreas: hidingState.destroyedAreas,
      playerSelections,
      playerConfirmed,
      playerHitCounts,
      selectionTimeLeft: hidingState.selectionTimeLeft,
      lastAttackedArea: hidingState.lastAttackedArea,
      hitPlayersThisRound: hidingState.hitPlayersThisRound,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        health: p.health
      }))
    };
  }

  // ==================== 第三幕 - 个人剧情 ====================

  /**
   * 初始化第三幕
   */
  private initializeLevel3(roomId: string, state: any): void {
    const storyManager = new StoryManager();
    const players = state.players.map((p: any) => ({ id: p.id, characterType: p.characterType }));
    
    const storyState = storyManager.initialize(players);
    
    this.storyManagers.set(roomId, storyManager);

    // 设置开场剧情
    storyManager.setStoryTexts((level3CatConfig as any).openingStory);

    this.io.to(roomId).emit('game:levelChange', { levelId: 'level3', levelName: '个人剧情' });
    this.io.to(roomId).emit('story:stateUpdate', storyManager.serializeState());
    console.log(`房间 ${roomId} 进入第三幕：个人剧情`);
  }

  private handleStoryNextStory(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;
    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;
    const storyManager = this.storyManagers.get(room.id);
    if (!storyManager) return;

    storyManager.nextStory();
    this.io.to(room.id).emit('story:stateUpdate', storyManager.serializeState());
  }

  private handleStoryNextPhase(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;
    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;
    const storyManager = this.storyManagers.get(room.id);
    if (!storyManager) return;
    const state = this.stateManager.getState(room.id);
    if (!state) return;

    const storyState = storyManager.getState();
    if (!storyState) return;

    switch (storyState.phase) {
      case 'intro':
        storyManager.setPhase('turn_intro');
        storyManager.setStoryTexts((level3CatConfig as any).turnIntro.content);
        break;
      case 'turn_intro':
        storyManager.setPhase('branch_select');
        break;
      case 'branch_select':
        // 等待选择分支
        break;
      case 'branch_story':
        storyManager.setPhase('choice');
        this.loadCurrentChoice(storyManager);
        break;
      case 'choice':
        // 等待选择
        break;
      case 'choice_result':
        // 应用生命值奖励
        const currentPlayer = storyManager.getCurrentPlayer();
        if (currentPlayer && storyState.selectedOption && storyState.currentChoice) {
          const option = storyState.currentChoice.options[storyState.selectedOption];
          if (option?.reward?.healthBonus) {
            const player = state.players.find((p: any) => p.id === currentPlayer.playerId);
            if (player) player.health += option.reward.healthBonus;
            this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
          }
        }
        if (storyManager.nextChoice()) {
          storyManager.setPhase('choice');
          this.loadCurrentChoice(storyManager);
        } else {
          storyManager.setPhase('ending');
          const player = storyManager.getCurrentPlayer();
          const characterConfig = this.getCharacterConfig(player?.characterType || 'cat');
          const branch = characterConfig.branches[player?.branch || 'A'];
          storyManager.setStoryTexts(branch.endingStory);
        }
        break;
      case 'ending':
        storyManager.setPhase('summary');
        break;
      case 'summary':
        if (storyManager.nextPlayer()) {
          storyManager.setPhase('branch_select');
        } else {
          // 所有玩家完成，进入BOSS战
          console.log('所有玩家完成个人剧情，进入BOSS战');
          this.io.to(room.id).emit('story:stateUpdate', storyManager.serializeState());
          // 延迟进入BOSS战，让玩家看到最后的总结
          setTimeout(() => {
            this.initializeBoss1(room.id, state);
          }, 1000);
          return;
        }
        break;
    }
    this.io.to(room.id).emit('story:stateUpdate', storyManager.serializeState());
  }

  private handleStorySelectBranch(socket: Socket, branch: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;
    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;
    const storyManager = this.storyManagers.get(room.id);
    if (!storyManager) return;

    const currentPlayer = storyManager.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.playerId !== playerId) return;

    // 获取当前角色的配置
    const characterConfig = this.getCharacterConfig(currentPlayer.characterType);
    
    // 检查分支是否被禁用（狗狗的C选项）
    const branchConfig = characterConfig.branches[branch];
    if (branchConfig?.disabled) {
      socket.emit('story:error', branchConfig.disabledMessage || '该选项不可选');
      return;
    }

    storyManager.selectBranch(branch as 'A' | 'B' | 'C');
    storyManager.setPhase('branch_story');
    storyManager.setStoryTexts(branchConfig.triggerStory);
    this.io.to(room.id).emit('story:stateUpdate', storyManager.serializeState());
  }

  private handleStoryMakeChoice(socket: Socket, option: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;
    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;
    const storyManager = this.storyManagers.get(room.id);
    if (!storyManager) return;

    const currentPlayer = storyManager.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.playerId !== playerId) return;

    const storyState = storyManager.getState();
    if (!storyState || !storyState.currentChoice) return;

    // 检查前置技能要求
    const selectedOption = storyState.currentChoice.options[option] as any;
    if (selectedOption?.requires) {
      const hasRequiredSkill = currentPlayer.skills.some(s => s.id === selectedOption.requires);
      if (!hasRequiredSkill) {
        socket.emit('story:error', selectedOption.requiresMessage || '你缺少必要的前置技能');
        return;
      }
    }

    storyManager.makeChoice(option);
    storyManager.setPhase('choice_result');
    this.io.to(room.id).emit('story:stateUpdate', storyManager.serializeState());
  }

  private getCharacterConfig(characterType: string): any {
    switch (characterType) {
      case 'cat': return level3CatConfig;
      case 'dog': return level3DogConfig;
      case 'turtle': return level3TurtleConfig;
      default: return level3CatConfig;
    }
  }

  private getChoicesConfig(characterType: string, branch: string): any {
    if (characterType === 'cat') {
      switch (branch) {
        case 'A': return (level3CatChoicesKungfu as any).kungfu;
        case 'B': return level3CatChoicesBusiness;
        case 'C': return level3CatChoicesRobot;
      }
    } else if (characterType === 'dog') {
      switch (branch) {
        case 'A': return level3DogCelestial;
        case 'B': return level3DogTransformer;
      }
    } else if (characterType === 'turtle') {
      switch (branch) {
        case 'A': return level3TurtleNinja;
        case 'B': return level3TurtleBlastoise;
        case 'C': return level3TurtleGolden;
      }
    }
    return null;
  }

  private loadCurrentChoice(storyManager: StoryManager): void {
    const player = storyManager.getCurrentPlayer();
    if (!player) return;
    const choiceIndex = player.currentChoiceIndex;
    const choiceKey = `choice${choiceIndex + 1}`;
    
    const choicesConfig = this.getChoicesConfig(player.characterType, player.branch || 'A');
    if (!choicesConfig) return;

    const choice = choicesConfig[choiceKey];
    if (choice) storyManager.setCurrentChoice(choice);
  }

  // ==================== 调试功能 ====================

  /**
   * 调试：直接跳到第三关
   */
  private handleDebugSkipToLevel3(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    console.log(`[DEBUG] 房间 ${room.code} 跳转到第三关`);
    this.initializeLevel3(room.id, state);
  }

  /**
   * 调试：直接跳到海龟汤
   */
  private handleDebugSkipToSoup(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    console.log(`[DEBUG] 房间 ${room.code} 跳转到海龟汤`);
    this.initializeTurtleSoup(room.id, state);
  }

  /**
   * 调试：直接跳到BOSS战
   */
  private handleDebugSkipToBoss1(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    console.log(`[DEBUG] 房间 ${room.code} 跳转到BOSS战`);
    this.initializeBoss1(room.id, state);
  }

  // ==================== BOSS战 - 鼠鼠大王 ====================

  /**
   * 初始化鼠鼠大王BOSS战
   */
  private initializeBoss1(roomId: string, state: any): void {
    const mouseKingManager = new MouseKingManager();
    
    // 从 StoryManager 获取玩家技能信息
    const storyManager = this.storyManagers.get(roomId);
    const playerInfos: PlayerSkillInfo[] = state.players.map((p: any) => {
      const storyPlayer = storyManager?.getPlayerByCharacterType(p.characterType);
      return {
        playerId: p.id,
        characterType: p.characterType,
        skills: storyPlayer?.skills || [],
        items: storyPlayer?.items || []
      };
    });

    const bossState = mouseKingManager.initialize(playerInfos);
    this.mouseKingManagers.set(roomId, mouseKingManager);

    // 检查是否跳过战斗
    const skipCheck = mouseKingManager.checkSkipBattle();
    if (skipCheck?.skip) {
      this.io.to(roomId).emit('boss:skip', {
        bossId: 'mouse_king',
        reason: skipCheck.reason
      });
      // TODO: 进入下一关
      return;
    }

    // 发送BOSS战开始事件
    this.io.to(roomId).emit('game:levelChange', {
      levelId: 'boss1',
      levelName: '鼠鼠大王',
      openingStory: (boss1MouseKingConfig as any).openingStory
    });

    this.io.to(roomId).emit('boss:stateUpdate', mouseKingManager.serializeState());
    console.log(`房间 ${roomId} 进入BOSS战：鼠鼠大王`);
  }

  /**
   * 处理BOSS战下一段剧情
   */
  private handleBossNextStory(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    this.io.to(room.id).emit('boss:nextStory');
  }

  /**
   * 处理开始战斗
   */
  private handleBossStartBattle(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const mouseKingManager = this.mouseKingManagers.get(room.id);
    if (!mouseKingManager) return;

    mouseKingManager.startBattle();
    
    this.io.to(room.id).emit('boss:battleStart', {
      text: (boss1MouseKingConfig as any).battleStartText
    });
    this.io.to(room.id).emit('boss:stateUpdate', mouseKingManager.serializeState());
  }

  /**
   * 处理选择出战玩家
   */
  private handleBossSelectFighter(socket: Socket, fighterId: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const mouseKingManager = this.mouseKingManagers.get(room.id);
    if (!mouseKingManager) return;

    const result = mouseKingManager.selectFighter(fighterId);
    if (!result.success) {
      socket.emit('boss:error', result.message);
      return;
    }

    this.io.to(room.id).emit('boss:fighterSelected', {
      playerId: fighterId,
      message: result.message,
      excludedHoles: mouseKingManager.getExcludedHolesInfo()
    });
    this.io.to(room.id).emit('boss:stateUpdate', mouseKingManager.serializeState());
  }

  /**
   * 处理攻击洞口
   */
  private handleBossAttackHole(socket: Socket, holeIndex: number): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const mouseKingManager = this.mouseKingManagers.get(room.id);
    if (!mouseKingManager) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    // 验证是否是当前出战玩家
    const bossState = mouseKingManager.getState();
    if (!bossState || bossState.currentPlayerId !== playerId) {
      socket.emit('boss:error', '不是你的回合');
      return;
    }

    const result = mouseKingManager.attackHole(holeIndex);
    
    // 获取洞口配置文本
    const holeConfig = (boss1MouseKingConfig as any).holes[result.content];
    
    this.io.to(room.id).emit('boss:attackResult', {
      ...result,
      hitText: holeConfig?.hitText || result.message
    });

    // 同步玩家生命值到游戏状态
    const updatedBossState = mouseKingManager.getState();
    if (updatedBossState) {
      updatedBossState.players.forEach(bp => {
        const gamePlayer = state.players.find((p: any) => p.id === bp.playerId);
        if (gamePlayer) {
          gamePlayer.health = bp.health;
          gamePlayer.isIncapacitated = !bp.isAlive;
        }
      });
    }

    this.io.to(room.id).emit('boss:stateUpdate', mouseKingManager.serializeState());
    this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));

    // 检查战斗结束
    if (updatedBossState?.isComplete) {
      if (updatedBossState.result === 'win') {
        this.io.to(room.id).emit('boss:victory', {
          text: (boss1MouseKingConfig as any).victoryText
        });
        // 胜利后进入下一关（百变小鹦）
        setTimeout(() => {
          this.initializeBoss2(room.id, state);
        }, 3000);
      } else {
        // 失败 -> 结局0：死于鼠鼠大王
        this.io.to(room.id).emit('boss:defeat', {
          text: (boss1MouseKingConfig as any).defeatText,
          ending: updatedBossState.ending
        });
        this.io.to(room.id).emit('game:ending', { endingId: 'ending_0' });
      }
    }
  }

  /**
   * 处理下一回合
   */
  private handleBossNextRound(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const mouseKingManager = this.mouseKingManagers.get(room.id);
    if (!mouseKingManager) return;

    const bossState = mouseKingManager.getState();
    
    // 如果战斗已结束，不进入下一回合
    if (bossState?.isComplete) {
      this.io.to(room.id).emit('boss:stateUpdate', mouseKingManager.serializeState());
      return;
    }

    mouseKingManager.nextRound();
    this.io.to(room.id).emit('boss:stateUpdate', mouseKingManager.serializeState());
  }

  // ==================== BOSS战 - 百变小鹦 ====================

  /**
   * 调试：直接跳到百变小鹦BOSS战
   */
  private handleDebugSkipToBoss2(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    console.log(`[DEBUG] 房间 ${room.code} 跳转到百变小鹦BOSS战`);
    this.initializeBoss2(room.id, state);
  }

  /**
   * 初始化百变小鹦BOSS战
   */
  private initializeBoss2(roomId: string, state: any): void {
    const parrotManager = new ParrotManager();
    
    const storyManager = this.storyManagers.get(roomId);
    const playerInfos: PlayerSkillInfo[] = state.players.map((p: any) => {
      const storyPlayer = storyManager?.getPlayerByCharacterType(p.characterType);
      return {
        playerId: p.id,
        characterType: p.characterType,
        skills: storyPlayer?.skills || [],
        items: storyPlayer?.items || []
      };
    });

    const parrotState = parrotManager.initialize(playerInfos, (boss2ParrotConfig as any).questions);
    this.parrotManagers.set(roomId, parrotManager);

    // 检查是否跳过战斗
    const skipCheck = parrotManager.checkSkipBattle();
    if (skipCheck?.skip) {
      this.io.to(roomId).emit('parrot:skip', {
        bossId: 'parrot',
        reason: skipCheck.reason
      });
      return;
    }

    this.io.to(roomId).emit('game:levelChange', {
      levelId: 'boss2',
      levelName: '百变小鹦',
      openingStory: (boss2ParrotConfig as any).openingStory
    });

    this.io.to(roomId).emit('parrot:stateUpdate', parrotManager.serializeState());
    console.log(`房间 ${roomId} 进入BOSS战：百变小鹦`);
  }

  /**
   * 处理百变小鹦开始战斗
   */
  private handleParrotStartBattle(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const parrotManager = this.parrotManagers.get(room.id);
    if (!parrotManager) return;

    parrotManager.startBattle();
    this.io.to(room.id).emit('parrot:stateUpdate', parrotManager.serializeState());

    // 禁用聊天 - 默契考验
    this.setChatStatus(room.id, false, '默契考验中，请独立作答');
  }

  /**
   * 处理玩家提交答案
   */
  private handleParrotSubmitAnswer(socket: Socket, answer: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const parrotManager = this.parrotManagers.get(room.id);
    if (!parrotManager) return;

    const result = parrotManager.submitAnswer(playerId, answer);
    if (!result.success) {
      socket.emit('parrot:error', result.message);
      return;
    }

    // 通知所有玩家有人提交了答案
    this.io.to(room.id).emit('parrot:stateUpdate', parrotManager.serializeState());

    // 检查是否所有玩家都已答题
    if (parrotManager.allPlayersAnswered()) {
      // 揭示答案并结算
      const roundResult = parrotManager.revealAndSettle();
      this.io.to(room.id).emit('parrot:roundResult', roundResult);
      this.io.to(room.id).emit('parrot:stateUpdate', parrotManager.serializeState());

      // 同步玩家生命值到游戏状态
      const state = this.stateManager.getState(room.id);
      const parrotState = parrotManager.getState();
      if (state && parrotState) {
        parrotState.players.forEach(bp => {
          const gamePlayer = state.players.find((p: any) => p.id === bp.playerId);
          if (gamePlayer) {
            gamePlayer.health = bp.health;
            gamePlayer.isIncapacitated = !bp.isAlive;
          }
        });
        this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
      }

      // 检查战斗结束
      if (parrotState?.isComplete) {
        // 恢复聊天
        this.setChatStatus(room.id, true);
        
        if (parrotState.result === 'win') {
          this.io.to(room.id).emit('parrot:victory', {
            text: (boss2ParrotConfig as any).victoryText
          });
          // 胜利后进入下一关（死神）
          setTimeout(() => {
            this.initializeBoss3(room.id, state);
          }, 3000);
        } else {
          // 失败 -> 结局1：疯人院
          this.io.to(room.id).emit('parrot:defeat', {
            text: (boss2ParrotConfig as any).defeatText,
            ending: parrotState.ending
          });
          this.io.to(room.id).emit('game:ending', { endingId: 'ending_1' });
        }
      }
    }
  }

  /**
   * 处理百变小鹦下一回合
   */
  private handleParrotNextRound(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const parrotManager = this.parrotManagers.get(room.id);
    if (!parrotManager) return;

    const parrotState = parrotManager.getState();
    if (parrotState?.isComplete) {
      this.io.to(room.id).emit('parrot:stateUpdate', parrotManager.serializeState());
      return;
    }

    parrotManager.nextRound();
    this.io.to(room.id).emit('parrot:stateUpdate', parrotManager.serializeState());
  }

  // ==================== BOSS战 - 死神 ====================

  /**
   * 调试：直接跳到死神BOSS战
   */
  private handleDebugSkipToBoss3(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    console.log(`[DEBUG] 房间 ${room.code} 跳转到死神BOSS战`);
    this.initializeBoss3(room.id, state);
  }

  /**
   * 初始化死神BOSS战
   */
  private initializeBoss3(roomId: string, state: any): void {
    const deathManager = new DeathManager();
    
    const storyManager = this.storyManagers.get(roomId);
    const playerInfos: PlayerSkillInfo[] = state.players.map((p: any) => {
      const storyPlayer = storyManager?.getPlayerByCharacterType(p.characterType);
      return {
        playerId: p.id,
        characterType: p.characterType,
        skills: storyPlayer?.skills || [],
        items: storyPlayer?.items || []
      };
    });

    const deathState = deathManager.initialize(playerInfos, boss3DeathConfig);
    this.deathManagers.set(roomId, deathManager);

    // 检查是否跳过战斗
    const skipCheck = deathManager.checkSkipBattle();
    if (skipCheck?.skip) {
      this.io.to(roomId).emit('death:skip', {
        bossId: 'death',
        reason: skipCheck.reason
      });
      return;
    }

    this.io.to(roomId).emit('game:levelChange', {
      levelId: 'boss3',
      levelName: '死神',
      openingStory: (boss3DeathConfig as any).openingStory
    });

    this.io.to(roomId).emit('death:stateUpdate', deathManager.serializeState());
    console.log(`房间 ${roomId} 进入BOSS战：死神`);
  }

  /**
   * 处理死神开始战斗
   */
  private handleDeathStartBattle(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const deathManager = this.deathManagers.get(room.id);
    if (!deathManager) return;

    deathManager.startBattle();
    this.io.to(room.id).emit('death:stateUpdate', deathManager.serializeState());
  }

  /**
   * 处理设置下注金额
   */
  private handleDeathSetBet(socket: Socket, amount: number): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const deathManager = this.deathManagers.get(room.id);
    if (!deathManager) return;

    const result = deathManager.setBet(amount);
    if (!result.success) {
      socket.emit('death:error', result.message);
      return;
    }

    this.io.to(room.id).emit('death:stateUpdate', deathManager.serializeState());
  }

  /**
   * 处理设置选择
   */
  private handleDeathSetChoice(socket: Socket, choice: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const deathManager = this.deathManagers.get(room.id);
    if (!deathManager) return;

    const result = deathManager.setChoice(choice);
    if (!result.success) {
      socket.emit('death:error', result.message);
      return;
    }

    this.io.to(room.id).emit('death:stateUpdate', deathManager.serializeState());
  }

  /**
   * 处理确认下注
   */
  private handleDeathConfirmBet(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const deathManager = this.deathManagers.get(room.id);
    if (!deathManager) return;

    const result = deathManager.confirmBet();
    if (!result.success) {
      socket.emit('death:error', result.message);
      return;
    }

    this.io.to(room.id).emit('death:stateUpdate', deathManager.serializeState());
  }

  /**
   * 处理投掷骰子
   */
  private handleDeathRoll(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const deathManager = this.deathManagers.get(room.id);
    if (!deathManager) return;

    const roundResult = deathManager.executeRoll();
    this.io.to(room.id).emit('death:roundResult', roundResult);
    this.io.to(room.id).emit('death:stateUpdate', deathManager.serializeState());

    // 检查战斗结束 - 胜利时立即触发结局，失败时等待用户点击"查看结局"
    const deathState = deathManager.getState();
    if (deathState?.isComplete && deathState.result === 'win') {
      // 胜利 -> 结局1：疯人院
      this.io.to(room.id).emit('death:victory', {
        text: (boss3DeathConfig as any).victoryText
      });
      this.io.to(room.id).emit('game:ending', { endingId: 'ending_1' });
    }
    // 失败时不立即触发结局，等待用户点击"查看结局"按钮
  }

  /**
   * 处理死神下一回合
   */
  private handleDeathNextRound(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const deathManager = this.deathManagers.get(room.id);
    if (!deathManager) return;

    const deathState = deathManager.getState();
    
    // 如果已经完成且失败，触发结局
    if (deathState?.isComplete && deathState.result === 'lose') {
      this.io.to(room.id).emit('death:defeat', {
        text: (boss3DeathConfig as any).defeatText,
        ending: deathState.ending
      });
      this.io.to(room.id).emit('game:ending', { endingId: 'ending_2' });
      return;
    }
    
    // 如果已经完成但不是失败（胜利已在roll时处理），直接返回
    if (deathState?.isComplete) {
      this.io.to(room.id).emit('death:stateUpdate', deathManager.serializeState());
      return;
    }

    deathManager.nextRound();
    this.io.to(room.id).emit('death:stateUpdate', deathManager.serializeState());
  }

  // ==================== 海龟汤关卡 ====================

  /**
   * 初始化海龟汤关卡
   */
  private initializeTurtleSoup(roomId: string, state: any): void {
    const soupManager = new TurtleSoupManager();
    const playerIds = state.players.map((p: any) => p.id);
    
    const soupState = soupManager.initialize(turtleSoupConfig as TurtleSoupConfig, playerIds);
    this.turtleSoupManagers.set(roomId, soupManager);

    this.io.to(roomId).emit('game:levelChange', {
      levelId: 'turtle-soup',
      levelName: '海龟汤（记忆回溯）'
    });

    this.io.to(roomId).emit('soup:stateUpdate', soupManager.serializeState());
    console.log(`房间 ${roomId} 进入海龟汤关卡`);
  }

  /**
   * 处理海龟汤下一段剧情
   */
  private handleSoupNextStory(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const soupManager = this.turtleSoupManagers.get(room.id);
    if (!soupManager) return;

    soupManager.nextStory();
    this.io.to(room.id).emit('soup:stateUpdate', soupManager.serializeState());
  }

  /**
   * 处理海龟汤下一阶段
   */
  /**
   * 处理海龟汤返回提问阶段
   */
  private handleSoupGoBack(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const soupManager = this.turtleSoupManagers.get(room.id);
    if (!soupManager) return;

    // 返回提问阶段
    soupManager.setPhase('questioning');
    this.io.to(room.id).emit('soup:stateUpdate', soupManager.serializeState());
  }

  private handleSoupNextPhase(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const soupManager = this.turtleSoupManagers.get(room.id);
    if (!soupManager) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    const soupState = soupManager.nextPhase();
    if (!soupState) return;

    // 如果完成海龟汤，进入第三幕
    if (soupState.phase === 'complete') {
      // 应用生命值变化
      const healthChanges = soupManager.getHealthChanges();
      healthChanges.forEach((change, pId) => {
        const player = state.players.find((p: any) => p.id === pId);
        if (player) {
          player.health += change;
          if (player.health < 1) player.health = 1; // 保护机制
        }
      });

      // 揭示角色身份
      state.players.forEach((p: any) => {
        p.characterRevealed = true;
      });

      this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
      this.initializeLevel3(room.id, state);
      return;
    }

    this.io.to(room.id).emit('soup:stateUpdate', soupManager.serializeState());
  }

  /**
   * 处理海龟汤提问
   */
  private handleSoupAskQuestion(socket: Socket, keywordId: string, questionId: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const soupManager = this.turtleSoupManagers.get(room.id);
    if (!soupManager) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    const result = soupManager.askQuestion(playerId, keywordId, questionId);
    
    if (result.success) {
      // 如果消耗了生命值
      if (result.healthCost && result.healthCost > 0) {
        const player = state.players.find((p: any) => p.id === playerId);
        if (player) {
          player.health -= result.healthCost;
          if (player.health < 1) player.health = 1;
        }
        this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
      }

      this.io.to(room.id).emit('soup:questionResult', {
        success: true,
        keywordId,
        questionId,
        answer: result.answer,
        askedBy: playerId,
        healthCost: result.healthCost
      });
    } else {
      socket.emit('soup:error', result.message);
    }

    this.io.to(room.id).emit('soup:stateUpdate', soupManager.serializeState());
  }

  /**
   * 处理海龟汤提交死亡人数答案
   */
  private handleSoupSubmitDeathCount(socket: Socket, answer: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const soupManager = this.turtleSoupManagers.get(room.id);
    if (!soupManager) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    const result = soupManager.submitDeathCount(answer);
    
    if (!result.correct) {
      // 扣血
      state.players.forEach((p: any) => {
        p.health -= result.penalty;
        if (p.health < 1) p.health = 1;
      });
      this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
    }

    this.io.to(room.id).emit('soup:answerResult', {
      question: 'deathCount',
      correct: result.correct,
      penalty: result.penalty
    });

    // 进入下一个问题
    soupManager.nextPhase();
    this.io.to(room.id).emit('soup:stateUpdate', soupManager.serializeState());
  }

  /**
   * 处理海龟汤提交是否人类答案
   */
  private handleSoupSubmitIsHuman(socket: Socket, answer: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const soupManager = this.turtleSoupManagers.get(room.id);
    if (!soupManager) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    const result = soupManager.submitIsHuman(answer);
    
    if (!result.correct) {
      state.players.forEach((p: any) => {
        p.health -= result.penalty;
        if (p.health < 1) p.health = 1;
      });
      this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));
    }

    this.io.to(room.id).emit('soup:answerResult', {
      question: 'isHuman',
      correct: result.correct,
      penalty: result.penalty
    });

    soupManager.nextPhase();
    this.io.to(room.id).emit('soup:stateUpdate', soupManager.serializeState());
  }

  /**
   * 处理海龟汤提交身份选择
   */
  private handleSoupSubmitIdentity(socket: Socket, animalId: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const soupManager = this.turtleSoupManagers.get(room.id);
    if (!soupManager) return;

    soupManager.submitIdentity(playerId, animalId);
    this.io.to(room.id).emit('soup:stateUpdate', soupManager.serializeState());
  }

  /**
   * 处理海龟汤确认所有身份选择
   */
  private handleSoupConfirmIdentities(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    const soupManager = this.turtleSoupManagers.get(room.id);
    if (!soupManager) return;

    const state = this.stateManager.getState(room.id);
    if (!state) return;

    if (!soupManager.allIdentitiesSubmitted()) {
      socket.emit('soup:error', '还有玩家未选择身份');
      return;
    }

    // 构建玩家角色映射
    const playerCharacterMap = new Map<string, string>();
    state.players.forEach((p: any) => {
      playerCharacterMap.set(p.id, p.characterType);
    });

    // 判定身份选择
    const results = soupManager.judgeIdentities(playerCharacterMap);
    
    // 应用惩罚
    results.forEach((correct, pId) => {
      if (!correct) {
        const player = state.players.find((p: any) => p.id === pId);
        if (player) {
          player.health -= 1;
          if (player.health < 1) player.health = 1;
        }
      }
    });

    this.io.to(room.id).emit('game:stateUpdate', this.sanitizeState(state));

    const identityResults: Record<string, boolean> = {};
    results.forEach((v, k) => {
      identityResults[k] = v;
    });

    this.io.to(room.id).emit('soup:identityResults', {
      results: identityResults
    });

    // 进入揭示阶段
    soupManager.nextPhase();
    this.io.to(room.id).emit('soup:stateUpdate', soupManager.serializeState());
  }

  // ==================== 聊天室 ====================

  /**
   * 处理聊天消息发送
   */
  private handleChatSend(socket: Socket, content: string): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const room = this.roomManager.getPlayerRoom(playerId);
    if (!room) return;

    // 检查聊天是否启用
    const enabled = this.chatEnabled.get(room.id) ?? true;
    if (!enabled) {
      socket.emit('chat:error', { message: '当前阶段禁止聊天' });
      return;
    }

    // 内容校验
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) return;
    if (trimmedContent.length > 200) {
      socket.emit('chat:error', { message: '消息过长' });
      return;
    }

    // 过滤HTML标签
    const filteredContent = trimmedContent.replace(/<[^>]*>/g, '');

    // 获取玩家信息
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    // 获取玩家角色类型（从游戏状态中）
    const state = this.stateManager.getState(room.id);
    const gamePlayer = state?.players.find((p: any) => p.id === playerId);
    const characterType = gamePlayer?.characterType;

    // 构造消息对象
    const message = {
      id: uuidv4(),
      senderId: playerId,
      senderName: player.customName || player.name,
      senderCharacterType: characterType,
      content: filteredContent,
      timestamp: Date.now(),
      type: 'chat' as const
    };

    // 广播给房间内所有玩家
    this.io.to(room.id).emit('chat:message', message);

    // 保存到历史
    let history = this.chatHistory.get(room.id);
    if (!history) {
      history = [];
      this.chatHistory.set(room.id, history);
    }
    history.push(message);
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * 发送系统消息（带防抖，避免短时间内重复发送相同消息）
   */
  private sendSystemMessage(roomId: string, content: string, debounceMs: number = 3000): void {
    // 检查是否在短时间内发送过相同内容的消息
    const lastMsg = this.lastSystemMessage.get(roomId);
    const now = Date.now();
    
    // 如果是连接相关的消息（掉线/重连），使用更长的防抖时间
    const isConnectionMessage = content.includes('已掉线') || content.includes('已重新连接');
    const actualDebounceMs = isConnectionMessage ? 5000 : debounceMs;
    
    if (lastMsg && lastMsg.content === content && (now - lastMsg.timestamp) < actualDebounceMs) {
      // 跳过重复消息
      return;
    }
    
    // 更新最后发送的消息
    this.lastSystemMessage.set(roomId, { content, timestamp: now });
    
    const message = {
      id: uuidv4(),
      senderId: 'system',
      senderName: '小助手',
      content,
      timestamp: now,
      type: 'system' as const
    };

    this.io.to(roomId).emit('chat:message', message);

    // 保存到历史
    let history = this.chatHistory.get(roomId);
    if (!history) {
      history = [];
      this.chatHistory.set(roomId, history);
    }
    history.push(message);
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * 设置聊天状态
   */
  private setChatStatus(roomId: string, enabled: boolean, reason?: string): void {
    this.chatEnabled.set(roomId, enabled);
    this.io.to(roomId).emit('chat:status', { enabled, reason });
    
    if (!enabled) {
      this.sendSystemMessage(roomId, '🔇 聊天已禁用 - ' + (reason || ''));
    } else {
      this.sendSystemMessage(roomId, '💬 聊天已恢复！');
    }
  }
}
