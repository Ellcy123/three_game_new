/**
 * 死神 BOSS战管理器
 * 第三关BOSS（最终关卡）- 赌博机制
 */

import {
  BossPlayerState,
  PlayerSkillInfo,
  rollDice,
  hasSkill,
  hasItem,
  isSkillUsed,
  isItemUsed,
  markSkillUsed,
  markItemUsed
} from './BossManager';

// 轮次配置
interface RoundConfig {
  round: number;
  name: string;
  description: string;
  rule: string;
  type: string;
  odds?: number;
  choices?: string[];
  oddsMap?: Record<string, number>;
  noBet?: boolean;
  targetNumbers?: number[];
  targetNumber?: number;
  deathNumber?: number;
  penaltyAmount?: number;
  rewardAmount?: number;
  attempts?: number;
}

// 轮次结果
export interface RoundResult {
  round: number;
  roundName: string;
  bet: number;
  choice?: string;
  diceResults: number[];
  isWin: boolean;
  chipsChange: number;
  skillsTriggered: string[];
  message: string;
  isDeath?: boolean;
}

// 死神状态
export interface DeathState {
  bossId: string;
  bossName: string;
  phase: 'intro' | 'betting' | 'rolling' | 'result' | 'victory' | 'defeat';
  round: number;
  maxRounds: number;
  chips: number;
  targetChips: number;
  players: BossPlayerState[];
  isComplete: boolean;
  result: 'pending' | 'win' | 'lose';
  ending?: string;
  currentRoundConfig: RoundConfig | null;
  lastDiceResult: number;
  lastDoubleDiceResult: number;
  currentBet: number;
  currentChoice: string | null;
  lastRoundResult: RoundResult | null;
  roundHistory: RoundResult[];
  // 三人投掷用
  threeRollResults: number[];
  threeRollCurrentPlayer: number;
  // 双骰对子用
  doubleDiceAttempts: { dice1: number; dice2: number }[];
}

export class DeathManager {
  private state: DeathState | null = null;
  private roundConfigs: RoundConfig[] = [];

  /**
   * 初始化死神战斗
   */
  initialize(playerInfos: PlayerSkillInfo[], config: any): DeathState {
    this.roundConfigs = config.rounds;

    const players: BossPlayerState[] = playerInfos.map(p => ({
      playerId: p.playerId,
      characterType: p.characterType,
      health: 8,
      maxHealth: 10,
      isAlive: true,
      isActive: true,
      skills: p.skills,
      items: p.items,
      usedSkills: [],
      usedItems: [],
      transformerForm: p.transformerForm || null,
      reviveCount: 0
    }));

    // 计算初始筹码 = 三人生命值总和
    let initialChips = players.reduce((sum, p) => sum + p.health, 0);

    // 应用开局技能
    const skillBonuses: string[] = [];
    for (const player of players) {
      if (hasSkill(player, 'business_genius')) {
        initialChips += 30;
        skillBonuses.push('商业鬼才(+30)');
      }
      if (hasSkill(player, 'tank_importance')) {
        initialChips += 20;
        skillBonuses.push('坦克的重要性(+20)');
      }
      if (hasSkill(player, 'particle_beam')) {
        // 粒子光束炮：减少目标筹码200（在后面设置targetChips时处理）
        skillBonuses.push('粒子光束炮(目标-200)');
      }
      // 卡尔斯纳米核心 - 重型卡车形态：+15生命值
      if (hasItem(player, 'nano_core') && player.transformerForm === 'truck') {
        initialChips += 15;
        skillBonuses.push('卡尔斯纳米核心·重型卡车(+15)');
      }
    }

    // 计算目标筹码（默认1000，粒子光束炮减少200）
    let targetChips = config.targetChips || 1000;
    for (const player of players) {
      if (hasSkill(player, 'particle_beam')) {
        targetChips -= 200;
      }
    }

    this.state = {
      bossId: 'death',
      bossName: '死神',
      phase: 'intro',
      round: 0,
      maxRounds: config.maxRounds || 15,
      chips: initialChips,
      targetChips: targetChips,
      players,
      isComplete: false,
      result: 'pending',
      currentRoundConfig: null,
      lastDiceResult: 0,
      lastDoubleDiceResult: 0,
      currentBet: 0,
      currentChoice: null,
      lastRoundResult: null,
      roundHistory: [],
      threeRollResults: [],
      threeRollCurrentPlayer: 0,
      doubleDiceAttempts: []
    };

    return this.state;
  }

  getState(): DeathState | null {
    return this.state;
  }

  /**
   * 检查是否应该跳过本关卡
   */
  checkSkipBattle(): { skip: boolean; reason: string } | null {
    if (!this.state) return null;
    for (const player of this.state.players) {
      if (hasItem(player, 'anywhere_door')) {
        return { skip: true, reason: '【任意门】：跳过本关卡！' };
      }
    }
    return { skip: false, reason: '' };
  }

  /**
   * 开始战斗
   */
  startBattle(): void {
    if (!this.state) return;
    this.state.round = 1;
    this.state.currentRoundConfig = this.roundConfigs[0];
    this.state.phase = this.state.currentRoundConfig.noBet ? 'rolling' : 'betting';
  }

  /**
   * 设置下注金额
   */
  setBet(amount: number): { success: boolean; message: string } {
    if (!this.state) return { success: false, message: '状态未初始化' };
    if (this.state.phase !== 'betting') return { success: false, message: '当前不是下注阶段' };
    if (amount < 0 || amount > this.state.chips) {
      return { success: false, message: `下注金额必须在0到${this.state.chips}之间` };
    }
    this.state.currentBet = amount;
    return { success: true, message: '下注成功' };
  }

  /**
   * 设置选择
   */
  setChoice(choice: string): { success: boolean; message: string } {
    if (!this.state || !this.state.currentRoundConfig) {
      return { success: false, message: '状态未初始化' };
    }
    const config = this.state.currentRoundConfig;
    if (config.choices && !config.choices.includes(choice)) {
      return { success: false, message: '无效的选择' };
    }
    this.state.currentChoice = choice;
    return { success: true, message: '选择成功' };
  }

  /**
   * 确认下注并进入投掷阶段
   */
  confirmBet(): { success: boolean; message: string } {
    if (!this.state) return { success: false, message: '状态未初始化' };
    if (this.state.phase !== 'betting') return { success: false, message: '当前不是下注阶段' };
    
    const config = this.state.currentRoundConfig;
    if (config?.choices && !this.state.currentChoice) {
      return { success: false, message: '请先选择' };
    }
    
    this.state.phase = 'rolling';
    return { success: true, message: '进入投掷阶段' };
  }


  /**
   * 执行投掷并结算
   */
  executeRoll(): RoundResult {
    if (!this.state || !this.state.currentRoundConfig) {
      return this.createErrorResult('状态未初始化');
    }

    const config = this.state.currentRoundConfig;
    const result: RoundResult = {
      round: this.state.round,
      roundName: config.name,
      bet: this.state.currentBet,
      choice: this.state.currentChoice || undefined,
      diceResults: [],
      isWin: false,
      chipsChange: 0,
      skillsTriggered: [],
      message: ''
    };

    // 根据轮次类型执行不同逻辑
    switch (config.type) {
      case 'bigSmall':
        this.executeBigSmall(result, config);
        break;
      case 'compare':
        this.executeCompare(result, config, false);
        break;
      case 'compareWithEqual':
        this.executeCompare(result, config, true);
        break;
      case 'oddEven':
        this.executeOddEven(result, config);
        break;
      case 'targetNumbers':
        this.executeTargetNumbers(result, config);
        break;
      case 'targetNumber':
        this.executeTargetNumber(result, config);
        break;
      case 'penalty':
        this.executePenalty(result, config);
        break;
      case 'reward':
        this.executeReward(result, config);
        break;
      case 'threeRolls':
        this.executeThreeRolls(result, config);
        break;
      case 'death':
        this.executeDeath(result, config);
        break;
      case 'doubleDicePair':
        this.executeDoubleDicePair(result, config);
        break;
      case 'doubleDiceCompare':
        this.executeDoubleDiceCompare(result, config);
        break;
      case 'final':
        this.executeFinal(result, config);
        break;
    }

    // 保存结果
    this.state.lastRoundResult = result;
    this.state.roundHistory.push(result);
    this.state.phase = 'result';

    // 检查游戏结束
    this.checkGameEnd();

    return result;
  }

  /**
   * 第1轮：大小
   */
  private executeBigSmall(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    let dice = this.checkCustomDice(1);
    if (dice === 0) dice = rollDice();
    
    result.diceResults = [dice];
    this.state.lastDiceResult = dice;

    const isBig = dice >= 4;
    result.isWin = (this.state.currentChoice === '大' && isBig) || 
                   (this.state.currentChoice === '小' && !isBig);

    this.settleResult(result, config.odds || 2);
  }

  /**
   * 第2-4轮：比较
   */
  private executeCompare(result: RoundResult, config: RoundConfig, hasEqual: boolean): void {
    if (!this.state) return;

    let dice = this.checkCustomDice(this.state.round);
    if (dice === 0) dice = rollDice();
    
    result.diceResults = [dice];
    const lastDice = this.state.lastDiceResult;
    this.state.lastDiceResult = dice;

    if (this.state.currentChoice === '大') {
      result.isWin = dice > lastDice;
    } else if (this.state.currentChoice === '小') {
      result.isWin = dice < lastDice;
    } else if (this.state.currentChoice === '等于' && hasEqual) {
      result.isWin = dice === lastDice;
    }

    const odds = config.oddsMap?.[this.state.currentChoice || ''] || config.odds || 2;
    this.settleResult(result, odds);
  }

  /**
   * 第5轮：奇偶
   */
  private executeOddEven(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const dice = rollDice();
    result.diceResults = [dice];
    this.state.lastDiceResult = dice;

    const isOdd = dice % 2 === 1;
    result.isWin = (this.state.currentChoice === '奇数' && isOdd) || 
                   (this.state.currentChoice === '偶数' && !isOdd);

    this.settleResult(result, config.odds || 2);
  }

  /**
   * 第6/9轮：指定点数（多个）
   */
  private executeTargetNumbers(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const dice = rollDice();
    result.diceResults = [dice];
    this.state.lastDiceResult = dice;

    result.isWin = config.targetNumbers?.includes(dice) || false;
    this.settleResult(result, config.odds || 5);
  }

  /**
   * 第12轮：指定点数（单个）
   */
  private executeTargetNumber(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const dice = rollDice();
    result.diceResults = [dice];
    this.state.lastDiceResult = dice;

    result.isWin = dice === config.targetNumber;
    this.settleResult(result, config.odds || 20);
  }

  /**
   * 第7轮：惩罚轮
   */
  private executePenalty(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const dice = rollDice();
    result.diceResults = [dice];
    this.state.lastDiceResult = dice;

    const isOdd = dice % 2 === 1;
    if (isOdd) {
      const penalty = config.penaltyAmount || 50;
      this.state.chips -= penalty;
      result.chipsChange = -penalty;
      result.message = `骰子点数${dice}（奇数），筹码 -${penalty}`;
    } else {
      result.message = `骰子点数${dice}（偶数），无事发生`;
    }
    result.isWin = !isOdd;
  }

  /**
   * 第8轮：奖励轮
   */
  private executeReward(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const dice = rollDice();
    result.diceResults = [dice];
    this.state.lastDiceResult = dice;

    const isOdd = dice % 2 === 1;
    if (isOdd) {
      const reward = config.rewardAmount || 50;
      this.state.chips += reward;
      result.chipsChange = reward;
      result.message = `骰子点数${dice}（奇数），筹码 +${reward}`;
    } else {
      result.message = `骰子点数${dice}（偶数），无事发生`;
    }
    result.isWin = isOdd;
  }

  /**
   * 第10轮：三人投掷
   */
  private executeThreeRolls(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const dice1 = rollDice();
    const dice2 = rollDice();
    const dice3 = rollDice();
    
    result.diceResults = [dice1, dice2, dice3];
    this.state.lastDiceResult = dice3;

    // 检查是否有重复
    const noRepeat = dice1 !== dice2 && dice2 !== dice3 && dice1 !== dice3;
    result.isWin = noRepeat;

    if (noRepeat) {
      result.message = `三人投出 ${dice1}, ${dice2}, ${dice3}，均不重复！`;
    } else {
      result.message = `三人投出 ${dice1}, ${dice2}, ${dice3}，有重复...`;
    }

    this.settleResult(result, config.odds || 10);
  }

  /**
   * 第11轮：死亡轮
   */
  private executeDeath(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const dice = rollDice();
    result.diceResults = [dice];
    this.state.lastDiceResult = dice;

    if (dice === config.deathNumber) {
      // 检查挽救技能
      if (this.checkDeathSave(result)) {
        result.isWin = true;
        result.message = `骰子点数${dice}，但技能触发，逃过一劫！`;
      } else {
        result.isDeath = true;
        result.isWin = false;
        result.message = `💀 骰子点数${dice}...直接死亡！`;
        this.state.isComplete = true;
        this.state.result = 'lose';
        this.state.ending = 'ending_1'; // 疯人院结局（已击败鼠鼠大王但未通关死神）
        this.state.phase = 'defeat';
        return;
      }
    } else {
      result.isWin = true;
      result.message = `骰子点数${dice}，安全通过！`;
    }

    this.settleResult(result, config.odds || 2);
  }

  /**
   * 第13轮：双骰对子
   */
  private executeDoubleDicePair(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const attempts = config.attempts || 3;
    let hasPair = false;
    let lastSum = 0;

    for (let i = 0; i < attempts; i++) {
      const dice1 = rollDice();
      const dice2 = rollDice();
      result.diceResults.push(dice1, dice2);
      lastSum = dice1 + dice2;

      if (dice1 === dice2) {
        hasPair = true;
        result.message = `第${i + 1}次：${dice1} + ${dice2} = 对子！`;
        break;
      }
    }

    this.state.lastDoubleDiceResult = lastSum;
    result.isWin = hasPair;

    if (!hasPair) {
      result.message = `三次都没有对子...`;
    }

    this.settleResult(result, config.odds || 10);
  }

  /**
   * 第14轮：双骰比较
   */
  private executeDoubleDiceCompare(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const dice1 = rollDice();
    const dice2 = rollDice();
    const sum = dice1 + dice2;
    
    result.diceResults = [dice1, dice2];
    const lastSum = this.state.lastDoubleDiceResult;

    if (this.state.currentChoice === '大') {
      result.isWin = sum > lastSum;
    } else if (this.state.currentChoice === '小') {
      result.isWin = sum < lastSum;
    } else if (this.state.currentChoice === '等于') {
      result.isWin = sum === lastSum;
    }

    result.message = `上轮点数和${lastSum}，本轮${dice1}+${dice2}=${sum}`;
    this.state.lastDoubleDiceResult = sum;

    const odds = config.oddsMap?.[this.state.currentChoice || ''] || 2;
    this.settleResult(result, odds);
  }

  /**
   * 第15轮：最终轮
   */
  private executeFinal(result: RoundResult, config: RoundConfig): void {
    if (!this.state) return;

    const dice = rollDice();
    result.diceResults = [dice];
    this.state.lastDiceResult = dice;

    if (this.state.currentChoice === '>=4') {
      result.isWin = dice >= 4;
    } else if (this.state.currentChoice === '>=5') {
      result.isWin = dice >= 5;
    } else if (this.state.currentChoice === '=6') {
      result.isWin = dice === 6;
    }

    const odds = config.oddsMap?.[this.state.currentChoice || ''] || 2;
    this.settleResult(result, odds);
  }


  /**
   * 结算结果
   */
  private settleResult(result: RoundResult, odds: number): void {
    if (!this.state) return;

    // 检查失败挽救
    if (!result.isWin) {
      result.isWin = this.checkFailureSave(result);
    }

    if (result.isWin) {
      let winAmount = result.bet * (odds - 1);

      // 最强忍者证明：胜利奖励翻倍
      for (const player of this.state.players) {
        if (hasSkill(player, 'strongest_ninja_proof')) {
          winAmount *= 2;
          result.skillsTriggered.push('最强忍者证明（奖励翻倍）');
          break;
        }
      }

      this.state.chips += winAmount;
      result.chipsChange = winAmount;
      if (!result.message) {
        result.message = `胜利！+${winAmount}`;
      }
    } else {
      this.state.chips -= result.bet;
      result.chipsChange = -result.bet;
      if (!result.message) {
        result.message = `失败... -${result.bet}`;
      }
    }
  }

  /**
   * 检查定制骰子技能
   * 返回0表示需要玩家选择，返回1-6表示自动使用该点数
   */
  private checkCustomDice(round: number): number {
    if (!this.state) return 0;

    // 第1轮：奥义・疾风骤雨
    if (round === 1) {
      for (const player of this.state.players) {
        if (hasSkill(player, 'storm_fury') && !isSkillUsed(player, 'storm_fury')) {
          // 返回0表示需要玩家选择点数
          return 0;
        }
      }
    }

    // 第3轮：卡尔斯纳米核心（巨型炮台形态）
    if (round === 3) {
      for (const player of this.state.players) {
        if (hasItem(player, 'nano_core') && player.transformerForm === 'cannon' && !isItemUsed(player, 'nano_core')) {
          // 返回0表示需要玩家选择点数
          return 0;
        }
      }
    }

    return 0;
  }

  /**
   * 检查是否需要玩家选择骰子点数
   */
  needsDiceSelection(): { needed: boolean; skillName: string; playerId: string } | null {
    if (!this.state) return null;

    const round = this.state.round;

    // 第1轮：奥义・疾风骤雨
    if (round === 1) {
      for (const player of this.state.players) {
        if (hasSkill(player, 'storm_fury') && !isSkillUsed(player, 'storm_fury')) {
          return { needed: true, skillName: '奥义・疾风骤雨', playerId: player.playerId };
        }
      }
    }

    // 第3轮：卡尔斯纳米核心（巨型炮台形态）
    if (round === 3) {
      for (const player of this.state.players) {
        if (hasItem(player, 'nano_core') && player.transformerForm === 'cannon' && !isItemUsed(player, 'nano_core')) {
          return { needed: true, skillName: '卡尔斯纳米核心·巨型炮台', playerId: player.playerId };
        }
      }
    }

    return null;
  }

  /**
   * 设置玩家选择的骰子点数
   */
  setCustomDice(diceValue: number): { success: boolean; message: string } {
    if (!this.state) return { success: false, message: '状态未初始化' };
    if (diceValue < 1 || diceValue > 6) return { success: false, message: '骰子点数必须在1-6之间' };

    const round = this.state.round;

    // 第1轮：奥义・疾风骤雨
    if (round === 1) {
      for (const player of this.state.players) {
        if (hasSkill(player, 'storm_fury') && !isSkillUsed(player, 'storm_fury')) {
          markSkillUsed(player, 'storm_fury');
          this.state.lastDiceResult = diceValue;
          return { success: true, message: `奥义・疾风骤雨：骰子点数设定为 ${diceValue}` };
        }
      }
    }

    // 第3轮：卡尔斯纳米核心（巨型炮台形态）
    if (round === 3) {
      for (const player of this.state.players) {
        if (hasItem(player, 'nano_core') && player.transformerForm === 'cannon' && !isItemUsed(player, 'nano_core')) {
          markItemUsed(player, 'nano_core');
          this.state.lastDiceResult = diceValue;
          return { success: true, message: `卡尔斯纳米核心：骰子点数设定为 ${diceValue}` };
        }
      }
    }

    return { success: false, message: '当前轮次没有可用的骰子定制技能' };
  }

  /**
   * 检查失败挽救技能
   */
  private checkFailureSave(result: RoundResult): boolean {
    if (!this.state) return false;

    // 灵魂互换手镯
    for (const player of this.state.players) {
      if (hasItem(player, 'soul_swap_bracelet') && !isItemUsed(player, 'soul_swap_bracelet')) {
        markItemUsed(player, 'soul_swap_bracelet');
        result.skillsTriggered.push('灵魂互换手镯（失败不算）');
        return true;
      }
    }

    // 精准打击
    for (const player of this.state.players) {
      if (hasSkill(player, 'precise_strike') && !isSkillUsed(player, 'precise_strike') && this.state.chips >= 50) {
        this.state.chips -= 50;
        markSkillUsed(player, 'precise_strike');
        result.skillsTriggered.push('精准打击（消耗50筹码重投）');
        // 重新投掷
        const newDice = rollDice();
        result.diceResults.push(newDice);
        // 简化处理：重投后50%成功
        if (rollDice() <= 3) {
          return true;
        }
      }
    }

    // 超音速急行
    for (const player of this.state.players) {
      if (hasSkill(player, 'supersonic')) {
        if (rollDice() <= 3) {
          result.skillsTriggered.push('超音速急行（50%失败不算）');
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 检查死亡挽救技能
   */
  private checkDeathSave(result: RoundResult): boolean {
    if (!this.state) return false;

    // 灵魂互换手镯
    for (const player of this.state.players) {
      if (hasItem(player, 'soul_swap_bracelet') && !isItemUsed(player, 'soul_swap_bracelet')) {
        markItemUsed(player, 'soul_swap_bracelet');
        result.skillsTriggered.push('灵魂互换手镯（逆转死亡）');
        return true;
      }
    }

    // 精准打击
    for (const player of this.state.players) {
      if (hasSkill(player, 'precise_strike') && !isSkillUsed(player, 'precise_strike') && this.state.chips >= 50) {
        this.state.chips -= 50;
        markSkillUsed(player, 'precise_strike');
        const newDice = rollDice();
        result.diceResults.push(newDice);
        if (newDice !== 4) {
          result.skillsTriggered.push(`精准打击（重投${newDice}，逃脱）`);
          return true;
        }
        result.skillsTriggered.push(`精准打击（重投${newDice}，还是4...）`);
      }
    }

    // 超音速急行
    for (const player of this.state.players) {
      if (hasSkill(player, 'supersonic')) {
        if (rollDice() <= 3) {
          result.skillsTriggered.push('超音速急行（闪避死亡）');
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 检查游戏结束
   */
  private checkGameEnd(): void {
    if (!this.state) return;
    if (this.state.isComplete) return;

    // 胜利检查 - 进入结局2（我也永远爱你）
    if (this.state.chips >= this.state.targetChips) {
      this.state.isComplete = true;
      this.state.result = 'win';
      this.state.ending = 'ending_2'; // 真结局：我也永远爱你
      this.state.phase = 'victory';
      return;
    }

    // 失败检查（筹码归零）- 进入结局1（疯人院）
    if (this.state.chips <= 0) {
      if (this.checkRevivalSkills()) {
        return; // 复活成功
      }
      this.state.isComplete = true;
      this.state.result = 'lose';
      this.state.ending = 'ending_1'; // 疯人院结局（已击败鼠鼠大王但未通关死神）
      this.state.phase = 'defeat';
      return;
    }

    // 第15轮结束检查
    if (this.state.round >= this.state.maxRounds) {
      this.state.isComplete = true;
      if (this.state.chips >= this.state.targetChips) {
        this.state.result = 'win';
        this.state.ending = 'ending_2'; // 真结局：我也永远爱你
        this.state.phase = 'victory';
      } else {
        this.state.result = 'lose';
        this.state.ending = 'ending_1'; // 疯人院结局
        this.state.phase = 'defeat';
      }
    }
  }

  /**
   * 检查复活技能
   */
  private checkRevivalSkills(): boolean {
    if (!this.state) return false;

    // 机械躯体
    for (const player of this.state.players) {
      if (hasSkill(player, 'mechanical_body') && !isSkillUsed(player, 'mechanical_body')) {
        this.state.chips = 20;
        markSkillUsed(player, 'mechanical_body');
        return true;
      }
    }

    // 啸天
    for (const player of this.state.players) {
      if (hasSkill(player, 'howling')) {
        if (rollDice() <= 3) {
          this.state.chips = 100;
          return true;
        }
      }
    }

    // 第二引擎
    for (const player of this.state.players) {
      if (hasSkill(player, 'second_engine')) {
        if (rollDice() <= 3) {
          let reviveHealth = 20;
          // 卡尔斯纳米核心 - 超级跑车形态：每复活1次+10生命值
          if (hasItem(player, 'nano_core') && player.transformerForm === 'car') {
            player.reviveCount = (player.reviveCount || 0) + 1;
            reviveHealth += player.reviveCount * 10;
          }
          this.state.chips = reviveHealth;
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 进入下一回合
   */
  nextRound(): void {
    if (!this.state) return;
    if (this.state.isComplete) return;

    this.state.round++;
    if (this.state.round > this.state.maxRounds) {
      this.checkGameEnd();
      return;
    }

    this.state.currentRoundConfig = this.roundConfigs[this.state.round - 1];
    this.state.currentBet = 0;
    this.state.currentChoice = null;
    this.state.phase = this.state.currentRoundConfig.noBet ? 'rolling' : 'betting';
  }

  private createErrorResult(message: string): RoundResult {
    return {
      round: -1,
      roundName: '',
      bet: 0,
      diceResults: [],
      isWin: false,
      chipsChange: 0,
      skillsTriggered: [],
      message
    };
  }

  /**
   * 序列化状态
   */
  serializeState(): any {
    if (!this.state) return null;
    return {
      ...this.state,
      players: this.state.players.map(p => ({
        playerId: p.playerId,
        characterType: p.characterType,
        health: p.health,
        maxHealth: p.maxHealth,
        isAlive: p.isAlive,
        skills: p.skills.map(s => ({ id: s.id, name: s.name, grade: s.grade, effect: s.effect })),
        items: p.items.map(i => ({ id: i.id, name: i.name, grade: i.grade, effect: i.effect }))
      }))
    };
  }

  /**
   * 重新进行上一次判定（灵魂互换手镯）
   */
  rerollLastBet(): void {
    if (!this.state || !this.state.lastRoundResult) return;
    
    // 重新投掷骰子
    const newDice = rollDice();
    this.state.lastDiceResult = newDice;
    
    // 重新计算结果
    const config = this.state.currentRoundConfig;
    if (config) {
      // 简化处理：重投后重新判定
      this.state.phase = 'rolling';
    }
  }

  /**
   * 强制胜利（海龟汤）
   */
  forceVictory(): void {
    if (!this.state) return;
    this.state.isComplete = true;
    this.state.result = 'win';
    this.state.ending = 'ending_2';
    this.state.phase = 'victory';
  }
}

export default DeathManager;
