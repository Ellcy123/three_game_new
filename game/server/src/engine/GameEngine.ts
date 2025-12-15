import { GameState, KeywordCombination, EventResult } from '../../../shared/src/types/game';
import { LevelConfig } from '../../../shared/src/types/events';
import { Player } from '../../../shared/src/types/player';
import { KeywordParser } from './KeywordParser';
import { EventSystem } from './EventSystem';
import { StateManager } from './StateManager';
import { TurnManager } from './TurnManager';
import { HealthManager } from './HealthManager';
import { PasswordManager, PasswordResult } from './PasswordManager';
import { RoomManager } from './RoomManager';

/**
 * 游戏引擎
 * 整合所有子系统，提供统一的游戏逻辑接口
 */
export class GameEngine {
  private keywordParser: KeywordParser;
  private eventSystem: EventSystem;
  private stateManager: StateManager;
  private turnManager: TurnManager;
  private healthManager: HealthManager;
  private passwordManager: PasswordManager;
  private roomManager: RoomManager;

  constructor(synonymsConfig: any) {
    this.keywordParser = new KeywordParser(synonymsConfig);
    this.eventSystem = new EventSystem(this.keywordParser);
    this.stateManager = new StateManager();
    this.turnManager = new TurnManager();
    this.healthManager = new HealthManager();
    this.passwordManager = new PasswordManager();
    this.roomManager = new RoomManager();
  }

  /**
   * 加载关卡配置
   */
  loadLevelConfig(config: LevelConfig): void {
    this.eventSystem.loadLevelConfig(config);
  }

  /**
   * 创建房间
   */
  createRoom(hostPlayer: Omit<Player, 'isHost' | 'isReady'>) {
    return this.roomManager.createRoom(hostPlayer);
  }

  /**
   * 加入房间
   */
  joinRoom(roomCode: string, player: Omit<Player, 'isHost' | 'isReady'>) {
    return this.roomManager.joinRoom(roomCode, player);
  }

  /**
   * 离开房间
   */
  leaveRoom(playerId: string): void {
    this.roomManager.leaveRoom(playerId);
  }

  /**
   * 获取房间
   */
  getRoom(roomId: string) {
    return this.roomManager.getRoom(roomId);
  }

  /**
   * 获取玩家所在房间
   */
  getPlayerRoom(playerId: string) {
    return this.roomManager.getPlayerRoom(playerId);
  }

  /**
   * 选择角色
   */
  selectCharacter(playerId: string, characterIndex: number, customName?: string): boolean {
    return this.roomManager.selectCharacter(playerId, characterIndex, customName);
  }

  /**
   * 设置玩家准备状态
   */
  setPlayerReady(playerId: string, ready: boolean): boolean {
    return this.roomManager.setPlayerReady(playerId, ready);
  }

  /**
   * 检查是否可以开始游戏
   */
  canStartGame(roomId: string): boolean {
    return this.roomManager.canStartGame(roomId);
  }

  /**
   * 开始游戏
   */
  startGame(roomId: string): GameState | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room || !this.roomManager.startGame(roomId)) {
      return null;
    }
    return this.stateManager.initializeState(roomId, room.players);
  }

  /**
   * 获取游戏状态
   */
  getGameState(roomId: string): GameState | null {
    return this.stateManager.getState(roomId);
  }

  /**
   * 处理玩家行动
   */
  processAction(roomId: string, playerId: string, input: string): {
    result: EventResult;
    nextPlayerId?: string;
  } {
    const state = this.stateManager.getState(roomId);
    if (!state) {
      return {
        result: { success: false, storyText: '游戏状态不存在' }
      };
    }

    // 检查是否是当前玩家的回合
    const canAct = this.turnManager.canPlayerAct(state, playerId);
    if (!canAct.canAct) {
      return {
        result: { success: false, storyText: canAct.reason || '无法行动' }
      };
    }

    // 解析关键词
    const combination = this.keywordParser.parse(input);
    if (!combination) {
      return {
        result: { success: false, storyText: '请输入正确的格式，如：水潭+乌龟' }
      };
    }

    // 查找并执行事件
    const event = this.eventSystem.findEvent(combination, state.levelId);
    let result: EventResult;

    if (event) {
      result = this.eventSystem.execute(event, state, playerId);
    } else {
      result = this.eventSystem.handleNoMatch(combination);
    }

    // 替换玩家名称占位符
    result.storyText = this.replacePlaceholders(result.storyText, state);

    // 如果不需要密码或选择，推进回合
    let nextPlayerId: string | undefined;
    if (!result.requiresPassword && !result.requiresChoice && result.success) {
      nextPlayerId = this.turnManager.advanceTurn(state);
    }

    return { result, nextPlayerId };
  }

  /**
   * 处理密码输入
   */
  processPassword(roomId: string, password: string, type: 'suitcase' | 'door'): {
    result: PasswordResult;
    stateChanged: boolean;
  } {
    const state = this.stateManager.getState(roomId);
    if (!state) {
      return {
        result: { success: false, message: '游戏状态不存在' },
        stateChanged: false
      };
    }

    let result: PasswordResult;
    let stateChanged = false;

    if (type === 'suitcase') {
      result = this.passwordManager.verifySuitcasePassword(password, state);
      if (result.success && result.nextAction === 'free_cat') {
        const catPlayer = state.players.find(p => p.characterType === 'cat');
        if (catPlayer) {
          catPlayer.isTrapped = false;
          catPlayer.trappedLocation = undefined;
          state.triggeredEvents.push('evt_cat_rescued');
          stateChanged = true;
        }
      }
    } else {
      result = this.passwordManager.verifyDoorPassword(password, state);
      if (result.success && result.nextAction === 'level_complete') {
        state.levelId = 'level2';
        stateChanged = true;
      }
    }

    return { result, stateChanged };
  }

  /**
   * 处理选择
   */
  processChoice(roomId: string, choice: string): {
    storyText: string;
    nextPlayerId: string;
  } {
    const state = this.stateManager.getState(roomId);
    if (!state) {
      return { storyText: '游戏状态不存在', nextPlayerId: '' };
    }

    let storyText = '';

    if (choice === '按下按钮') {
      state.unlockedAreas.push('small_room');
      state.smallRoomUnlocked = true;
      state.triggeredEvents.push('evt_small_room_unlock');

      const dogPlayer = state.players.find(p => p.characterType === 'dog');
      storyText = `衣柜缓缓移开，后面居然有一个小房间！小房间里有一个巨大的囚笼，${dogPlayer?.name}被困在其中！房间内还有一个花瓶和一台电脑。墙上有一扇只能用四位密码触发打开的大门。`;
    } else {
      storyText = '你决定先不按这个按钮。';
    }

    const nextPlayerId = this.turnManager.advanceTurn(state);
    return { storyText, nextPlayerId };
  }

  /**
   * 处理复活
   */
  processRevive(roomId: string, reviverId: string, targetId: string) {
    const state = this.stateManager.getState(roomId);
    if (!state) {
      return { success: false, message: '游戏状态不存在' };
    }

    return this.healthManager.revive(state, reviverId, targetId);
  }

  /**
   * 替换剧情文本中的占位符
   */
  private replacePlaceholders(text: string, state: GameState): string {
    const catPlayer = state.players.find(p => p.characterType === 'cat');
    const dogPlayer = state.players.find(p => p.characterType === 'dog');
    const turtlePlayer = state.players.find(p => p.characterType === 'turtle');

    return text
      .replace(/{player1}/g, catPlayer?.name || '猫咪')
      .replace(/{player2}/g, dogPlayer?.name || '狗狗')
      .replace(/{player3}/g, turtlePlayer?.name || '乌龟');
  }

  /**
   * 清理状态（隐藏未揭示的角色类型）
   */
  sanitizeState(state: GameState): GameState {
    return {
      ...state,
      players: state.players.map(p => ({
        ...p,
        characterType: p.characterRevealed ? p.characterType : undefined as any
      }))
    };
  }

  /**
   * 检查关卡是否完成
   */
  isLevelComplete(roomId: string): boolean {
    const state = this.stateManager.getState(roomId);
    if (!state) return false;
    return state.levelId !== 'level1';
  }

  /**
   * 获取当前玩家
   */
  getCurrentPlayer(roomId: string) {
    const state = this.stateManager.getState(roomId);
    if (!state) return null;
    return this.turnManager.getCurrentPlayer(state);
  }
}
