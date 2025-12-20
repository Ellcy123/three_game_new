/**
 * 鼠鼠大王 BOSS战管理器
 * 第一关BOSS - 单人轮流出战，选择洞口攻击
 */

import {
  MouseKingState,
  BossPlayerState,
  PlayerSkillInfo,
  shuffle,
  rollDice,
  hasSkill,
  hasItem,
  isSkillUsed,
  isItemUsed,
  markSkillUsed,
  markItemUsed
} from './BossManager';

// 洞口内容类型
type HoleContent = 'A' | 'B' | 'C' | 'D' | 'E';

// 洞口内容说明
const HOLE_DESCRIPTIONS: Record<HoleContent, string> = {
  A: '鼠鼠大王',
  B: '巧克力酱',
  C: '囤货区',
  D: '狗',
  E: '龟/猫'
};

// 技能触发信息
export interface SkillTriggerInfo {
  name: string;
  effect: string;
  owner: 'cat' | 'dog' | 'turtle' | 'system';  // 技能所属角色
  ownerName?: string;  // 角色显示名
}

// 攻击结果
export interface AttackResult {
  success: boolean;
  holeIndex: number;
  content: HoleContent;
  contentName: string;
  damage: number;
  message: string;
  healthChanges: { playerId: string; change: number; reason: string }[];
  bossHealthChange: number;
  skillsTriggered: SkillTriggerInfo[];
}

export class MouseKingManager {
  private state: MouseKingState | null = null;

  /**
   * 初始化鼠鼠大王战斗
   */
  initialize(playerInfos: PlayerSkillInfo[]): MouseKingState {
    const players: BossPlayerState[] = playerInfos.map(p => ({
      playerId: p.playerId,
      characterType: p.characterType,
      health: 8,
      maxHealth: 10,
      isAlive: true,
      isActive: false,
      skills: p.skills,
      items: p.items,
      usedSkills: [],
      usedItems: []
    }));

    this.state = {
      bossId: 'mouse_king',
      bossName: '鼠鼠大王',
      bossHealth: 6,
      bossMaxHealth: 6,
      phase: 'intro',
      round: 0,
      players,
      isComplete: false,
      result: 'pending',
      holeContents: [],
      currentPlayerId: null,
      lastHoleResult: null,
      excludedHoles: [],
      canSelectMultiple: false,
      multiSelectCount: 1
    };

    return this.state;
  }

  getState(): MouseKingState | null {
    return this.state;
  }


  /**
   * 检查是否应该跳过本关卡
   */
  checkSkipBattle(): { skip: boolean; reason: string } | null {
    if (!this.state) return null;

    // 检查慈悲之心技能
    for (const player of this.state.players) {
      if (hasSkill(player, 'mercy')) {
        return { skip: true, reason: '【慈悲之心】：你获得老鼠的好感，直接跳过第一关卡！' };
      }
    }

    return { skip: false, reason: '' };
  }

  /**
   * 开始战斗
   */
  startBattle(): void {
    if (!this.state) return;
    
    // 检查"呼朋唤友"和"花瓶？哼！"技能的组合效果
    const turtle = this.state.players.find(p => p.characterType === 'turtle');
    const cat = this.state.players.find(p => p.characterType === 'cat');
    
    if (turtle && cat) {
      const hasNotVase = hasSkill(turtle, 'not_vase');
      const hasCallFriends = hasSkill(turtle, 'call_friends');
      
      // 如果同时有两个"可与猫一同出战"的技能，二人生命值 +2
      if (hasNotVase && hasCallFriends) {
        turtle.health = Math.min(turtle.health + 2, turtle.maxHealth);
        cat.health = Math.min(cat.health + 2, cat.maxHealth);
        console.log('【呼朋唤友】组合效果：猫和乌龟生命值 +2');
      }
    }
    
    // 检查"黑暗料理"技能 - 使鼠鼠大王生命值-1
    for (const player of this.state.players) {
      if (hasSkill(player, 'dark_food')) {
        this.state.bossHealth = Math.max(1, this.state.bossHealth - 1);
        console.log('【黑暗料理】：鼠鼠大王生命值 -1');
        break;
      }
    }
    
    // 检查"拷贝"技能 - 生命值等同于最高者
    for (const player of this.state.players) {
      if (hasSkill(player, 'copy')) {
        const maxHealth = Math.max(...this.state.players.map(p => p.health));
        player.health = maxHealth;
        console.log(`【拷贝】：${this.getCharacterName(player.characterType)} 生命值变为 ${maxHealth}`);
      }
    }
    
    this.state.phase = 'select_player';
    this.state.round = 1;
  }

  /**
   * 检查玩家是否可以出战
   */
  canPlayerFight(playerId: string): { canFight: boolean; reason: string } {
    if (!this.state) return { canFight: false, reason: '状态未初始化' };

    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player) return { canFight: false, reason: '玩家不存在' };
    if (!player.isAlive) return { canFight: false, reason: '玩家已阵亡' };

    // 检查"挥金如土"技能 - 三位玩家均可出战
    const hasRichSkill = this.state.players.some(p => hasSkill(p, 'rich'));
    if (hasRichSkill) {
      return { canFight: true, reason: '【挥金如土】：三位玩家均可出战' };
    }

    // 检查是否有"花瓶？哼！"技能（乌龟可与猫一同出战）
    const turtle = this.state.players.find(p => p.characterType === 'turtle');
    const hasNotVaseSkill = turtle && hasSkill(turtle, 'not_vase');
    
    // 检查是否有"呼朋唤友"技能（乌龟可与猫一同出战）
    const hasCallFriendsSkill = turtle && hasSkill(turtle, 'call_friends');
    
    // 检查"创意工坊"技能 - 可与其他玩家一同出战
    const hasCreativeSkill = this.state.players.some(p => hasSkill(p, 'creative'));

    // 狗不能出战（除非猫龟都阵亡，或者有特殊技能）
    if (player.characterType === 'dog') {
      const catAlive = this.state.players.some(p => p.characterType === 'cat' && p.isAlive);
      const turtleAlive = this.state.players.some(p => p.characterType === 'turtle' && p.isAlive);
      if (catAlive || turtleAlive) {
        return { canFight: false, reason: '【多管闲事】：狗不可出战，除非猫和龟都已阵亡' };
      }
    }

    // 乌龟默认不能在猫存活时出战，除非有相关技能
    if (player.characterType === 'turtle') {
      const catActive = this.state.players.some(p => p.characterType === 'cat' && p.isActive);
      
      // 如果有相关技能，乌龟可以与猫一同出战
      if ((hasNotVaseSkill || hasCallFriendsSkill || hasCreativeSkill) && catActive) {
        let skillName = '创意工坊';
        if (hasNotVaseSkill) skillName = '花瓶？哼！';
        else if (hasCallFriendsSkill) skillName = '呼朋唤友';
        return { canFight: true, reason: `【${skillName}】：可与猫一同出战` };
      }
    }

    return { canFight: true, reason: '' };
  }

  /**
   * 选择出战玩家
   */
  selectFighter(playerId: string): { success: boolean; message: string } {
    if (!this.state) return { success: false, message: '状态未初始化' };

    const check = this.canPlayerFight(playerId);
    if (!check.canFight) return { success: false, message: check.reason };

    // 设置当前出战玩家
    this.state.players.forEach(p => p.isActive = false);
    const player = this.state.players.find(p => p.playerId === playerId)!;
    player.isActive = true;
    this.state.currentPlayerId = playerId;

    // 随机分配洞口内容
    this.shuffleHoles();

    // 检查洞口排除技能
    this.applyHoleExclusionSkills();

    // 检查多选技能
    this.applyMultiSelectSkills();

    this.state.phase = 'select_hole';
    return { success: true, message: `${this.getPlayerName(playerId)} 出战！` };
  }

  /**
   * 随机分配洞口内容
   */
  private shuffleHoles(): void {
    if (!this.state) return;
    const contents: HoleContent[] = ['A', 'B', 'C', 'D', 'E'];
    this.state.holeContents = shuffle(contents);
  }

  /**
   * 应用洞口排除技能
   */
  private applyHoleExclusionSkills(): void {
    if (!this.state) return;
    this.state.excludedHoles = [];

    const currentPlayer = this.state.players.find(p => p.isActive);
    if (!currentPlayer) return;

    // 义眼：排除B（巧克力）和D（狗）洞口
    if (hasSkill(currentPlayer, 'cyber_eye')) {
      const bIndex = this.state.holeContents.indexOf('B');
      const dIndex = this.state.holeContents.indexOf('D');
      if (bIndex !== -1) this.state.excludedHoles.push(bIndex);
      if (dIndex !== -1) this.state.excludedHoles.push(dIndex);
    }

    // 其他排除技能（减少1个错误洞口）
    const excludeOneSkills = ['breakthrough', 'exploit', 'identify', 'insight', 'rocket_boots', 'mind_read'];
    for (const skillId of excludeOneSkills) {
      if (hasSkill(currentPlayer, skillId) || this.anyPlayerHasSkill(skillId)) {
        // 随机排除一个非A的洞口
        const nonAIndexes = this.state.holeContents
          .map((c, i) => ({ content: c, index: i }))
          .filter(x => x.content !== 'A' && !this.state!.excludedHoles.includes(x.index));
        if (nonAIndexes.length > 0) {
          const randomIndex = Math.floor(Math.random() * nonAIndexes.length);
          this.state.excludedHoles.push(nonAIndexes[randomIndex].index);
        }
        break; // 只排除一个
      }
    }
  }

  /**
   * 应用多选技能
   */
  private applyMultiSelectSkills(): void {
    if (!this.state) return;
    this.state.canSelectMultiple = false;
    this.state.multiSelectCount = 1;

    const currentPlayer = this.state.players.find(p => p.isActive);
    if (!currentPlayer) return;

    // 借力打力、召唤学生会、一万伏特：可选2个洞口
    const doubleSelectSkills = ['leverage', 'redirect', 'student_council', 'students', 'thunderbolt'];
    for (const skillId of doubleSelectSkills) {
      if (hasSkill(currentPlayer, skillId)) {
        this.state.canSelectMultiple = true;
        this.state.multiSelectCount = 2;
        break;
      }
    }

    // 高压水炮：可对同一洞口攻击3次
    if (hasSkill(currentPlayer, 'hydro_pump')) {
      this.state.canSelectMultiple = true;
      this.state.multiSelectCount = 3;
    }
  }


  /**
   * 攻击洞口
   */
  attackHole(holeIndex: number): AttackResult {
    if (!this.state) {
      return this.createErrorResult('状态未初始化');
    }

    if (holeIndex < 0 || holeIndex > 4) {
      return this.createErrorResult('无效的洞口编号');
    }

    const currentPlayer = this.state.players.find(p => p.isActive);
    if (!currentPlayer) {
      return this.createErrorResult('没有出战玩家');
    }

    const content = this.state.holeContents[holeIndex] as HoleContent;
    const result: AttackResult = {
      success: true,
      holeIndex,
      content,
      contentName: HOLE_DESCRIPTIONS[content],
      damage: 0,
      message: '',
      healthChanges: [],
      bossHealthChange: 0,
      skillsTriggered: []
    };

    // 根据洞口内容执行效果
    switch (content) {
      case 'A': // 鼠鼠大王
        this.handleHitBoss(result, currentPlayer);
        break;
      case 'B': // 巧克力酱
        this.handleChocolate(result, currentPlayer);
        break;
      case 'C': // 囤货区
        this.handleFoodStorage(result);
        break;
      case 'D': // 狗
        this.handleHitDog(result, currentPlayer);
        break;
      case 'E': // 龟/猫
        this.handleHitOther(result, currentPlayer);
        break;
    }

    // 保存结果
    this.state.lastHoleResult = {
      holeIndex,
      content,
      damage: result.damage,
      message: result.message
    };

    // 检查战斗结束
    this.checkBattleEnd();

    return result;
  }

  /**
   * 命中BOSS
   */
  private handleHitBoss(result: AttackResult, player: BossPlayerState): void {
    if (!this.state) return;

    // 检查居合（秒杀）
    if (hasSkill(player, 'iai') && player.characterType === 'turtle') {
      this.state.bossHealth = 0;
      result.bossHealthChange = -this.state.bossMaxHealth;
      result.message = '【居合】发动！一刀秒杀鼠鼠大王！';
      const skill = player.skills.find(s => s.id === 'iai');
      result.skillsTriggered.push({
        name: '居合',
        effect: skill?.effect || '一刀秒杀BOSS',
        owner: 'turtle',
        ownerName: '乌龟'
      });
      return;
    }

    // 计算基础伤害
    let damage = 1;

    // 猫的天敌克制：+1
    if (player.characterType === 'cat') {
      damage += 1;
      result.skillsTriggered.push({
        name: '天敌克制',
        effect: '猫对鼠类BOSS伤害+1',
        owner: 'cat',
        ownerName: '猫咪'
      });
    }

    // 花瓶？哼！：乌龟基础伤害提升为4（在减半之前）
    if (player.characterType === 'turtle' && hasSkill(player, 'not_vase')) {
      damage = 4;
      const skill = player.skills.find(s => s.id === 'not_vase');
      result.skillsTriggered.push({
        name: skill?.name || '花瓶？哼！',
        effect: skill?.effect || '基础伤害提升为4',
        owner: 'turtle',
        ownerName: '乌龟'
      });
    }

    // 技能加成
    if (hasSkill(player, 'meow')) {
      damage += 1;
      const skill = player.skills.find(s => s.id === 'meow');
      result.skillsTriggered.push({
        name: skill?.name || '喵喵叫',
        effect: skill?.effect || '伤害+1',
        owner: player.characterType,
        ownerName: this.getCharacterName(player.characterType)
      });
    }
    if (hasSkill(player, 'mouse_killer') || hasSkill(player, 'mouse_hunter')) {
      damage += 1;
      const skill = player.skills.find(s => s.id === 'mouse_killer' || s.id === 'mouse_hunter');
      result.skillsTriggered.push({
        name: skill?.name || '鼠类克星',
        effect: skill?.effect || '伤害+1',
        owner: player.characterType,
        ownerName: this.getCharacterName(player.characterType)
      });
    }
    if (hasSkill(player, 'splash')) {
      damage += 1;
      const skill = player.skills.find(s => s.id === 'splash');
      result.skillsTriggered.push({
        name: skill?.name || '泼水',
        effect: skill?.effect || '伤害+1',
        owner: player.characterType,
        ownerName: this.getCharacterName(player.characterType)
      });
    }
    if (hasSkill(player, 'lava_cannon')) {
      damage = 2;
      const skill = player.skills.find(s => s.id === 'lava_cannon');
      result.skillsTriggered.push({
        name: skill?.name || '岩浆炮',
        effect: skill?.effect || '基础伤害变为2',
        owner: player.characterType,
        ownerName: this.getCharacterName(player.characterType)
      });
    }

    // 龟的师傅压制：伤害减半（最少1点）
    if (player.characterType === 'turtle') {
      damage = Math.max(1, Math.floor(damage * 0.5));
      result.skillsTriggered.push({
        name: '师傅压制',
        effect: '乌龟对鼠鼠大王伤害减半',
        owner: 'turtle',
        ownerName: '乌龟'
      });
    }

    this.state.bossHealth -= damage;
    result.damage = damage;
    result.bossHealthChange = -damage;
    result.message = `命中鼠鼠大王！造成 ${damage} 点伤害！`;
  }

  /**
   * 巧克力酱效果
   */
  private handleChocolate(result: AttackResult, _currentPlayer: BossPlayerState): void {
    if (!this.state) return;

    const cat = this.state.players.find(p => p.characterType === 'cat');
    const dog = this.state.players.find(p => p.characterType === 'dog');

    result.message = '踩到了巧克力酱！';

    // 猫受伤
    if (cat && cat.isAlive) {
      // 检查心如止水
      if (hasSkill(cat, 'calm_mind')) {
        const skill = cat.skills.find(s => s.id === 'calm_mind');
        result.skillsTriggered.push({
          name: skill?.name || '心如止水',
          effect: skill?.effect || '猫咪免疫巧克力酱伤害',
          owner: 'cat',
          ownerName: '猫咪'
        });
      } else {
        this.applyDamageToPlayer(cat, 1, result, '巧克力酱');
      }
    }

    // 狗受伤
    if (dog && dog.isAlive) {
      this.applyDamageToPlayer(dog, 1, result, '巧克力酱');
    }
  }

  /**
   * 囤货区效果
   */
  private handleFoodStorage(result: AttackResult): void {
    if (!this.state) return;

    result.message = '发现了囤货区！全体生命值 +1！';

    for (const player of this.state.players) {
      if (player.isAlive) {
        player.health = Math.min(player.health + 1, player.maxHealth);
        result.healthChanges.push({
          playerId: player.playerId,
          change: 1,
          reason: '囤货区'
        });
      }
    }
  }

  /**
   * 命中狗
   */
  private handleHitDog(result: AttackResult, currentPlayer: BossPlayerState): void {
    if (!this.state) return;

    const dog = this.state.players.find(p => p.characterType === 'dog');
    if (!dog) return;

    let damage = 1;
    if (currentPlayer.characterType === 'cat') damage += 1; // 天敌克制

    result.message = `误伤了被困的狗！`;
    this.applyDamageToPlayer(dog, damage, result, '误伤');
  }

  /**
   * 命中龟/猫
   */
  private handleHitOther(result: AttackResult, currentPlayer: BossPlayerState): void {
    if (!this.state) return;

    // 确定受害者：非出战的那个
    let victim: BossPlayerState | undefined;
    if (currentPlayer.characterType === 'cat') {
      victim = this.state.players.find(p => p.characterType === 'turtle');
    } else if (currentPlayer.characterType === 'turtle') {
      victim = this.state.players.find(p => p.characterType === 'cat');
    } else {
      // 狗出战时，随机选猫或龟
      const candidates = this.state.players.filter(
        p => (p.characterType === 'cat' || p.characterType === 'turtle') && p.isAlive
      );
      if (candidates.length > 0) {
        victim = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    if (!victim) return;

    let damage = 1;
    if (currentPlayer.characterType === 'cat') damage += 1;

    result.message = `误伤了队友！`;
    this.applyDamageToPlayer(victim, damage, result, '误伤');
  }


  /**
   * 对玩家造成伤害（包含技能检查）
   */
  private applyDamageToPlayer(
    target: BossPlayerState,
    baseDamage: number,
    result: AttackResult,
    source: string
  ): void {
    if (!this.state) return;

    let damage = baseDamage;
    let actualTarget = target;

    // 检查"百吨大王的守护"或"男强人"技能 - 所有伤害由一人承担
    const tankPlayer = this.state.players.find(p => 
      p.isAlive && (hasSkill(p, 'truck_guard') || hasSkill(p, 'strong_man'))
    );
    if (tankPlayer && tankPlayer.playerId !== target.playerId) {
      const skill = tankPlayer.skills.find(s => s.id === 'truck_guard' || s.id === 'strong_man');
      actualTarget = tankPlayer;
      result.skillsTriggered.push({
        name: skill?.name || '守护',
        effect: skill?.effect || '所有伤害由一人承担',
        owner: tankPlayer.characterType,
        ownerName: this.getCharacterName(tankPlayer.characterType)
      });
    }

    // 检查龟壳拆卸器（乌龟可以代替其他玩家承受伤害）
    if (actualTarget.characterType !== 'turtle') {
      const turtle = this.state.players.find(p => p.characterType === 'turtle' && p.isAlive);
      if (turtle && hasItem(turtle, 'shell_remover') && !isItemUsed(turtle, 'shell_remover')) {
        const item = turtle.items.find(i => i.id === 'shell_remover');
        // 乌龟代替承受伤害
        turtle.health -= damage;
        result.healthChanges.push({
          playerId: turtle.playerId,
          change: -damage,
          reason: '龟壳拆卸器（代替承受）'
        });
        result.skillsTriggered.push({
          name: item?.name || '龟壳拆卸器',
          effect: item?.effect || '用龟壳代替其他玩家承受伤害',
          owner: 'turtle',
          ownerName: '乌龟'
        });
        markItemUsed(turtle, 'shell_remover');
        
        // 检查乌龟是否阵亡
        if (turtle.health <= 0) {
          this.handlePlayerDeath(turtle, result);
        }
        return;
      }
    }

    // 检查刀风之盾（龟免疫猫带来的伤害）
    if (hasSkill(actualTarget, 'wind_shield') && actualTarget.characterType === 'turtle') {
      const currentPlayer = this.state.players.find(p => p.isActive);
      if (currentPlayer?.characterType === 'cat') {
        const skill = actualTarget.skills.find(s => s.id === 'wind_shield');
        result.skillsTriggered.push({
          name: skill?.name || '刀风之盾',
          effect: skill?.effect || '免疫猫带来的伤害',
          owner: 'turtle',
          ownerName: '乌龟'
        });
        return;
      }
    }

    // 检查概率减免技能
    // 舆论的力量：50%无效
    if (hasSkill(actualTarget, 'public_opinion') || hasSkill(actualTarget, 'fame')) {
      if (rollDice() <= 3) {
        const skill = actualTarget.skills.find(s => s.id === 'public_opinion' || s.id === 'fame');
        result.skillsTriggered.push({
          name: skill?.name || '舆论的力量',
          effect: skill?.effect || '50%概率使伤害无效',
          owner: actualTarget.characterType,
          ownerName: this.getCharacterName(actualTarget.characterType)
        });
        return;
      }
    }

    // 最高龟格：50%减免
    if (hasSkill(actualTarget, 'highest_honor')) {
      if (rollDice() <= 3) {
        const skill = actualTarget.skills.find(s => s.id === 'highest_honor');
        result.skillsTriggered.push({
          name: skill?.name || '最高龟格',
          effect: skill?.effect || '50%概率减免伤害',
          owner: actualTarget.characterType,
          ownerName: this.getCharacterName(actualTarget.characterType)
        });
        return;
      }
    }

    // 超音速急行：1/6命中
    if (hasSkill(actualTarget, 'supersonic')) {
      if (rollDice() !== 1) {
        const skill = actualTarget.skills.find(s => s.id === 'supersonic');
        result.skillsTriggered.push({
          name: skill?.name || '超音速急行',
          effect: skill?.effect || '5/6概率闪避攻击',
          owner: actualTarget.characterType,
          ownerName: this.getCharacterName(actualTarget.characterType)
        });
        return;
      }
    }

    // 碧落黄泉：50%吸收/50%转移
    if (hasSkill(actualTarget, 'heaven_hell')) {
      const skill = actualTarget.skills.find(s => s.id === 'heaven_hell');
      if (rollDice() <= 3) {
        actualTarget.health += damage * 2;
        result.healthChanges.push({
          playerId: actualTarget.playerId,
          change: damage * 2,
          reason: '碧落黄泉（吸收）'
        });
        result.skillsTriggered.push({
          name: skill?.name || '碧落黄泉',
          effect: '吸收伤害并转化为双倍生命',
          owner: actualTarget.characterType,
          ownerName: this.getCharacterName(actualTarget.characterType)
        });
        return;
      } else {
        this.state.bossHealth -= damage;
        result.bossHealthChange -= damage;
        result.skillsTriggered.push({
          name: skill?.name || '碧落黄泉',
          effect: '将伤害转移给BOSS',
          owner: actualTarget.characterType,
          ownerName: this.getCharacterName(actualTarget.characterType)
        });
        return;
      }
    }

    // 应用伤害
    actualTarget.health -= damage;
    result.healthChanges.push({
      playerId: actualTarget.playerId,
      change: -damage,
      reason: source
    });

    // 检查连锁效果
    // 五郎八卦棍：若猫对乌龟造成伤害，狗和BOSS受同等伤害
    if (hasSkill(actualTarget, 'staff') && actualTarget.characterType === 'turtle') {
      const currentPlayer = this.state.players.find(p => p.isActive);
      if (currentPlayer?.characterType === 'cat') {
        const skill = actualTarget.skills.find(s => s.id === 'staff');
        const dog = this.state.players.find(p => p.characterType === 'dog');
        if (dog && dog.isAlive) {
          dog.health -= damage;
          result.healthChanges.push({
            playerId: dog.playerId,
            change: -damage,
            reason: '五郎八卦棍'
          });
        }
        this.state.bossHealth -= damage;
        result.bossHealthChange -= damage;
        result.skillsTriggered.push({
          name: skill?.name || '五郎八卦棍',
          effect: skill?.effect || '猫对乌龟造成伤害时，狗和BOSS受同等伤害',
          owner: 'turtle',
          ownerName: '乌龟'
        });
      }
    }

    // 恃宠而骄：自己受伤时，所有人和BOSS受同等伤害
    if (hasSkill(actualTarget, 'spoiled')) {
      const skill = actualTarget.skills.find(s => s.id === 'spoiled');
      for (const player of this.state.players) {
        if (player.playerId !== actualTarget.playerId && player.isAlive) {
          player.health -= damage;
          result.healthChanges.push({
            playerId: player.playerId,
            change: -damage,
            reason: '恃宠而骄'
          });
        }
      }
      this.state.bossHealth -= damage;
      result.bossHealthChange -= damage;
      result.skillsTriggered.push({
        name: skill?.name || '恃宠而骄',
        effect: skill?.effect || '受伤时，所有人和BOSS受同等伤害',
        owner: actualTarget.characterType,
        ownerName: this.getCharacterName(actualTarget.characterType)
      });
    }

    // 五雷法：被击中时，其他所有人和BOSS -1
    if (hasSkill(actualTarget, 'five_thunder')) {
      const skill = actualTarget.skills.find(s => s.id === 'five_thunder');
      for (const player of this.state.players) {
        if (player.playerId !== actualTarget.playerId && player.isAlive) {
          player.health -= 1;
          result.healthChanges.push({
            playerId: player.playerId,
            change: -1,
            reason: '五雷法'
          });
        }
      }
      this.state.bossHealth -= 1;
      result.bossHealthChange -= 1;
      result.skillsTriggered.push({
        name: skill?.name || '五雷法',
        effect: skill?.effect || '被击中时，其他所有人和BOSS -1生命',
        owner: actualTarget.characterType,
        ownerName: this.getCharacterName(actualTarget.characterType)
      });
    }

    // 治愈系水枪：受伤时可增加随机队友1点生命值
    if (hasSkill(actualTarget, 'healing_water')) {
      const skill = actualTarget.skills.find(s => s.id === 'healing_water');
      // 找一个存活的队友（非自己）
      const teammates = this.state.players.filter(p => p.playerId !== actualTarget.playerId && p.isAlive);
      if (teammates.length > 0) {
        const randomTeammate = teammates[Math.floor(Math.random() * teammates.length)];
        randomTeammate.health = Math.min(randomTeammate.health + 1, randomTeammate.maxHealth);
        result.healthChanges.push({
          playerId: randomTeammate.playerId,
          change: 1,
          reason: '治愈系水枪'
        });
        result.skillsTriggered.push({
          name: skill?.name || '治愈系水枪',
          effect: skill?.effect || '受伤时增加队友1点生命值',
          owner: actualTarget.characterType,
          ownerName: this.getCharacterName(actualTarget.characterType)
        });
      }
    }

    // 检查阵亡
    if (actualTarget.health <= 0) {
      this.handlePlayerDeath(actualTarget, result);
    }
  }

  /**
   * 处理玩家阵亡
   */
  private handlePlayerDeath(player: BossPlayerState, result: AttackResult): void {
    // 检查免死技能
    // 忍者勋章：50%不死
    if (hasSkill(player, 'ninja_medal') && !isSkillUsed(player, 'ninja_medal')) {
      if (rollDice() <= 3) {
        player.health = 1;
        markSkillUsed(player, 'ninja_medal');
        const skill = player.skills.find(s => s.id === 'ninja_medal');
        result.skillsTriggered.push({
          name: skill?.name || '忍者勋章',
          effect: skill?.effect || '50%概率拒绝死亡，保留1点生命',
          owner: player.characterType,
          ownerName: this.getCharacterName(player.characterType)
        });
        return;
      }
    }

    // 竹蜻蜓：躲避一次致命伤害
    if (hasItem(player, 'bamboo_copter') && !isItemUsed(player, 'bamboo_copter')) {
      player.health = 1;
      markItemUsed(player, 'bamboo_copter');
      const item = player.items.find(i => i.id === 'bamboo_copter');
      result.skillsTriggered.push({
        name: item?.name || '竹蜻蜓',
        effect: item?.effect || '躲避一次致命伤害',
        owner: player.characterType,
        ownerName: this.getCharacterName(player.characterType)
      });
      return;
    }

    // 第二引擎：50%复活
    if (hasSkill(player, 'second_engine')) {
      if (rollDice() <= 3) {
        player.health = 20;
        const skill = player.skills.find(s => s.id === 'second_engine');
        result.skillsTriggered.push({
          name: skill?.name || '第二引擎',
          effect: skill?.effect || '50%概率复活并恢复20点生命',
          owner: player.characterType,
          ownerName: this.getCharacterName(player.characterType)
        });
        return;
      }
    }

    // 妻子登场：奇数+2循环
    if (hasSkill(player, 'wife_appear')) {
      let roll = rollDice();
      let triggered = false;
      while (roll % 2 === 1) {
        player.health += 2;
        triggered = true;
        roll = rollDice();
      }
      if (triggered) {
        const skill = player.skills.find(s => s.id === 'wife_appear');
        result.skillsTriggered.push({
          name: skill?.name || '妻子登场',
          effect: skill?.effect || '掷骰奇数时+2生命，可连续触发',
          owner: player.characterType,
          ownerName: this.getCharacterName(player.characterType)
        });
      }
      if (player.health > 0) {
        return;
      }
    }

    // 确认阵亡
    player.isAlive = false;
    player.isActive = false;
  }

  /**
   * 检查战斗结束
   */
  private checkBattleEnd(): void {
    if (!this.state) return;

    // BOSS死亡
    if (this.state.bossHealth <= 0) {
      this.state.isComplete = true;
      this.state.result = 'win';
      this.state.phase = 'victory';
      
      // 检查"吐天纳地"技能 - 若未减少生命值，则生命值 +10
      for (const player of this.state.players) {
        if (hasSkill(player, 'heaven_earth') && player.isAlive) {
          // 检查玩家是否在战斗中受到过伤害（通过比较当前生命值和初始生命值）
          // 由于我们没有记录初始生命值，这里简化为检查当前生命值是否等于最大生命值
          if (player.health >= player.maxHealth) {
            player.health += 10;
            console.log(`【吐天纳地】：${this.getCharacterName(player.characterType)} 未受伤，生命值 +10`);
          }
        }
      }
      return;
    }

    // 全员阵亡
    const allDead = this.state.players.every(p => !p.isAlive);
    if (allDead) {
      this.state.isComplete = true;
      this.state.result = 'lose';
      this.state.ending = 'ending_0';
      this.state.phase = 'defeat';
      return;
    }

    // 当前玩家阵亡，需要换人
    const currentPlayer = this.state.players.find(p => p.isActive);
    if (currentPlayer && !currentPlayer.isAlive) {
      this.state.phase = 'select_player';
      this.state.currentPlayerId = null;
    }
  }

  /**
   * 进入下一回合
   */
  nextRound(): void {
    if (!this.state) return;
    this.state.round++;
    this.shuffleHoles();
    this.state.phase = 'select_hole';
    this.state.lastHoleResult = null;
  }

  // 辅助方法
  private getPlayerName(playerId: string): string {
    const player = this.state?.players.find(p => p.playerId === playerId);
    return player ? `玩家${player.characterType}` : '未知玩家';
  }

  private getCharacterName(characterType: string): string {
    const names: Record<string, string> = {
      cat: '猫咪',
      dog: '狗狗',
      turtle: '乌龟'
    };
    return names[characterType] || '未知';
  }

  private anyPlayerHasSkill(skillId: string): boolean {
    return this.state?.players.some(p => hasSkill(p, skillId)) ?? false;
  }

  private createErrorResult(message: string): AttackResult {
    return {
      success: false,
      holeIndex: -1,
      content: 'A',
      contentName: '',
      damage: 0,
      message,
      healthChanges: [],
      bossHealthChange: 0,
      skillsTriggered: []
    };
  }

  /**
   * 序列化状态
   */
  serializeState(): any {
    if (!this.state) return null;
    return {
      ...this.state,
      // 隐藏洞口内容（玩家不可见）
      holeContents: this.state.holeContents.map(() => '?'),
      // 包含玩家技能信息供客户端显示
      players: this.state.players.map(p => ({
        playerId: p.playerId,
        characterType: p.characterType,
        health: p.health,
        maxHealth: p.maxHealth,
        isAlive: p.isAlive,
        isActive: p.isActive,
        skills: p.skills.map(s => ({ id: s.id, name: s.name, grade: s.grade, effect: s.effect })),
        items: p.items.map(i => ({ id: i.id, name: i.name, grade: i.grade, effect: i.effect }))
      }))
    };
  }

  /**
   * 获取可见的排除洞口信息
   */
  getExcludedHolesInfo(): { index: number; reason: string }[] {
    if (!this.state) return [];
    return this.state.excludedHoles.map(index => ({
      index,
      reason: `洞口 ${index + 1} 已被技能排除`
    }));
  }
}

// 默认导出
export default MouseKingManager;
