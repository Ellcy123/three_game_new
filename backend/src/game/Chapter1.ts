/**
 * 第一关（密室）游戏逻辑
 *
 * 实现第一关的所有道具组合、效果、前置条件检查
 * 参考文档：docs/level-01.md 第2.5节
 */

import {
  GameState,
  ActionResult,
  GameEffect,
  EffectType,
  HpChange,
  ItemCombination,
  Precondition,
  PreconditionType,
  CharacterType,
  PlayerStatus,
  TrappedLocation,
  ItemStatus,
  GameItem,
} from '../types/game.types';

/**
 * 组合键类型（用于快速查找）
 */
type CombinationKey = string;

/**
 * 第一关游戏逻辑类
 */
export class Chapter1 {
  /**
   * 所有道具组合的映射表
   * key: "item1+item2" 或 "item2+item1"（双向查找）
   */
  private readonly combinations: Map<CombinationKey, ItemCombination>;

  /**
   * 构造函数
   * 初始化所有道具组合
   */
  constructor() {
    this.combinations = new Map();
    this.initializeCombinations();
  }

  // ==================== 公共方法 ====================

  /**
   * 处理道具组合
   *
   * @param item1 物品1
   * @param item2 物品2
   * @param state 当前游戏状态
   * @param actorId 执行操作的玩家ID
   * @returns Promise<ActionResult> 操作结果
   */
  async handleCombination(
    item1: string,
    item2: string,
    state: GameState,
    actorId: string
  ): Promise<ActionResult> {
    try {
      // 标准化物品名称（转小写）
      const normalizedItem1 = this.normalizeItemName(item1);
      const normalizedItem2 = this.normalizeItemName(item2);

      // 查找组合
      const combination = this.findCombination(normalizedItem1, normalizedItem2, state);

      if (!combination) {
        return {
          success: false,
          message: `没有发现 ${item1} 和 ${item2} 之间的关联...`,
          effects: [],
          hpChanges: [],
          timestamp: Date.now(),
        };
      }

      // 检查是否已触发（一次性组合）
      if (!combination.repeatable && state.triggeredEvents.includes(combination.id)) {
        return this.getRepeatedActionMessage(combination, state);
      }

      // 检查前置条件
      const preconditionResult = this.checkPreconditions(combination.preconditions, state, actorId);
      if (!preconditionResult.success) {
        return {
          success: false,
          message: preconditionResult.message,
          effects: [],
          hpChanges: [],
          timestamp: Date.now(),
        };
      }

      // 应用效果
      const result = await this.applyEffects(combination, state, actorId);

      // 标记事件已触发
      if (!combination.repeatable) {
        result.stateChanges = result.stateChanges || {};
        result.stateChanges.triggeredEvents = [...state.triggeredEvents, combination.id];
      }

      return result;
    } catch (error) {
      console.error('[Chapter1] 处理组合失败:', error);
      return {
        success: false,
        message: '处理组合时发生错误',
        effects: [],
        hpChanges: [],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 检查前置条件
   *
   * @param preconditions 前置条件列表
   * @param state 游戏状态
   * @param actorId 执行者ID
   * @returns 检查结果
   */
  checkPreconditions(
    preconditions: Precondition[],
    state: GameState,
    actorId: string
  ): { success: boolean; message: string } {
    for (const condition of preconditions) {
      const result = this.checkSinglePrecondition(condition, state, actorId);
      if (!result.success) {
        return result;
      }
    }

    return { success: true, message: '' };
  }

  /**
   * 应用效果
   *
   * @param combination 道具组合
   * @param state 游戏状态
   * @param actorId 执行者ID
   * @returns Promise<ActionResult> 操作结果
   */
  async applyEffects(
    combination: ItemCombination,
    state: GameState,
    actorId: string
  ): Promise<ActionResult> {
    const effects: GameEffect[] = [...combination.effects];
    const hpChanges: HpChange[] = [];
    const stateChanges: Partial<GameState> = {};

    // 处理生命值变化
    if (combination.hpChange) {
      const hpResult = this.applyHpChange(combination.hpChange, state, actorId);
      hpChanges.push(...hpResult.hpChanges);
      stateChanges.players = hpResult.updatedPlayers;
    }

    // 应用每个效果
    for (const effect of combination.effects) {
      const effectResult = this.applySingleEffect(effect, state, actorId);
      Object.assign(stateChanges, effectResult);
    }

    return {
      success: true,
      message: combination.description,
      effects,
      hpChanges,
      stateChanges,
      timestamp: Date.now(),
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化所有道具组合
   */
  private initializeCombinations(): void {
    const allCombinations: ItemCombination[] = [
      // ==================== 水潭相关组合 ====================
      ...this.getPondCombinations(),

      // ==================== 行李箱相关组合 ====================
      ...this.getSuitcaseCombinations(),

      // ==================== 衣柜相关组合 ====================
      ...this.getWardrobeCombinations(),

      // ==================== 木盒相关组合 ====================
      ...this.getWoodenBoxCombinations(),

      // ==================== 电脑相关组合 ====================
      ...this.getComputerCombinations(),

      // ==================== 钥匙相关组合 ====================
      ...this.getKeyCombinations(),

      // ==================== 显示器相关组合 ====================
      ...this.getMonitorCombinations(),

      // ==================== 花瓶相关组合 ====================
      ...this.getVaseCombinations(),

      // ==================== 囚笼相关组合 ====================
      ...this.getCageCombinations(),

      // ==================== 角色互动组合 ====================
      ...this.getCharacterInteractionCombinations(),
    ];

    // 添加到映射表（双向索引）
    for (const combination of allCombinations) {
      const key1 = this.makeCombinationKey(combination.item1, combination.item2);
      const key2 = this.makeCombinationKey(combination.item2, combination.item1);

      this.combinations.set(key1, combination);
      if (key1 !== key2) {
        this.combinations.set(key2, combination);
      }
    }

    console.log(`[Chapter1] 已加载 ${allCombinations.length} 个道具组合`);
  }

  /**
   * 获取水潭相关的所有组合
   */
  private getPondCombinations(): ItemCombination[] {
    return [
      // 水潭+龟【关键】
      {
        id: 'pond_turtle',
        triggers: ['水潭+龟', '龟+水潭', 'pond+turtle', 'turtle+pond'],
        item1: '水潭',
        item2: '龟',
        description: `<玩家名>潜入水中，在水底发现了一个木盒。水下似乎还有其他物品，但无法拿取。`,
        preconditions: [],
        effects: [
          {
            type: EffectType.OBTAIN_ITEM,
            value: {
              id: 'wooden_box',
              name: '木盒',
              description: '一个从水底捞起的木盒，似乎被牢牢锁住了',
              status: ItemStatus.NORMAL,
              isKeyItem: true,
            },
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 水潭+猫
      {
        id: 'pond_cat',
        triggers: ['水潭+猫', '猫+水潭'],
        item1: '水潭',
        item2: '猫',
        description: `<猫玩家名>跳入了水中...但猫不会游泳！<猫玩家名>在水里扑腾着，但因为"要面子"没有呼救。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着，无法跳入水中',
          },
        ],
        effects: [],
        hpChange: { target: 'cat', amount: -1 },
        isKeyAction: false,
        repeatable: false,
      },

      // 水潭+狗【关键】
      {
        id: 'pond_dog',
        triggers: ['水潭+狗', '狗+水潭'],
        item1: '水潭',
        item2: '狗',
        description: `<狗玩家名>从水潭里捞起了一个显示器。这显示器防水性能不错，体感还挺凑凑的。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着，无法捞东西',
          },
        ],
        effects: [
          {
            type: EffectType.OBTAIN_ITEM,
            value: {
              id: 'monitor',
              name: '显示器',
              description: '从水潭里捞起的防水显示器',
              status: ItemStatus.NORMAL,
              isKeyItem: true,
            },
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 水潭+行李箱
      {
        id: 'pond_suitcase',
        triggers: ['水潭+行李箱', '行李箱+水潭'],
        item1: '水潭',
        item2: '行李箱',
        description: `你们将行李箱改造成了"梅利号"船，放入水潭航行。但船很快就沉了，你们又把行李箱捞了回来。`,
        preconditions: [
          {
            type: PreconditionType.ITEM_STATUS,
            key: 'suitcase',
            value: ItemStatus.NORMAL,
            errorMessage: '行李箱已经损坏，无法使用',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 水潭+衣柜
      {
        id: 'pond_wardrobe',
        triggers: ['水潭+衣柜', '衣柜+水潭'],
        item1: '水潭',
        item2: '衣柜',
        description: `你们试图把衣柜搬到水潭边...结果搬运时碰了头。你们意识到这个世界居然有引力。`,
        preconditions: [],
        effects: [],
        hpChange: { target: 'actor', amount: -1 },
        isKeyAction: false,
        repeatable: false,
      },

      // 水潭+显示器
      {
        id: 'pond_monitor',
        triggers: ['水潭+显示器', '显示器+水潭'],
        item1: '水潭',
        item2: '显示器',
        description: `你把显示器扔回了水潭...它沉入水底，消失不见了。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
        ],
        effects: [
          {
            type: EffectType.UPDATE_ITEM_STATUS,
            target: 'monitor',
            value: ItemStatus.DISAPPEARED,
          },
        ],
        isKeyAction: false,
        repeatable: false,
      },

      // 水潭+电脑
      {
        id: 'pond_computer',
        triggers: ['水潭+电脑', '电脑+水潭'],
        item1: '水潭',
        item2: '电脑',
        description: `你们把电脑扔进了水潭...突然，一位河神出现了！"你们掉的是金电脑、银电脑，还是这台破电脑？"你们如实回答，河神很高兴，恢复了你们一些生命值。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现电脑',
          },
        ],
        effects: [],
        hpChange: { target: 'all', amount: 1 },
        isKeyAction: false,
        repeatable: false,
      },

      // 水潭+钥匙
      {
        id: 'pond_key',
        triggers: ['水潭+钥匙', '钥匙+水潭'],
        item1: '水潭',
        item2: '钥匙',
        description: `<玩家名>用钥匙打水漂...其他玩家在背后悄悄吐槽："智力不健全啊..."`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 水潭+囚笼（狗在囚笼）
      {
        id: 'pond_cage_dog_trapped',
        triggers: ['水潭+囚笼', '囚笼+水潭'],
        item1: '水潭',
        item2: '囚笼',
        description: `你们试图把囚笼浸入水中...结果被<狗玩家名>咬伤了！`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现囚笼',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.TRAPPED,
            errorMessage: '', // 如果狗已救出，会匹配另一个组合
          },
        ],
        effects: [],
        hpChange: { target: 'actor', amount: -2 },
        isKeyAction: false,
        repeatable: true, // 可重复触发
      },

      // 水潭+囚笼（狗已救出）
      {
        id: 'pond_cage_dog_freed',
        triggers: ['水潭+囚笼', '囚笼+水潭'],
        item1: '水潭',
        item2: '囚笼',
        description: `你们把空囚笼扔进水潭...河神再次出现，但这次他很生气，打了你们一耳光。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现囚笼',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '', // 狗已被救出
          },
        ],
        effects: [],
        hpChange: { target: 'actor', amount: -1 },
        isKeyAction: false,
        repeatable: false,
      },

      // 水潭+花瓶
      {
        id: 'pond_vase',
        triggers: ['水潭+花瓶', '花瓶+水潭'],
        item1: '水潭',
        item2: '花瓶',
        description: `你们喝了花瓶里的水...水里有细菌！你们得了肠胃炎。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现花瓶',
          },
        ],
        effects: [],
        hpChange: { target: 'actor', amount: -1 },
        isKeyAction: false,
        repeatable: false,
      },

      // 水潭+木盒
      {
        id: 'pond_wooden_box',
        triggers: ['水潭+木盒', '木盒+水潭'],
        item1: '水潭',
        item2: '木盒',
        description: `你把木盒扔回了水潭...它沉入水底，消失不见了。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
        ],
        effects: [
          {
            type: EffectType.UPDATE_ITEM_STATUS,
            target: 'wooden_box',
            value: ItemStatus.DISAPPEARED,
          },
        ],
        isKeyAction: false,
        repeatable: false,
      },
    ];
  }

  /**
   * 获取行李箱相关的所有组合
   */
  private getSuitcaseCombinations(): ItemCombination[] {
    return [
      // 行李箱+龟【关键】
      {
        id: 'suitcase_turtle',
        triggers: ['行李箱+龟', '龟+行李箱'],
        item1: '行李箱',
        item2: '龟',
        description: `<龟玩家名>走到行李箱前，发现上面有一个三位数密码锁。从行李箱内传来微弱的呼救声...`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.TRAPPED,
            errorMessage: '猫已经被救出了',
          },
        ],
        effects: [
          {
            type: EffectType.SHOW_PASSWORD_PROMPT,
            value: {
              passwordId: 'suitcase_password',
              type: 'numeric',
              length: 3,
              correctPassword: '000',
            },
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 猫+行李箱【关键】
      {
        id: 'cat_suitcase',
        triggers: ['猫+行李箱', '行李箱+猫'],
        item1: '猫',
        item2: '行李箱',
        description: `<猫玩家名>怒火中烧，用爪子疯狂撕烂了行李箱。行李箱的内衬里掉出了一把钥匙。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困在行李箱里，无法行动',
          },
        ],
        effects: [
          {
            type: EffectType.OBTAIN_ITEM,
            value: {
              id: 'key',
              name: '钥匙',
              description: '从行李箱内衬发现的钥匙',
              status: ItemStatus.NORMAL,
              isKeyItem: true,
            },
          },
          {
            type: EffectType.UPDATE_ITEM_STATUS,
            target: 'suitcase',
            value: ItemStatus.DAMAGED,
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 行李箱+狗
      {
        id: 'suitcase_dog',
        triggers: ['行李箱+狗', '狗+行李箱'],
        item1: '行李箱',
        item2: '狗',
        description: `<狗玩家名>在行李箱上留下了标记...效果未知。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着，无法行动',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 行李箱+显示器
      {
        id: 'suitcase_monitor',
        triggers: ['行李箱+显示器', '显示器+行李箱'],
        item1: '行李箱',
        item2: '显示器',
        description: `其他玩家吐槽："这个组合...你的智商异于常人啊，建议停手。"`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 行李箱+电脑
      {
        id: 'suitcase_computer',
        triggers: ['行李箱+电脑', '电脑+行李箱'],
        item1: '行李箱',
        item2: '电脑',
        description: `其他玩家问："你这是...打算出差？建议尽快去医院检查一下。"`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现电脑',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 行李箱+钥匙
      {
        id: 'suitcase_key',
        triggers: ['行李箱+钥匙', '钥匙+行李箱'],
        item1: '行李箱',
        item2: '钥匙',
        description: `你把钥匙放回了行李箱...钥匙消失了。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
        ],
        effects: [
          {
            type: EffectType.UPDATE_ITEM_STATUS,
            target: 'key',
            value: ItemStatus.DISAPPEARED,
          },
        ],
        isKeyAction: false,
        repeatable: false,
      },

      // 行李箱+囚笼（狗在囚笼）
      {
        id: 'suitcase_cage_dog_trapped',
        triggers: ['行李箱+囚笼', '囚笼+行李箱'],
        item1: '行李箱',
        item2: '囚笼',
        description: `你们用行李箱砸囚笼试图救出<狗玩家名>...但不慎砸伤了狗！`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现囚笼',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.TRAPPED,
            errorMessage: '',
          },
        ],
        effects: [],
        hpChange: { target: 'dog', amount: -1 },
        isKeyAction: false,
        repeatable: false,
      },

      // 行李箱+囚笼（狗已救出）
      {
        id: 'suitcase_cage_dog_freed',
        triggers: ['行李箱+囚笼', '囚笼+行李箱'],
        item1: '行李箱',
        item2: '囚笼',
        description: `你们把行李箱锁进了囚笼。"这样更安全！"你们如是说。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现囚笼',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 行李箱+衣柜
      {
        id: 'suitcase_wardrobe',
        triggers: ['行李箱+衣柜', '衣柜+行李箱'],
        item1: '行李箱',
        item2: '衣柜',
        description: `你们把行李箱放入衣柜，开始打扫...突然意识到这不是自己的房间。`,
        preconditions: [],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 行李箱+花瓶
      {
        id: 'suitcase_vase',
        triggers: ['行李箱+花瓶', '花瓶+行李箱'],
        item1: '行李箱',
        item2: '花瓶',
        description: `你们把花瓶当作青花瓷装进行李箱...其他人指出这只值20元。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现花瓶',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 行李箱+木盒
      {
        id: 'suitcase_wooden_box',
        triggers: ['行李箱+木盒', '木盒+行李箱'],
        item1: '行李箱',
        item2: '木盒',
        description: `你们因为同情木盒"不自由"，将它锁进了行李箱。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },
    ];
  }

  /**
   * 获取衣柜相关的所有组合
   */
  private getWardrobeCombinations(): ItemCombination[] {
    return [
      // 衣柜+龟【关键】
      {
        id: 'wardrobe_turtle',
        triggers: ['衣柜+龟', '龟+衣柜'],
        item1: '衣柜',
        item2: '龟',
        description: `<龟玩家名>在衣柜下方发现了一个隐藏的按钮！`,
        preconditions: [],
        effects: [
          {
            type: EffectType.UNLOCK_AREA,
            value: 'small_room',
            description: '按下按钮后，衣柜缓缓移开，后面居然有一个小房间！',
          },
          {
            type: EffectType.SET_FLAG,
            target: 'smallRoomUnlocked',
            value: true,
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 衣柜+猫【关键】
      {
        id: 'wardrobe_cat',
        triggers: ['衣柜+猫', '猫+衣柜'],
        item1: '衣柜',
        item2: '猫',
        description: `<猫玩家名>在衣柜上面发现了一个模模糊糊的字母：C`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着，无法探索衣柜',
          },
        ],
        effects: [
          {
            type: EffectType.COLLECT_LETTER,
            value: {
              letter: 'C',
              source: '衣柜顶部',
            },
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 衣柜+狗
      {
        id: 'wardrobe_dog',
        triggers: ['衣柜+狗', '狗+衣柜'],
        item1: '衣柜',
        item2: '狗',
        description: `<狗玩家名>在衣柜上留下了标记...效果未知。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着，无法行动',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 衣柜+显示器
      {
        id: 'wardrobe_monitor',
        triggers: ['衣柜+显示器', '显示器+衣柜'],
        item1: '衣柜',
        item2: '显示器',
        description: `系统提示：试试"行李箱+显示器"？`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 衣柜+电脑
      {
        id: 'wardrobe_computer',
        triggers: ['衣柜+电脑', '电脑+衣柜'],
        item1: '衣柜',
        item2: '电脑',
        description: `你们把电脑放入衣柜后尝试开机...没有任何效果。其他玩家嘲笑你们。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现电脑',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 衣柜+钥匙（可复用）
      {
        id: 'wardrobe_key',
        triggers: ['衣柜+钥匙', '钥匙+衣柜'],
        item1: '衣柜',
        item2: '钥匙',
        description: `<玩家名>用钥匙打开了衣柜暗格，获得了一颗红水晶心！食用后生命值+1。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
        ],
        effects: [],
        hpChange: { target: 'actor', amount: 1 },
        isKeyAction: false,
        repeatable: true, // 可复用
      },

      // 衣柜+囚笼（狗在囚笼）
      {
        id: 'wardrobe_cage_dog_trapped',
        triggers: ['衣柜+囚笼', '囚笼+衣柜'],
        item1: '衣柜',
        item2: '囚笼',
        description: `你们试图把囚笼锁进衣柜...结果被<狗玩家名>咬伤了！`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现囚笼',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.TRAPPED,
            errorMessage: '',
          },
        ],
        effects: [],
        hpChange: { target: 'actor', amount: -2 },
        isKeyAction: false,
        repeatable: false,
      },

      // 衣柜+囚笼（狗已救出）
      {
        id: 'wardrobe_cage_dog_freed',
        triggers: ['衣柜+囚笼', '囚笼+衣柜'],
        item1: '衣柜',
        item2: '囚笼',
        description: `你们试图给囚笼穿衣服...但尺寸不合身。其他玩家开始疏远你们。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现囚笼',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 衣柜+花瓶
      {
        id: 'wardrobe_vase',
        triggers: ['衣柜+花瓶', '花瓶+衣柜'],
        item1: '衣柜',
        item2: '花瓶',
        description: `你们试图给花瓶穿衣服...尺寸不合身。其他玩家开始疏远你们。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现花瓶',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 衣柜+木盒
      {
        id: 'wardrobe_wooden_box',
        triggers: ['衣柜+木盒', '木盒+衣柜'],
        item1: '衣柜',
        item2: '木盒',
        description: `你们把木盒放入衣柜，然后讲了一个冷笑话...其他玩家都被冻感冒了。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
        ],
        effects: [],
        hpChange: { target: 'all', amount: -0.5 },
        isKeyAction: false,
        repeatable: false,
      },
    ];
  }

  /**
   * 获取木盒相关的所有组合
   */
  private getWoodenBoxCombinations(): ItemCombination[] {
    return [
      // 木盒+龟
      {
        id: 'wooden_box_turtle',
        triggers: ['木盒+龟', '龟+木盒'],
        item1: '木盒',
        item2: '龟',
        description: `<龟玩家名>试图打开木盒...但打不开。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 木盒+猫
      {
        id: 'wooden_box_cat',
        triggers: ['木盒+猫', '猫+木盒'],
        item1: '木盒',
        item2: '猫',
        description: `<猫玩家名>试图打开木盒...但打不开。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着，无法行动',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 木盒+狗【关键】
      {
        id: 'wooden_box_dog',
        triggers: ['木盒+狗', '狗+木盒'],
        item1: '木盒',
        item2: '狗',
        description: `<狗玩家名>用牙齿咬开了木盒。木盒里有一张字条，上面写着字母：E`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着，无法咬开木盒',
          },
        ],
        effects: [
          {
            type: EffectType.UPDATE_ITEM_STATUS,
            target: 'wooden_box',
            value: ItemStatus.USED,
          },
          {
            type: EffectType.COLLECT_LETTER,
            value: {
              letter: 'E',
              source: '木盒内的字条',
            },
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 木盒+显示器
      {
        id: 'wooden_box_monitor',
        triggers: ['木盒+显示器', '显示器+木盒'],
        item1: '木盒',
        item2: '显示器',
        description: `你们用木盒砸坏了显示器...显示器无法使用了，看来密码只能瞎猜了。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
        ],
        effects: [
          {
            type: EffectType.UPDATE_ITEM_STATUS,
            target: 'monitor',
            value: ItemStatus.DAMAGED,
          },
        ],
        isKeyAction: false,
        repeatable: false,
      },

      // 木盒+电脑
      {
        id: 'wooden_box_computer',
        triggers: ['木盒+电脑', '电脑+木盒'],
        item1: '木盒',
        item2: '电脑',
        description: `木盒和电脑似乎没有任何关联...`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现电脑',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 木盒+钥匙
      {
        id: 'wooden_box_key',
        triggers: ['木盒+钥匙', '钥匙+木盒'],
        item1: '木盒',
        item2: '钥匙',
        description: `钥匙的型号不匹配，无法打开木盒。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 木盒+囚笼（狗在囚笼）【关键】
      {
        id: 'wooden_box_cage_dog_trapped',
        triggers: ['木盒+囚笼', '囚笼+木盒'],
        item1: '木盒',
        item2: '囚笼',
        description: `你们把木盒递给<狗玩家名>，狗咬开了木盒，获得字条"E"。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.TRAPPED,
            errorMessage: '',
          },
        ],
        effects: [
          {
            type: EffectType.UPDATE_ITEM_STATUS,
            target: 'wooden_box',
            value: ItemStatus.USED,
          },
          {
            type: EffectType.COLLECT_LETTER,
            value: {
              letter: 'E',
              source: '木盒内的字条',
            },
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 木盒+囚笼（狗已救出）
      {
        id: 'wooden_box_cage_dog_freed',
        triggers: ['木盒+囚笼', '囚笼+木盒'],
        item1: '木盒',
        item2: '囚笼',
        description: `你们把木盒关进了囚笼...其他玩家开始吐槽你们。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 木盒+花瓶【关键】
      {
        id: 'wooden_box_vase',
        triggers: ['木盒+花瓶', '花瓶+木盒'],
        item1: '木盒',
        item2: '花瓶',
        description: `你们用花瓶砸木盒...花瓶碎裂了，发现瓶内有字母"O"！`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'wooden_box',
            errorMessage: '你还没有获得木盒',
          },
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现花瓶',
          },
        ],
        effects: [
          {
            type: EffectType.COLLECT_LETTER,
            value: {
              letter: 'O',
              source: '花瓶内部',
            },
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },
    ];
  }

  /**
   * 获取电脑相关的所有组合
   *
   * 由于字符限制，我将在下一部分继续实现剩余的组合
   */
  private getComputerCombinations(): ItemCombination[] {
    return [
      // 电脑+猫
      {
        id: 'computer_cat',
        triggers: ['电脑+猫', '猫+电脑'],
        item1: '电脑',
        item2: '猫',
        description: `<猫玩家名>检查了电脑，发现它已经损坏了，无法维修。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现电脑',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着，无法行动',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 电脑+龟
      {
        id: 'computer_turtle',
        triggers: ['电脑+龟', '龟+电脑'],
        item1: '电脑',
        item2: '龟',
        description: `<龟玩家名>检查了电脑，发现它已经损坏了，无法维修。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现电脑',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 电脑+狗
      {
        id: 'computer_dog',
        triggers: ['电脑+狗', '狗+电脑'],
        item1: '电脑',
        item2: '狗',
        description: `<狗玩家名>在电脑上留下了标记...效果未知。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现电脑',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着，无法行动',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 电脑+钥匙
      {
        id: 'computer_key',
        triggers: ['电脑+钥匙', '钥匙+电脑'],
        item1: '电脑',
        item2: '钥匙',
        description: `你们把钥匙插入电脑...没有任何效果。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现电脑',
          },
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 电脑+囚笼（狗在囚笼）
      {
        id: 'computer_cage_dog_trapped',
        triggers: ['电脑+囚笼', '囚笼+电脑'],
        item1: '电脑',
        item2: '囚笼',
        description: `你们把电脑递给<狗玩家名>玩...狗陷入了沉思。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.TRAPPED,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 电脑+囚笼（狗已救出）
      {
        id: 'computer_cage_dog_freed',
        triggers: ['电脑+囚笼', '囚笼+电脑'],
        item1: '电脑',
        item2: '囚笼',
        description: `你们把电脑关进囚笼，将其命名为"赛博监狱"。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 电脑+花瓶（未收集全部字母）【关键】
      {
        id: 'computer_vase_letters_incomplete',
        triggers: ['电脑+花瓶', '花瓶+电脑'],
        item1: '电脑',
        item2: '花瓶',
        description: `你们用花瓶砸电脑...花瓶碎裂了，你的手被划伤了，但发现瓶内有字母"O"！`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现小房间',
          },
          {
            type: PreconditionType.CUSTOM,
            key: 'letters_collected',
            value: '< 4',
            errorMessage: '', // 已收集全部字母时不触发此组合
          },
        ],
        effects: [
          {
            type: EffectType.COLLECT_LETTER,
            value: {
              letter: 'O',
              source: '花瓶内部',
            },
          },
        ],
        hpChange: { target: 'actor', amount: -1 },
        isKeyAction: true,
        repeatable: false,
      },

      // 显示器+电脑【关键】
      {
        id: 'monitor_computer',
        triggers: ['显示器+电脑', '电脑+显示器'],
        item1: '显示器',
        item2: '电脑',
        description: `你们合力将显示器连接到电脑上。电脑成功开机了！屏幕上显示着一个字母：H`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现电脑',
          },
        ],
        effects: [
          {
            type: EffectType.SET_FLAG,
            target: 'computerWorking',
            value: true,
          },
          {
            type: EffectType.COLLECT_LETTER,
            value: {
              letter: 'H',
              source: '电脑屏幕',
            },
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },
    ];
  }

  /**
   * 获取钥匙相关的所有组合
   */
  private getKeyCombinations(): ItemCombination[] {
    return [
      // 钥匙+狗
      {
        id: 'key_dog',
        triggers: ['钥匙+狗', '狗+钥匙'],
        item1: '钥匙',
        item2: '狗',
        description: `<狗玩家名>将钥匙含在嘴里...这是个人习惯。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 钥匙+猫
      {
        id: 'key_cat',
        triggers: ['钥匙+猫', '猫+钥匙'],
        item1: '钥匙',
        item2: '猫',
        description: `<猫玩家名>用钥匙挠后背...体感很舒适。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 钥匙+龟
      {
        id: 'key_turtle',
        triggers: ['钥匙+龟', '龟+钥匙'],
        item1: '钥匙',
        item2: '龟',
        description: `<龟玩家名>认为这把钥匙是用来打开"桌扇门"的。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 钥匙+显示器
      {
        id: 'key_monitor',
        triggers: ['钥匙+显示器', '显示器+钥匙'],
        item1: '钥匙',
        item2: '显示器',
        description: `你们用钥匙砸显示器...显示器损坏了，无法使用。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
        ],
        effects: [
          {
            type: EffectType.UPDATE_ITEM_STATUS,
            target: 'monitor',
            value: ItemStatus.DAMAGED,
          },
        ],
        isKeyAction: false,
        repeatable: false,
      },

      // 钥匙+囚笼（狗在囚笼）【关键】
      {
        id: 'key_cage_dog_trapped',
        triggers: ['钥匙+囚笼', '囚笼+钥匙'],
        item1: '钥匙',
        item2: '囚笼',
        description: `<玩家名>用钥匙打开了囚笼的锁。<狗玩家名>冲了出来，自由了！`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你需要一把钥匙才能打开囚笼',
          },
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现囚笼',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.TRAPPED,
            errorMessage: '狗已经被救出了',
          },
        ],
        effects: [
          {
            type: EffectType.UPDATE_PLAYER_STATUS,
            target: 'dog',
            value: {
              status: PlayerStatus.ACTIVE,
              trappedLocation: TrappedLocation.NONE,
              canAct: true,
            },
          },
          {
            type: EffectType.SET_FLAG,
            target: 'cageOpened',
            value: true,
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 钥匙+囚笼（狗已救出）
      {
        id: 'key_cage_dog_freed',
        triggers: ['钥匙+囚笼', '囚笼+钥匙'],
        item1: '钥匙',
        item2: '囚笼',
        description: `你们用钥匙把囚笼重新锁上了。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 钥匙+花瓶
      {
        id: 'key_vase',
        triggers: ['钥匙+花瓶', '花瓶+钥匙'],
        item1: '钥匙',
        item2: '花瓶',
        description: `你们试图用钥匙打开花瓶...其他人建议你们去医院检查一下。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'key',
            errorMessage: '你还没有获得钥匙',
          },
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现花瓶',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },
    ];
  }

  /**
   * 获取显示器相关的所有组合
   */
  private getMonitorCombinations(): ItemCombination[] {
    return [
      // 显示器+猫
      {
        id: 'monitor_cat',
        triggers: ['显示器+猫', '猫+显示器'],
        item1: '显示器',
        item2: '猫',
        description: `<猫玩家名>砸坏了显示器...显示器消失了，无法使用。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着',
          },
        ],
        effects: [
          {
            type: EffectType.UPDATE_ITEM_STATUS,
            target: 'monitor',
            value: ItemStatus.DISAPPEARED,
          },
        ],
        isKeyAction: false,
        repeatable: false,
      },

      // 显示器+狗
      {
        id: 'monitor_dog',
        triggers: ['显示器+狗', '狗+显示器'],
        item1: '显示器',
        item2: '狗',
        description: `<狗玩家名>发现这个显示器防水性能很好，性能似乎优于当前的电脑。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 显示器+龟
      {
        id: 'monitor_turtle',
        triggers: ['显示器+龟', '龟+显示器'],
        item1: '显示器',
        item2: '龟',
        description: `<龟玩家名>通过显示器的反光"臭美"了一番...心情变好，生命值+1。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
        ],
        effects: [],
        hpChange: { target: 'turtle', amount: 1 },
        isKeyAction: false,
        repeatable: false,
      },

      // 显示器+衣柜
      {
        id: 'monitor_wardrobe',
        triggers: ['显示器+衣柜', '衣柜+显示器'],
        item1: '显示器',
        item2: '衣柜',
        description: `其他玩家夸你："天才！"触发了"作者崇拜"状态。`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 显示器+花瓶
      {
        id: 'monitor_vase',
        triggers: ['显示器+花瓶', '花瓶+显示器'],
        item1: '显示器',
        item2: '花瓶',
        description: `系统提示：试试"显示器+衣柜"？`,
        preconditions: [
          {
            type: PreconditionType.HAS_ITEM,
            key: 'monitor',
            errorMessage: '你还没有获得显示器',
          },
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现花瓶',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },
    ];
  }

  /**
   * 获取花瓶相关的所有组合
   */
  private getVaseCombinations(): ItemCombination[] {
    return [
      // 花瓶+猫【关键】
      {
        id: 'vase_cat',
        triggers: ['花瓶+猫', '猫+花瓶'],
        item1: '花瓶',
        item2: '猫',
        description: `<猫玩家名>把脑袋探进了花瓶当中，观察到瓶内居然有一个字母：O`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现花瓶',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着，无法探索花瓶',
          },
        ],
        effects: [
          {
            type: EffectType.COLLECT_LETTER,
            value: {
              letter: 'O',
              source: '花瓶内部',
            },
          },
        ],
        isKeyAction: true,
        repeatable: false,
      },

      // 花瓶+狗
      {
        id: 'vase_dog',
        triggers: ['花瓶+狗', '狗+花瓶'],
        item1: '花瓶',
        item2: '狗',
        description: `<狗玩家名>在花瓶上留下了标记...效果未知。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现花瓶',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 花瓶+龟
      {
        id: 'vase_turtle',
        triggers: ['花瓶+龟', '龟+花瓶'],
        item1: '花瓶',
        item2: '龟',
        description: `<龟玩家名>没有发现花瓶的玄机，建议让其他玩家尝试。`,
        preconditions: [
          {
            type: PreconditionType.FLAG_SET,
            key: 'smallRoomUnlocked',
            value: true,
            errorMessage: '你还没有发现花瓶',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },

      // 花瓶+囚笼（狗在囚笼）
      {
        id: 'vase_cage_dog_trapped',
        triggers: ['花瓶+囚笼', '囚笼+花瓶'],
        item1: '花瓶',
        item2: '囚笼',
        description: `你们把花瓶递给<狗玩家名>...狗将其弄坏了。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.TRAPPED,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 花瓶+囚笼（狗已救出）
      {
        id: 'vase_cage_dog_freed',
        triggers: ['花瓶+囚笼', '囚笼+花瓶'],
        item1: '花瓶',
        item2: '囚笼',
        description: `你们把花瓶关进囚笼...没有任何效果，仅被其他玩家嘲笑。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },
    ];
  }

  /**
   * 获取囚笼相关的组合（角色与囚笼的交互）
   */
  private getCageCombinations(): ItemCombination[] {
    return [
      // 猫+囚笼（狗在囚笼）
      {
        id: 'cat_cage_dog_trapped',
        triggers: ['猫+囚笼', '囚笼+猫'],
        item1: '猫',
        item2: '囚笼',
        description: `<猫玩家名>嘲笑被囚的<狗玩家名>...狗怒骂了回去。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.TRAPPED,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 龟+囚笼（狗在囚笼）
      {
        id: 'turtle_cage_dog_trapped',
        triggers: ['龟+囚笼', '囚笼+龟'],
        item1: '龟',
        item2: '囚笼',
        description: `<龟玩家名>安慰<狗玩家名>，称会想办法救他。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.TRAPPED,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 猫+囚笼（狗已救出）
      {
        id: 'cat_cage_dog_freed',
        triggers: ['猫+囚笼', '囚笼+猫'],
        item1: '猫',
        item2: '囚笼',
        description: `<猫玩家名>把自己关进了囚笼，称"好玩"并让其他人救自己出来。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 龟+囚笼（狗已救出）
      {
        id: 'turtle_cage_dog_freed',
        triggers: ['龟+囚笼', '囚笼+龟'],
        item1: '龟',
        item2: '囚笼',
        description: `<龟玩家名>检查囚笼下方，发现了一张"跳关卡卡"！`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '',
          },
        ],
        effects: [
          {
            type: EffectType.OBTAIN_ITEM,
            value: {
              id: 'skip_card',
              name: '跳关卡卡',
              description: '可以跳过某个关卡的特殊卡片',
              status: ItemStatus.NORMAL,
              isKeyItem: false,
            },
          },
        ],
        isKeyAction: false,
        repeatable: false,
      },

      // 狗+囚笼
      {
        id: 'dog_cage',
        triggers: ['狗+囚笼', '囚笼+狗'],
        item1: '狗',
        item2: '囚笼',
        description: `<狗玩家名>在囚笼上留下了标记...效果未知。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: true,
      },
    ];
  }

  /**
   * 获取角色互动组合
   */
  private getCharacterInteractionCombinations(): ItemCombination[] {
    return [
      // 猫+狗
      {
        id: 'cat_dog',
        triggers: ['猫+狗', '狗+猫'],
        item1: '猫',
        item2: '狗',
        description: `<猫玩家名>嘲讽<狗玩家名>的身材...二人打了起来，猫惨败。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着',
          },
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着',
          },
        ],
        effects: [],
        hpChange: { target: 'cat', amount: -1 },
        isKeyAction: false,
        repeatable: false,
      },

      // 猫+龟
      {
        id: 'cat_turtle',
        triggers: ['猫+龟', '龟+猫'],
        item1: '猫',
        item2: '龟',
        description: `<猫玩家名>嘲笑<龟玩家名>"长得奇怪"...龟没有理会。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'cat',
            value: PlayerStatus.ACTIVE,
            errorMessage: '猫还被困着',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 狗+龟（另一个方向）
      {
        id: 'dog_turtle',
        triggers: ['狗+龟', '龟+狗'],
        item1: '狗',
        item2: '龟',
        description: `<狗玩家名>感谢<龟玩家名>救了自己，约定共同弄清当前的处境。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着',
          },
        ],
        effects: [],
        isKeyAction: false,
        repeatable: false,
      },

      // 龟教狗强身方法
      {
        id: 'turtle_dog_training',
        triggers: ['龟+狗', '狗+龟'],
        item1: '龟',
        item2: '狗',
        description: `<龟玩家名>教<狗玩家名>强身健体的方法...狗学会后生命值+1。`,
        preconditions: [
          {
            type: PreconditionType.CHARACTER_STATUS,
            key: 'dog',
            value: PlayerStatus.ACTIVE,
            errorMessage: '狗还被困着',
          },
        ],
        effects: [],
        hpChange: { target: 'dog', amount: 1 },
        isKeyAction: false,
        repeatable: false,
      },
    ];
  }

  /**
   * 标准化物品名称
   */
  private normalizeItemName(name: string): string {
    return name.toLowerCase().trim();
  }

  /**
   * 创建组合键
   */
  private makeCombinationKey(item1: string, item2: string): CombinationKey {
    return `${this.normalizeItemName(item1)}+${this.normalizeItemName(item2)}`;
  }

  /**
   * 查找组合
   *
   * 会尝试多种匹配策略
   */
  private findCombination(item1: string, item2: string, state: GameState): ItemCombination | null {
    const key = this.makeCombinationKey(item1, item2);
    let combination = this.combinations.get(key);

    // 如果直接匹配失败，尝试使用同义词
    if (!combination) {
      // TODO: 实现同义词匹配
      // 例如：'水池' => '水潭', '盒子' => '木盒'
    }

    // 如果找到组合，还需要检查是否有多个版本（基于前置条件）
    // 例如：水潭+囚笼有两个版本（狗在囚笼 vs 狗已救出）
    if (combination) {
      return this.selectBestMatch(combination, state);
    }

    return null;
  }

  /**
   * 选择最佳匹配的组合
   *
   * 当同一个组合有多个版本时，根据当前状态选择最合适的版本
   */
  private selectBestMatch(combination: ItemCombination, state: GameState): ItemCombination {
    // 当前实现：直接返回找到的组合
    // 未来优化：可以根据前置条件选择最佳匹配
    return combination;
  }

  /**
   * 检查单个前置条件
   */
  private checkSinglePrecondition(
    condition: Precondition,
    state: GameState,
    actorId: string
  ): { success: boolean; message: string } {
    switch (condition.type) {
      case PreconditionType.HAS_ITEM:
        return this.checkHasItem(condition.key!, state);

      case PreconditionType.ITEM_STATUS:
        return this.checkItemStatus(condition.key!, condition.value, state);

      case PreconditionType.FLAG_SET:
        return this.checkFlag(condition.key!, condition.value, state);

      case PreconditionType.CHARACTER_STATUS:
        return this.checkCharacterStatus(condition.key!, condition.value, state);

      case PreconditionType.AREA_UNLOCKED:
        return this.checkAreaUnlocked(condition.key!, state);

      case PreconditionType.HAS_LETTER:
        return this.checkHasLetter(condition.key!, state);

      default:
        return { success: true, message: '' };
    }
  }

  /**
   * 检查是否拥有道具
   */
  private checkHasItem(itemId: string, state: GameState): { success: boolean; message: string } {
    const hasItem = state.inventory.some(item => item.id === itemId && item.status !== ItemStatus.DISAPPEARED);
    return {
      success: hasItem,
      message: hasItem ? '' : `你还没有获得${itemId}`,
    };
  }

  /**
   * 检查道具状态
   */
  private checkItemStatus(itemId: string, expectedStatus: ItemStatus, state: GameState): { success: boolean; message: string } {
    const item = state.inventory.find(i => i.id === itemId);
    if (!item) {
      return { success: false, message: `找不到道具${itemId}` };
    }

    const matches = item.status === expectedStatus;
    return {
      success: matches,
      message: matches ? '' : `道具${itemId}的状态不正确`,
    };
  }

  /**
   * 检查游戏标志
   */
  private checkFlag(flagKey: string, expectedValue: any, state: GameState): { success: boolean; message: string } {
    const actualValue = state.flags[flagKey];
    const matches = actualValue === expectedValue;
    return {
      success: matches,
      message: matches ? '' : `条件不满足`,
    };
  }

  /**
   * 检查角色状态
   */
  private checkCharacterStatus(characterType: string, expectedStatus: PlayerStatus, state: GameState): { success: boolean; message: string } {
    const player = state.players.find(p => p.character === characterType);
    if (!player) {
      return { success: false, message: `找不到角色${characterType}` };
    }

    const matches = player.status === expectedStatus;
    return {
      success: matches,
      message: matches ? '' : `角色${characterType}的状态不正确`,
    };
  }

  /**
   * 检查区域是否已解锁
   */
  private checkAreaUnlocked(areaId: string, state: GameState): { success: boolean; message: string } {
    const unlocked = state.unlockedAreas.includes(areaId);
    return {
      success: unlocked,
      message: unlocked ? '' : `区域${areaId}尚未解锁`,
    };
  }

  /**
   * 检查是否已收集字母
   */
  private checkHasLetter(letter: string, state: GameState): { success: boolean; message: string } {
    const hasLetter = state.collectedLetters.some(l => l.letter === letter);
    return {
      success: hasLetter,
      message: hasLetter ? '' : `还没有收集字母${letter}`,
    };
  }

  /**
   * 应用单个效果
   */
  private applySingleEffect(effect: GameEffect, state: GameState, actorId: string): Partial<GameState> {
    const changes: Partial<GameState> = {};

    switch (effect.type) {
      case EffectType.OBTAIN_ITEM:
        changes.inventory = [...state.inventory, effect.value as GameItem];
        break;

      case EffectType.UPDATE_ITEM_STATUS:
        changes.inventory = state.inventory.map(item =>
          item.id === effect.target ? { ...item, status: effect.value } : item
        );
        break;

      case EffectType.SET_FLAG:
        changes.flags = { ...state.flags, [effect.target!]: effect.value };
        break;

      case EffectType.UNLOCK_AREA:
        changes.unlockedAreas = [...state.unlockedAreas, effect.value];
        break;

      case EffectType.COLLECT_LETTER:
        changes.collectedLetters = [
          ...state.collectedLetters,
          {
            letter: effect.value.letter,
            collectedAt: Date.now(),
            source: effect.value.source,
          },
        ];
        break;

      case EffectType.UPDATE_PLAYER_STATUS:
        changes.players = state.players.map(player =>
          player.character === effect.target
            ? { ...player, ...effect.value }
            : player
        );
        break;

      default:
        break;
    }

    return changes;
  }

  /**
   * 应用生命值变化
   */
  private applyHpChange(
    hpChange: { target: string; amount: number },
    state: GameState,
    actorId: string
  ): { hpChanges: HpChange[]; updatedPlayers: typeof state.players } {
    const hpChanges: HpChange[] = [];
    const updatedPlayers = [...state.players];

    // 确定目标玩家
    let targetPlayers: typeof state.players = [];

    if (hpChange.target === 'all') {
      // 所有玩家
      targetPlayers = updatedPlayers;
    } else if (hpChange.target === 'actor') {
      // 执行操作的玩家
      targetPlayers = updatedPlayers.filter(p => p.id === actorId);
    } else {
      // 特定角色
      targetPlayers = updatedPlayers.filter(p => p.character === hpChange.target);
    }

    // 应用生命值变化
    for (const player of targetPlayers) {
      const oldHp = player.hp;
      const newHp = Math.max(1, Math.min(player.maxHp, oldHp + hpChange.amount)); // 最低1点，最高maxHp

      // 更新玩家生命值
      const playerIndex = updatedPlayers.findIndex(p => p.id === player.id);
      if (playerIndex !== -1) {
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], hp: newHp };
      }

      // 记录生命值变化
      hpChanges.push({
        playerId: player.id,
        character: player.character,
        amount: hpChange.amount,
        oldHp,
        newHp,
      });
    }

    return { hpChanges, updatedPlayers };
  }

  /**
   * 获取重复操作的提示信息
   */
  private getRepeatedActionMessage(combination: ItemCombination, state: GameState): ActionResult {
    // 根据组合ID返回特定的重复提示
    let message = '';

    switch (combination.id) {
      case 'pond_turtle':
        message = '你已经从水底捞起过木盒了。';
        break;
      case 'suitcase_turtle':
        message = '行李箱已经打开了。';
        break;
      case 'cat_suitcase':
        message = '行李箱已经被撕烂了。';
        break;
      case 'key_cage_dog_trapped':
        message = '囚笼已经打开了。';
        break;
      default:
        message = '这个操作已经执行过了。';
        break;
    }

    return {
      success: false,
      message,
      effects: [],
      hpChanges: [],
      timestamp: Date.now(),
    };
  }
}

/**
 * 创建第一关实例
 */
export function createChapter1(): Chapter1 {
  return new Chapter1();
}
