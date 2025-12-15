import { GameState, InventoryItem } from '../../../shared/src/types/game';
import { PlayerState, CharacterType } from '../../../shared/src/types/player';
import { Player } from '../../../shared/src/types/player';
import { INITIAL_HEALTH } from '../../../shared/src/constants/game';
import { RoomManager } from './RoomManager';

/**
 * 游戏状态管理器
 * 管理游戏状态的读写和持久化
 */
export class StateManager {
  private states: Map<string, GameState> = new Map();

  /**
   * 初始化游戏状态
   */
  initializeState(roomId: string, players: Player[]): GameState {
    const playerStates: PlayerState[] = players.map(player => {
      const characterType = RoomManager.getCharacterType(player.characterIndex!) as CharacterType;
      
      // 根据角色类型设置初始状态
      let isTrapped = false;
      let trappedLocation: string | undefined;
      
      if (characterType === 'cat') {
        isTrapped = true;
        trappedLocation = 'suitcase';
      } else if (characterType === 'dog') {
        isTrapped = true;
        trappedLocation = 'cage';
      }

      return {
        id: player.id,
        name: player.customName || player.name,
        characterType,
        characterRevealed: false,
        health: INITIAL_HEALTH,
        isIncapacitated: false,
        isTrapped,
        trappedLocation,
        isConnected: true
      };
    });

    const state: GameState = {
      roomId,
      levelId: 'level1',
      round: 1,
      currentPlayerIndex: this.findFirstActivePlayer(playerStates),
      players: playerStates,
      triggeredEvents: [],
      collectedLetters: [],
      unlockedAreas: ['main_room'],
      inventory: [],
      smallRoomUnlocked: false
    };

    this.states.set(roomId, state);
    return state;
  }

  /**
   * 找到第一个可以行动的玩家（乌龟）
   */
  private findFirstActivePlayer(players: PlayerState[]): number {
    const turtleIndex = players.findIndex(p => p.characterType === 'turtle');
    return turtleIndex >= 0 ? turtleIndex : 0;
  }

  /**
   * 获取当前状态
   */
  getState(roomId: string): GameState | null {
    return this.states.get(roomId) || null;
  }

  /**
   * 更新状态
   */
  updateState(roomId: string, updates: Partial<GameState>): GameState | null {
    const state = this.states.get(roomId);
    if (!state) {
      return null;
    }

    Object.assign(state, updates);
    return state;
  }

  /**
   * 更新玩家状态
   */
  updatePlayerState(roomId: string, playerId: string, updates: Partial<PlayerState>): GameState | null {
    const state = this.states.get(roomId);
    if (!state) {
      return null;
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return null;
    }

    Object.assign(player, updates);
    return state;
  }

  /**
   * 序列化状态为JSON
   */
  serialize(state: GameState): string {
    return JSON.stringify(state);
  }

  /**
   * 反序列化JSON为状态
   */
  deserialize(json: string): GameState {
    return JSON.parse(json) as GameState;
  }

  /**
   * 添加已触发事件
   */
  addTriggeredEvent(roomId: string, eventId: string): void {
    const state = this.states.get(roomId);
    if (state && !state.triggeredEvents.includes(eventId)) {
      state.triggeredEvents.push(eventId);
    }
  }

  /**
   * 检查事件是否已触发
   */
  isEventTriggered(roomId: string, eventId: string): boolean {
    const state = this.states.get(roomId);
    return state ? state.triggeredEvents.includes(eventId) : false;
  }

  /**
   * 添加收集的字母
   */
  addLetter(roomId: string, letter: string): void {
    const state = this.states.get(roomId);
    if (state && !state.collectedLetters.includes(letter)) {
      state.collectedLetters.push(letter);
    }
  }

  /**
   * 检查是否收集了所有字母
   */
  hasAllLetters(roomId: string): boolean {
    const state = this.states.get(roomId);
    if (!state) return false;
    
    const required = ['C', 'E', 'H', 'O'];
    return required.every(l => state.collectedLetters.includes(l));
  }

  /**
   * 解锁区域
   */
  unlockArea(roomId: string, areaId: string): void {
    const state = this.states.get(roomId);
    if (state && !state.unlockedAreas.includes(areaId)) {
      state.unlockedAreas.push(areaId);
    }
  }

  /**
   * 检查区域是否已解锁
   */
  isAreaUnlocked(roomId: string, areaId: string): boolean {
    const state = this.states.get(roomId);
    return state ? state.unlockedAreas.includes(areaId) : false;
  }

  /**
   * 添加物品到物品栏
   */
  addItem(roomId: string, item: InventoryItem): void {
    const state = this.states.get(roomId);
    if (state) {
      const existing = state.inventory.find(i => i.id === item.id);
      if (!existing) {
        state.inventory.push(item);
      }
    }
  }

  /**
   * 检查是否拥有物品
   */
  hasItem(roomId: string, itemId: string): boolean {
    const state = this.states.get(roomId);
    if (!state) return false;
    
    const item = state.inventory.find(i => i.id === itemId);
    return item ? !item.isDestroyed : false;
  }

  /**
   * 销毁物品
   */
  destroyItem(roomId: string, itemId: string): void {
    const state = this.states.get(roomId);
    if (state) {
      const item = state.inventory.find(i => i.id === itemId);
      if (item) {
        item.isDestroyed = true;
      }
    }
  }

  /**
   * 推进回合
   */
  advanceTurn(roomId: string): string | null {
    const state = this.states.get(roomId);
    if (!state) return null;

    // 找到下一个可以行动的玩家
    let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    let attempts = 0;
    
    while (attempts < state.players.length) {
      const player = state.players[nextIndex];
      if (!player.isIncapacitated && !player.isTrapped) {
        break;
      }
      nextIndex = (nextIndex + 1) % state.players.length;
      attempts++;
    }

    // 检查是否完成一轮
    if (nextIndex <= state.currentPlayerIndex) {
      state.round++;
    }

    state.currentPlayerIndex = nextIndex;
    return state.players[nextIndex].id;
  }

  /**
   * 获取当前行动玩家
   */
  getCurrentPlayer(roomId: string): PlayerState | null {
    const state = this.states.get(roomId);
    if (!state) return null;
    return state.players[state.currentPlayerIndex];
  }

  /**
   * 检查是否是当前玩家的回合
   */
  isPlayerTurn(roomId: string, playerId: string): boolean {
    const currentPlayer = this.getCurrentPlayer(roomId);
    return currentPlayer ? currentPlayer.id === playerId : false;
  }

  /**
   * 释放被困角色
   */
  freeCharacter(roomId: string, playerId: string): void {
    const state = this.states.get(roomId);
    if (state) {
      const player = state.players.find(p => p.id === playerId);
      if (player) {
        player.isTrapped = false;
        player.trappedLocation = undefined;
      }
    }
  }

  /**
   * 根据角色类型获取玩家
   */
  getPlayerByCharacterType(roomId: string, characterType: CharacterType): PlayerState | null {
    const state = this.states.get(roomId);
    if (!state) return null;
    return state.players.find(p => p.characterType === characterType) || null;
  }

  /**
   * 删除房间状态
   */
  deleteState(roomId: string): void {
    this.states.delete(roomId);
  }
}
