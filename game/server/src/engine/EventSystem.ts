import { GameState, KeywordCombination, EventResult } from '../../../shared/src/types/game';
import { GameEvent, EventCondition, LevelConfig } from '../../../shared/src/types/events';
import { KeywordParser } from './KeywordParser';
import { HealthManager } from './HealthManager';

/**
 * 事件系统
 * 管理游戏事件的触发、执行和状态更新
 */
export class EventSystem {
  private levelConfigs: Map<string, LevelConfig> = new Map();
  private keywordParser: KeywordParser;
  private healthManager: HealthManager;

  constructor(keywordParser: KeywordParser) {
    this.keywordParser = keywordParser;
    this.healthManager = new HealthManager();
  }

  /**
   * 加载关卡配置
   */
  loadLevelConfig(config: LevelConfig): void {
    this.levelConfigs.set(config.levelId, config);
  }

  /**
   * 根据关键词组合查找匹配事件
   */
  findEvent(combination: KeywordCombination, levelId: string): GameEvent | null {
    const config = this.levelConfigs.get(levelId);
    if (!config) {
      return null;
    }

    for (const event of config.events) {
      if (this.keywordParser.isEquivalent(combination, event.trigger)) {
        return event;
      }
    }

    return null;
  }

  /**
   * 检查事件是否可触发
   */
  canTrigger(event: GameEvent, state: GameState): { canTrigger: boolean; reason?: string } {
    // 检查一次性事件是否已触发
    if (event.isOneTime && state.triggeredEvents.includes(event.id)) {
      return { canTrigger: false, reason: '这个组合已经尝试过了' };
    }

    // 检查前置事件
    for (const prereqId of event.prerequisites) {
      if (!state.triggeredEvents.includes(prereqId)) {
        return { canTrigger: false, reason: '还需要先完成其他事情' };
      }
    }

    // 检查条件
    if (event.conditions) {
      for (const condition of event.conditions) {
        const result = this.checkCondition(condition, state);
        if (!result.satisfied) {
          return { canTrigger: false, reason: result.reason };
        }
      }
    }

    return { canTrigger: true };
  }

  /**
   * 检查单个条件
   */
  private checkCondition(
    condition: EventCondition, 
    state: GameState
  ): { satisfied: boolean; reason?: string } {
    let satisfied = false;
    let reason = '';

    switch (condition.type) {
      case 'character_free': {
        const player = state.players.find(p => p.characterType === condition.target);
        satisfied = player ? !player.isTrapped : false;
        reason = player ? `${player.name}还被困着，无法行动` : '角色不存在';
        break;
      }
      case 'character_trapped': {
        const player = state.players.find(p => p.characterType === condition.target);
        satisfied = player ? player.isTrapped : false;
        reason = player ? `${player.name}已经自由了` : '角色不存在';
        break;
      }
      case 'has_item': {
        const item = state.inventory.find(i => i.id === condition.target);
        satisfied = item ? !item.isDestroyed : false;
        reason = `你还没有获得${condition.target}`;
        break;
      }
      case 'area_unlocked': {
        satisfied = state.unlockedAreas.includes(condition.target);
        reason = `你还没有发现${condition.target}`;
        break;
      }
      case 'has_letter': {
        satisfied = state.collectedLetters.includes(condition.target);
        reason = `你还没有收集到字母${condition.target}`;
        break;
      }
    }

    // 处理取反
    if (condition.negate) {
      satisfied = !satisfied;
    }

    return { satisfied, reason: satisfied ? undefined : reason };
  }

  /**
   * 执行事件
   */
  execute(event: GameEvent, state: GameState, actingPlayerId: string): EventResult {
    const canTriggerResult = this.canTrigger(event, state);
    if (!canTriggerResult.canTrigger) {
      return {
        success: false,
        storyText: canTriggerResult.reason || '无法触发此事件'
      };
    }

    const result: EventResult = {
      success: true,
      storyText: event.storyText,
      healthChanges: [],
      itemsGained: [],
      lettersGained: [],
      areasUnlocked: []
    };

    // 执行所有效果
    for (const effect of event.effects) {
      switch (effect.type) {
        case 'health': {
          if (effect.target === 'all') {
            // 对所有玩家造成伤害/治疗
            for (const player of state.players) {
              const healthResult = this.healthManager.changeHealth(
                state,
                player.id,
                effect.value as number
              );
              result.healthChanges!.push({
                playerId: player.id,
                change: healthResult.change
              });
            }
          } else {
            const targetId = effect.target === 'current' 
              ? actingPlayerId 
              : this.resolveTargetPlayer(effect.target, state);
            
            if (targetId) {
              const healthResult = this.healthManager.changeHealth(
                state, 
                targetId, 
                effect.value as number
              );
              result.healthChanges!.push({
                playerId: targetId,
                change: healthResult.change
              });
            }
          }
          break;
        }
        case 'item': {
          const itemId = effect.value as string;
          state.inventory.push({
            id: itemId,
            name: itemId,
            isDestroyed: false
          });
          result.itemsGained!.push(itemId);
          break;
        }
        case 'destroy_item': {
          const itemId = effect.value as string;
          const item = state.inventory.find(i => i.id === itemId);
          if (item) {
            item.isDestroyed = true;
          }
          break;
        }
        case 'unlock': {
          const areaId = effect.value as string;
          if (!state.unlockedAreas.includes(areaId)) {
            state.unlockedAreas.push(areaId);
            result.areasUnlocked!.push(areaId);
          }
          if (areaId === 'small_room') {
            state.smallRoomUnlocked = true;
          }
          break;
        }
        case 'letter': {
          const letter = effect.value as string;
          if (!state.collectedLetters.includes(letter)) {
            state.collectedLetters.push(letter);
            result.lettersGained!.push(letter);
          }
          break;
        }
        case 'free_character': {
          const characterType = effect.value as string;
          const player = state.players.find(p => p.characterType === characterType);
          if (player) {
            player.isTrapped = false;
            player.trappedLocation = undefined;
            // 添加角色被解救的事件标记
            const rescuedEventId = `evt_${characterType}_rescued`;
            if (!state.triggeredEvents.includes(rescuedEventId)) {
              state.triggeredEvents.push(rescuedEventId);
            }
          }
          break;
        }
        case 'status': {
          // 处理其他状态变更
          break;
        }
      }
    }

    // 标记一次性事件为已触发
    if (event.isOneTime) {
      state.triggeredEvents.push(event.id);
    }

    // 检查是否需要密码输入
    if (event.requiresPassword) {
      result.requiresPassword = true;
      result.passwordType = event.passwordType;
    }

    // 检查是否需要选择
    if (event.requiresChoice && event.choices) {
      result.requiresChoice = true;
      result.choices = event.choices;
    }

    return result;
  }

  /**
   * 解析目标玩家ID
   */
  private resolveTargetPlayer(target: string | undefined, state: GameState): string | null {
    if (!target) return null;
    
    // 如果是角色类型，找到对应玩家
    const player = state.players.find(p => p.characterType === target);
    return player ? player.id : null;
  }

  /**
   * 处理无匹配事件的情况
   */
  handleNoMatch(combination: KeywordCombination): EventResult {
    return {
      success: false,
      storyText: `尝试了"${combination.rawInput}"，但似乎没有什么效果...`
    };
  }

  /**
   * 获取关卡配置
   */
  getLevelConfig(levelId: string): LevelConfig | null {
    return this.levelConfigs.get(levelId) || null;
  }
}
