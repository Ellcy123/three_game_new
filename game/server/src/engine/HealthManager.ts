import { GameState } from '../../../shared/src/types/game';
import { PlayerState } from '../../../shared/src/types/player';
import { 
  INITIAL_HEALTH, 
  REVIVE_COST, 
  REVIVE_HEALTH, 
  LEVEL1_MIN_HEALTH 
} from '../../../shared/src/constants/game';

/**
 * 生命值变化结果
 */
export interface HealthChangeResult {
  success: boolean;
  playerId: string;
  previousHealth: number;
  newHealth: number;
  change: number;
  isIncapacitated: boolean;
  message: string;
}

/**
 * 复活结果
 */
export interface ReviveResult {
  success: boolean;
  reviverId: string;
  targetId: string;
  reviverHealthChange: number;
  targetNewHealth: number;
  message: string;
}

/**
 * 生命值管理器
 * 管理角色生命值的变化、阵亡和复活
 */
export class HealthManager {
  /**
   * 修改玩家生命值
   */
  changeHealth(
    state: GameState, 
    playerId: string, 
    change: number
  ): HealthChangeResult {
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) {
      return {
        success: false,
        playerId,
        previousHealth: 0,
        newHealth: 0,
        change: 0,
        isIncapacitated: false,
        message: '玩家不存在'
      };
    }

    const previousHealth = player.health;
    let newHealth = previousHealth + change;

    // 第一关生命值保护
    if (state.levelId === 'level1' && newHealth < LEVEL1_MIN_HEALTH) {
      newHealth = LEVEL1_MIN_HEALTH;
    }

    // 生命值不能低于0
    if (newHealth < 0) {
      newHealth = 0;
    }

    player.health = newHealth;

    // 检查是否阵亡
    const wasIncapacitated = player.isIncapacitated;
    if (newHealth <= 0 && !wasIncapacitated) {
      player.isIncapacitated = true;
    }

    const actualChange = newHealth - previousHealth;
    let message = '';
    
    if (actualChange > 0) {
      message = `${player.name} 恢复了 ${actualChange} 点生命值`;
    } else if (actualChange < 0) {
      message = `${player.name} 受到了 ${Math.abs(actualChange)} 点伤害`;
    }

    if (player.isIncapacitated && !wasIncapacitated) {
      message += `，${player.name} 阵亡了！`;
    }

    return {
      success: true,
      playerId,
      previousHealth,
      newHealth,
      change: actualChange,
      isIncapacitated: player.isIncapacitated,
      message
    };
  }

  /**
   * 复活玩家
   */
  revive(
    state: GameState, 
    reviverId: string, 
    targetId: string
  ): ReviveResult {
    const reviver = state.players.find(p => p.id === reviverId);
    const target = state.players.find(p => p.id === targetId);

    if (!reviver || !target) {
      return {
        success: false,
        reviverId,
        targetId,
        reviverHealthChange: 0,
        targetNewHealth: 0,
        message: '玩家不存在'
      };
    }

    if (!target.isIncapacitated) {
      return {
        success: false,
        reviverId,
        targetId,
        reviverHealthChange: 0,
        targetNewHealth: target.health,
        message: `${target.name} 没有阵亡，不需要复活`
      };
    }

    if (reviver.isIncapacitated) {
      return {
        success: false,
        reviverId,
        targetId,
        reviverHealthChange: 0,
        targetNewHealth: 0,
        message: '你已经阵亡，无法复活他人'
      };
    }

    if (reviver.health <= REVIVE_COST) {
      return {
        success: false,
        reviverId,
        targetId,
        reviverHealthChange: 0,
        targetNewHealth: 0,
        message: `生命值不足，需要至少 ${REVIVE_COST + 1} 点生命值才能复活他人`
      };
    }

    // 执行复活
    reviver.health -= REVIVE_COST;
    target.health = REVIVE_HEALTH;
    target.isIncapacitated = false;

    return {
      success: true,
      reviverId,
      targetId,
      reviverHealthChange: -REVIVE_COST,
      targetNewHealth: REVIVE_HEALTH,
      message: `${reviver.name} 消耗了 ${REVIVE_COST} 点生命值，复活了 ${target.name}！`
    };
  }

  /**
   * 获取玩家当前生命值
   */
  getHealth(state: GameState, playerId: string): number | null {
    const player = state.players.find(p => p.id === playerId);
    return player ? player.health : null;
  }

  /**
   * 检查玩家是否阵亡
   */
  isIncapacitated(state: GameState, playerId: string): boolean {
    const player = state.players.find(p => p.id === playerId);
    return player ? player.isIncapacitated : false;
  }

  /**
   * 获取所有玩家的生命值状态
   */
  getAllHealthStatus(state: GameState): Array<{
    playerId: string;
    name: string;
    health: number;
    maxHealth: number;
    isIncapacitated: boolean;
  }> {
    return state.players.map(player => ({
      playerId: player.id,
      name: player.name,
      health: player.health,
      maxHealth: INITIAL_HEALTH,
      isIncapacitated: player.isIncapacitated
    }));
  }

  /**
   * 检查是否所有玩家都阵亡（游戏结束条件）
   */
  isAllIncapacitated(state: GameState): boolean {
    return state.players.every(p => p.isIncapacitated);
  }

  /**
   * 批量修改生命值（用于全体伤害/治疗）
   */
  changeAllHealth(
    state: GameState, 
    change: number, 
    excludePlayerIds: string[] = []
  ): HealthChangeResult[] {
    return state.players
      .filter(p => !excludePlayerIds.includes(p.id))
      .map(p => this.changeHealth(state, p.id, change));
  }
}
