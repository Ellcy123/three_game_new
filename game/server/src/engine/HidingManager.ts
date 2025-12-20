/**
 * 藏匿关卡管理器
 * 管理第二关的躲避游戏逻辑
 */

export interface HidingArea {
  id: string;
  name: string;
  capacity: number;
  isDestroyed: boolean;
  currentPlayers: string[]; // 玩家ID列表
}

export interface HidingState {
  currentRound: number;
  maxRounds: number;
  phase: 'story' | 'rules' | 'selecting' | 'attacking' | 'result' | 'final' | 'ending';
  areas: HidingArea[];
  destroyedAreas: string[];
  playerSelections: Map<string, string | null>; // playerId -> areaId
  playerConfirmed: Map<string, boolean>;
  playerHitCounts: Map<string, number>;
  selectionTimeLeft: number;
  lastAttackedArea: string | null;
  hitPlayersThisRound: string[];
}

export interface HidingLevelConfig {
  levelId: string;
  name: string;
  type: string;
  maxRounds: number;
  selectionTime: number;
  areas: {
    id: string;
    name: string;
    capacity: number;
    selectText: string;
    attackText: string;
  }[];
  roundTexts: Record<string, string>;
  perfectDodgeBonus: number;
}

export class HidingManager {
  private state: HidingState | null = null;
  private config: HidingLevelConfig | null = null;
  private selectionTimer: NodeJS.Timeout | null = null;

  /**
   * 初始化藏匿关卡
   */
  initialize(config: HidingLevelConfig, playerIds: string[]): HidingState {
    this.config = config;

    const areas: HidingArea[] = config.areas.map(area => ({
      id: area.id,
      name: area.name,
      capacity: area.capacity,
      isDestroyed: false,
      currentPlayers: []
    }));

    const playerSelections = new Map<string, string | null>();
    const playerConfirmed = new Map<string, boolean>();
    const playerHitCounts = new Map<string, number>();

    playerIds.forEach(id => {
      playerSelections.set(id, null);
      playerConfirmed.set(id, false);
      playerHitCounts.set(id, 0);
    });

    this.state = {
      currentRound: 1,
      maxRounds: config.maxRounds,
      phase: 'story',
      areas,
      destroyedAreas: [],
      playerSelections,
      playerConfirmed,
      playerHitCounts,
      selectionTimeLeft: config.selectionTime,
      lastAttackedArea: null,
      hitPlayersThisRound: []
    };

    return this.state;
  }

  /**
   * 获取当前状态
   */
  getState(): HidingState | null {
    return this.state;
  }

  /**
   * 进入下一阶段
   */
  nextPhase(): HidingState | null {
    if (!this.state) return null;

    switch (this.state.phase) {
      case 'story':
        this.state.phase = 'rules';
        break;
      case 'rules':
        this.state.phase = 'selecting';
        this.resetSelections();
        break;
      case 'selecting':
        this.state.phase = 'attacking';
        break;
      case 'attacking':
        this.state.phase = 'result';
        break;
      case 'result':
        if (this.state.currentRound >= this.state.maxRounds) {
          this.state.phase = 'final';
        } else {
          this.state.currentRound++;
          this.state.phase = 'selecting';
          this.resetSelections();
        }
        break;
      case 'final':
        this.state.phase = 'ending';
        break;
      case 'ending':
        // 标记为完成，触发进入第三幕
        (this.state as any).levelComplete = true;
        break;
    }

    return this.state;
  }

  /**
   * 重置选择状态
   */
  private resetSelections(): void {
    if (!this.state || !this.config) return;

    this.state.selectionTimeLeft = this.config.selectionTime;
    this.state.hitPlayersThisRound = [];
    this.state.lastAttackedArea = null;

    // 清空所有区域的当前玩家
    this.state.areas.forEach(area => {
      area.currentPlayers = [];
    });

    // 重置玩家选择和确认状态
    this.state.playerSelections.forEach((_, key) => {
      this.state!.playerSelections.set(key, null);
      this.state!.playerConfirmed.set(key, false);
    });
  }

  /**
   * 玩家选择区域
   */
  selectArea(playerId: string, areaId: string): { success: boolean; message?: string } {
    if (!this.state) {
      return { success: false, message: '游戏未初始化' };
    }

    if (this.state.phase !== 'selecting') {
      return { success: false, message: '当前不是选择阶段' };
    }

    if (this.state.playerConfirmed.get(playerId)) {
      return { success: false, message: '你已经确认选择了' };
    }

    const area = this.state.areas.find(a => a.id === areaId);
    if (!area) {
      return { success: false, message: '区域不存在' };
    }

    if (area.isDestroyed) {
      return { success: false, message: '该区域已被摧毁，请选择其他区域' };
    }

    // 检查区域容量（排除当前玩家自己）
    const otherPlayersInArea = area.currentPlayers.filter(id => id !== playerId);
    if (otherPlayersInArea.length >= area.capacity) {
      return { success: false, message: `该区域已满（${area.capacity}/${area.capacity}），请选择其他区域` };
    }

    // 从之前选择的区域移除
    const previousAreaId = this.state.playerSelections.get(playerId);
    if (previousAreaId) {
      const previousArea = this.state.areas.find(a => a.id === previousAreaId);
      if (previousArea) {
        previousArea.currentPlayers = previousArea.currentPlayers.filter(id => id !== playerId);
      }
    }

    // 添加到新区域
    area.currentPlayers.push(playerId);
    this.state.playerSelections.set(playerId, areaId);

    return { success: true };
  }

  /**
   * 玩家确认选择
   */
  confirmSelection(playerId: string): { success: boolean; message?: string } {
    if (!this.state) {
      return { success: false, message: '游戏未初始化' };
    }

    if (this.state.phase !== 'selecting') {
      return { success: false, message: '当前不是选择阶段' };
    }

    const selection = this.state.playerSelections.get(playerId);
    if (!selection) {
      return { success: false, message: '请先选择一个区域' };
    }

    this.state.playerConfirmed.set(playerId, true);
    return { success: true };
  }

  /**
   * 检查是否所有玩家都已确认
   */
  allPlayersConfirmed(): boolean {
    if (!this.state) return false;

    for (const [, confirmed] of this.state.playerConfirmed) {
      if (!confirmed) return false;
    }
    return true;
  }

  /**
   * 为未选择的玩家随机分配区域
   */
  assignRandomAreas(): string[] {
    if (!this.state) return [];

    const assignedPlayers: string[] = [];
    const availableAreas = this.state.areas.filter(a => !a.isDestroyed);

    this.state.playerSelections.forEach((selection, playerId) => {
      if (!selection) {
        // 找一个有空位的区域
        const areasWithSpace = availableAreas.filter(a => a.currentPlayers.length < a.capacity);
        if (areasWithSpace.length > 0) {
          const randomArea = areasWithSpace[Math.floor(Math.random() * areasWithSpace.length)];
          randomArea.currentPlayers.push(playerId);
          this.state!.playerSelections.set(playerId, randomArea.id);
          this.state!.playerConfirmed.set(playerId, true);
          assignedPlayers.push(playerId);
        }
      }
    });

    return assignedPlayers;
  }

  /**
   * 执行攻击
   */
  executeAttack(): { attackedArea: HidingArea; hitPlayers: string[] } | null {
    if (!this.state) return null;

    // 从可用区域中随机选择
    const availableAreas = this.state.areas.filter(a => !a.isDestroyed);
    if (availableAreas.length === 0) return null;

    const attackedArea = availableAreas[Math.floor(Math.random() * availableAreas.length)];
    const hitPlayers = [...attackedArea.currentPlayers];

    // 更新被击中次数
    hitPlayers.forEach(playerId => {
      const currentCount = this.state!.playerHitCounts.get(playerId) || 0;
      this.state!.playerHitCounts.set(playerId, currentCount + 1);
    });

    // 标记区域为已摧毁
    attackedArea.isDestroyed = true;
    this.state.destroyedAreas.push(attackedArea.id);

    // 记录本轮攻击结果
    this.state.lastAttackedArea = attackedArea.id;
    this.state.hitPlayersThisRound = hitPlayers;

    return { attackedArea, hitPlayers };
  }

  /**
   * 计算最终奖励
   */
  calculateFinalRewards(): Map<string, number> {
    const rewards = new Map<string, number>();

    if (!this.state || !this.config) return rewards;

    this.state.playerHitCounts.forEach((hitCount, playerId) => {
      if (hitCount === 0) {
        rewards.set(playerId, this.config!.perfectDodgeBonus);
      }
    });

    return rewards;
  }

  /**
   * 获取玩家被击中次数
   */
  getPlayerHitCount(playerId: string): number {
    return this.state?.playerHitCounts.get(playerId) || 0;
  }

  /**
   * 获取区域信息
   */
  getAreaInfo(areaId: string): HidingArea | undefined {
    return this.state?.areas.find(a => a.id === areaId);
  }

  /**
   * 获取可用区域列表
   */
  getAvailableAreas(): HidingArea[] {
    return this.state?.areas.filter(a => !a.isDestroyed) || [];
  }

  /**
   * 获取当前轮次文本
   */
  getRoundText(): string {
    if (!this.state || !this.config) return '';
    return this.config.roundTexts[this.state.currentRound.toString()] || '';
  }

  /**
   * 减少选择时间
   */
  decreaseSelectionTime(): number {
    if (!this.state) return 0;
    this.state.selectionTimeLeft = Math.max(0, this.state.selectionTimeLeft - 1);
    return this.state.selectionTimeLeft;
  }

  /**
   * 清理
   */
  cleanup(): void {
    if (this.selectionTimer) {
      clearInterval(this.selectionTimer);
      this.selectionTimer = null;
    }
    this.state = null;
    this.config = null;
  }
}
