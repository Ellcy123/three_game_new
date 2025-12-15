import { GameState } from '../../../shared/src/types/game';
import { PlayerState } from '../../../shared/src/types/player';

/**
 * 回合管理器
 * 管理游戏回合的推进和验证
 */
export class TurnManager {
  /**
   * 获取当前行动玩家
   */
  getCurrentPlayer(state: GameState): PlayerState {
    return state.players[state.currentPlayerIndex];
  }

  /**
   * 检查是否是指定玩家的回合
   */
  isPlayerTurn(state: GameState, playerId: string): boolean {
    const currentPlayer = this.getCurrentPlayer(state);
    return currentPlayer.id === playerId;
  }

  /**
   * 检查玩家是否可以行动
   */
  canPlayerAct(state: GameState, playerId: string): { canAct: boolean; reason?: string } {
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) {
      return { canAct: false, reason: '玩家不存在' };
    }

    if (!this.isPlayerTurn(state, playerId)) {
      const currentPlayer = this.getCurrentPlayer(state);
      return { canAct: false, reason: `现在是 ${currentPlayer.name} 的回合` };
    }

    if (player.isIncapacitated) {
      return { canAct: false, reason: '你已经阵亡，无法行动' };
    }

    if (player.isTrapped) {
      return { canAct: false, reason: `你被困在${player.trappedLocation}中，无法行动` };
    }

    return { canAct: true };
  }

  /**
   * 推进到下一个回合
   * @returns 下一个行动玩家的ID
   */
  advanceTurn(state: GameState): string {
    const totalPlayers = state.players.length;
    let nextIndex = (state.currentPlayerIndex + 1) % totalPlayers;
    let attempts = 0;

    // 找到下一个可以行动的玩家
    while (attempts < totalPlayers) {
      const player = state.players[nextIndex];
      if (!player.isIncapacitated && !player.isTrapped) {
        break;
      }
      nextIndex = (nextIndex + 1) % totalPlayers;
      attempts++;
    }

    // 检查是否完成一轮（回到或超过起始位置）
    if (nextIndex <= state.currentPlayerIndex || attempts >= totalPlayers) {
      state.round++;
    }

    state.currentPlayerIndex = nextIndex;
    return state.players[nextIndex].id;
  }

  /**
   * 获取回合顺序信息
   */
  getTurnOrder(state: GameState): Array<{ playerId: string; name: string; canAct: boolean }> {
    return state.players.map(player => ({
      playerId: player.id,
      name: player.name,
      canAct: !player.isIncapacitated && !player.isTrapped
    }));
  }

  /**
   * 获取下一个可行动的玩家（不改变状态）
   */
  peekNextPlayer(state: GameState): PlayerState | null {
    const totalPlayers = state.players.length;
    let nextIndex = (state.currentPlayerIndex + 1) % totalPlayers;
    let attempts = 0;

    while (attempts < totalPlayers) {
      const player = state.players[nextIndex];
      if (!player.isIncapacitated && !player.isTrapped) {
        return player;
      }
      nextIndex = (nextIndex + 1) % totalPlayers;
      attempts++;
    }

    return null; // 没有可行动的玩家
  }

  /**
   * 检查是否所有玩家都无法行动
   */
  isGameStuck(state: GameState): boolean {
    return state.players.every(p => p.isIncapacitated || p.isTrapped);
  }

  /**
   * 当玩家状态改变时重新计算当前回合
   * 用于玩家被解救后立即获得行动机会
   */
  recalculateCurrentTurn(state: GameState): void {
    // 如果当前玩家无法行动，找到下一个可以行动的玩家
    const currentPlayer = this.getCurrentPlayer(state);
    if (currentPlayer.isIncapacitated || currentPlayer.isTrapped) {
      this.advanceTurn(state);
    }
  }
}
