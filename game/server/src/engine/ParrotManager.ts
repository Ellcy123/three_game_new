/**
 * 百变小鹦 BOSS战管理器
 * 第二关BOSS - 三人团体出战，默契测试
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

// 题目类型
interface Question {
  id: number;
  text: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

// 玩家答案
interface PlayerAnswer {
  playerId: string;
  answer: string; // 'A', 'B', 'C'
  timestamp: number;
}

// 回合结果
export interface RoundResult {
  questionId: number;
  questionText: string;
  answers: { playerId: string; characterType: string; answer: string; optionText: string }[];
  isConsistent: boolean;
  bossHealthChange: number;
  playerHealthChanges: { playerId: string; change: number; reason: string }[];
  skillsTriggered: string[];
  message: string;
}

// 百变小鹦状态
export interface ParrotState {
  bossId: string;
  bossName: string;
  bossHealth: number;
  bossMaxHealth: number;
  phase: 'intro' | 'question' | 'waiting' | 'reveal' | 'result' | 'victory' | 'defeat';
  round: number;
  players: BossPlayerState[];
  isComplete: boolean;
  result: 'pending' | 'win' | 'lose';
  ending?: string;
  currentQuestion: Question | null;
  usedQuestionIds: number[];
  playerAnswers: Map<string, PlayerAnswer>;
  answeredPlayers: string[];
  lastRoundResult: RoundResult | null;
  answerTimeLimit: number;
}

export class ParrotManager {
  private state: ParrotState | null = null;
  private questions: Question[] = [];

  /**
   * 初始化百变小鹦战斗
   */
  initialize(playerInfos: PlayerSkillInfo[], questionPool: Question[]): ParrotState {
    this.questions = questionPool;

    const players: BossPlayerState[] = playerInfos.map(p => ({
      playerId: p.playerId,
      characterType: p.characterType,
      health: 8,
      maxHealth: 10,
      isAlive: true,
      isActive: true, // 团体战，所有人都active
      skills: p.skills,
      items: p.items,
      usedSkills: [],
      usedItems: []
    }));

    this.state = {
      bossId: 'parrot',
      bossName: '百变小鹦',
      bossHealth: 4,
      bossMaxHealth: 4,
      phase: 'intro',
      round: 0,
      players,
      isComplete: false,
      result: 'pending',
      currentQuestion: null,
      usedQuestionIds: [],
      playerAnswers: new Map(),
      answeredPlayers: [],
      lastRoundResult: null,
      answerTimeLimit: 30
    };

    // 检查放大缩小灯
    this.checkShrinkItem();

    return this.state;
  }

  getState(): ParrotState | null {
    return this.state;
  }


  /**
   * 检查放大缩小灯道具
   */
  private checkShrinkItem(): void {
    if (!this.state) return;
    for (const player of this.state.players) {
      if (hasItem(player, 'shrink_light') && !isItemUsed(player, 'shrink_light')) {
        this.state.bossHealth = Math.floor(this.state.bossHealth * 0.5);
        markItemUsed(player, 'shrink_light');
        break;
      }
    }
  }

  /**
   * 检查是否应该跳过本关卡
   */
  checkSkipBattle(): { skip: boolean; reason: string } | null {
    if (!this.state) return null;
    // 检查任意门等跳关道具
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
    this.state.phase = 'question';
    this.state.round = 1;
    this.nextQuestion();
  }

  /**
   * 选择下一题
   */
  nextQuestion(): Question | null {
    if (!this.state) return null;

    // 过滤已用题目
    const availableQuestions = this.questions.filter(
      q => !this.state!.usedQuestionIds.includes(q.id)
    );

    // 如果题目用完，重置
    if (availableQuestions.length === 0) {
      this.state.usedQuestionIds = [];
      return this.nextQuestion();
    }

    // 随机选择
    const index = Math.floor(Math.random() * availableQuestions.length);
    const question = availableQuestions[index];

    this.state.currentQuestion = question;
    this.state.usedQuestionIds.push(question.id);
    this.state.playerAnswers = new Map();
    this.state.answeredPlayers = [];
    this.state.phase = 'question';

    return question;
  }

  /**
   * 玩家提交答案
   */
  submitAnswer(playerId: string, answer: string): { success: boolean; message: string } {
    if (!this.state) return { success: false, message: '状态未初始化' };
    if (this.state.phase !== 'question' && this.state.phase !== 'waiting') {
      return { success: false, message: '当前不是答题阶段' };
    }

    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player) return { success: false, message: '玩家不存在' };
    if (!player.isAlive) return { success: false, message: '玩家已阵亡' };

    if (this.state.answeredPlayers.includes(playerId)) {
      return { success: false, message: '已经提交过答案' };
    }

    // 记录答案
    this.state.playerAnswers.set(playerId, {
      playerId,
      answer: answer.toUpperCase(),
      timestamp: Date.now()
    });
    this.state.answeredPlayers.push(playerId);

    // 检查是否所有存活玩家都已答题
    const alivePlayers = this.state.players.filter(p => p.isAlive);
    if (this.state.answeredPlayers.length >= alivePlayers.length) {
      this.state.phase = 'reveal';
    } else {
      this.state.phase = 'waiting';
    }

    return { success: true, message: '答案已提交' };
  }

  /**
   * 检查是否所有玩家都已答题
   */
  allPlayersAnswered(): boolean {
    if (!this.state) return false;
    const alivePlayers = this.state.players.filter(p => p.isAlive);
    return this.state.answeredPlayers.length >= alivePlayers.length;
  }


  /**
   * 揭示答案并结算
   */
  revealAndSettle(): RoundResult {
    if (!this.state || !this.state.currentQuestion) {
      return this.createErrorResult('状态未初始化');
    }

    const question = this.state.currentQuestion;
    const result: RoundResult = {
      questionId: question.id,
      questionText: question.text,
      answers: [],
      isConsistent: false,
      bossHealthChange: 0,
      playerHealthChanges: [],
      skillsTriggered: [],
      message: ''
    };

    // 收集所有答案
    const answers: string[] = [];
    for (const player of this.state.players) {
      if (!player.isAlive) continue;
      
      const playerAnswer = this.state.playerAnswers.get(player.playerId);
      const answer = playerAnswer?.answer || this.getRandomAnswer(question.options.length);
      answers.push(answer);

      // 获取选项文本
      const optionIndex = answer.charCodeAt(0) - 65; // A=0, B=1, C=2
      const optionText = question.options[optionIndex] || answer;

      result.answers.push({
        playerId: player.playerId,
        characterType: player.characterType,
        answer,
        optionText
      });
    }

    // 判断答案是否一致
    result.isConsistent = answers.length > 0 && answers.every(a => a === answers[0]);

    if (result.isConsistent) {
      // 答案一致，伤害BOSS
      this.handleConsistentAnswer(result);
    } else {
      // 答案不一致，伤害玩家
      this.handleInconsistentAnswer(result);
    }

    // 保存结果
    this.state.lastRoundResult = result;
    this.state.phase = 'result';

    // 检查战斗结束
    this.checkBattleEnd();

    return result;
  }

  /**
   * 处理答案一致的情况
   */
  private handleConsistentAnswer(result: RoundResult): void {
    if (!this.state) return;

    let damage = 1; // 固定伤害

    // 检查粒子炮技能（唯一可增加伤害的技能）
    for (const player of this.state.players) {
      if (hasSkill(player, 'particle_cannon')) {
        damage += 1;
        result.skillsTriggered.push('粒子炮（伤害+1）');
        break;
      }
    }

    this.state.bossHealth -= damage;
    result.bossHealthChange = -damage;
    result.message = `✨ 答案一致！默契满分！百变小鹦 -${damage}`;
  }

  /**
   * 处理答案不一致的情况
   */
  private handleInconsistentAnswer(result: RoundResult): void {
    if (!this.state) return;

    result.message = '💔 默契不足...全体生命值 -1';

    // 检查丘比特之箭（免疫所有伤害）
    let isImmune = false;
    for (const player of this.state.players) {
      if (hasItem(player, 'cupid_arrow') && !isItemUsed(player, 'cupid_arrow')) {
        isImmune = true;
        result.skillsTriggered.push('丘比特之箭（免疫伤害）');
        break;
      }
    }

    if (isImmune) {
      result.message = '💔 默契不足...但丘比特之箭保护了你们！';
      return;
    }

    // 对所有存活玩家造成伤害
    for (const player of this.state.players) {
      if (!player.isAlive) continue;
      this.applyDamageToPlayer(player, 1, result, '默契不足');
    }
  }


  /**
   * 对玩家造成伤害（包含技能检查）
   */
  private applyDamageToPlayer(
    target: BossPlayerState,
    baseDamage: number,
    result: RoundResult,
    source: string
  ): void {
    if (!this.state) return;

    // 检查龟壳拆卸器（代替承伤）
    const turtle = this.state.players.find(p => p.characterType === 'turtle' && p.isAlive);
    if (turtle && turtle.playerId !== target.playerId && hasSkill(turtle, 'shell_remover')) {
      // 龟可以选择代替承伤（这里自动触发）
      result.skillsTriggered.push(`龟壳拆卸器（代替${target.characterType}承伤）`);
      target = turtle;
    }

    // 检查概率减免技能
    if (hasSkill(target, 'public_opinion')) {
      if (rollDice() <= 3) {
        result.skillsTriggered.push('舆论的力量（伤害无效）');
        return;
      }
    }

    if (hasSkill(target, 'highest_honor')) {
      if (rollDice() <= 3) {
        result.skillsTriggered.push('最高龟格（伤害减免）');
        return;
      }
    }

    if (hasSkill(target, 'supersonic')) {
      if (rollDice() !== 1) {
        result.skillsTriggered.push('超音速急行（闪避）');
        return;
      }
    }

    // 碧落黄泉
    if (hasSkill(target, 'heaven_hell')) {
      if (rollDice() <= 3) {
        target.health += baseDamage * 2;
        result.playerHealthChanges.push({
          playerId: target.playerId,
          change: baseDamage * 2,
          reason: '碧落黄泉（吸收）'
        });
        result.skillsTriggered.push('碧落黄泉（伤害吸收）');
        return;
      } else {
        this.state.bossHealth -= baseDamage;
        result.bossHealthChange -= baseDamage;
        result.skillsTriggered.push('碧落黄泉（转移给BOSS）');
        return;
      }
    }

    // 应用伤害
    target.health -= baseDamage;
    result.playerHealthChanges.push({
      playerId: target.playerId,
      change: -baseDamage,
      reason: source
    });

    // 检查阵亡
    if (target.health <= 0) {
      this.handlePlayerDeath(target, result);
    }
  }

  /**
   * 处理玩家阵亡
   */
  private handlePlayerDeath(player: BossPlayerState, result: RoundResult): void {
    // 检查免死技能
    if (hasSkill(player, 'ninja_medal') && !isSkillUsed(player, 'ninja_medal')) {
      if (rollDice() <= 3) {
        player.health = 1;
        markSkillUsed(player, 'ninja_medal');
        result.skillsTriggered.push('忍者勋章（拒绝死亡）');
        return;
      }
    }

    if (hasItem(player, 'bamboo_copter') && !isItemUsed(player, 'bamboo_copter')) {
      player.health = 1;
      markItemUsed(player, 'bamboo_copter');
      result.skillsTriggered.push('竹蜻蜓（躲避致命）');
      return;
    }

    if (hasSkill(player, 'second_engine')) {
      if (rollDice() <= 3) {
        player.health = 20;
        result.skillsTriggered.push('第二引擎（复活）');
        return;
      }
    }

    if (hasSkill(player, 'wife_appear')) {
      let roll = rollDice();
      while (roll % 2 === 1) {
        player.health += 2;
        result.skillsTriggered.push('妻子登场（奇数+2）');
        roll = rollDice();
      }
      if (player.health > 0) {
        return;
      }
    }

    // 确认阵亡
    player.isAlive = false;
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
      return;
    }

    // 全员阵亡
    const allDead = this.state.players.every(p => !p.isAlive);
    if (allDead) {
      this.state.isComplete = true;
      this.state.result = 'lose';
      this.state.ending = 'ending_1';
      this.state.phase = 'defeat';
      return;
    }
  }

  /**
   * 进入下一回合
   */
  nextRound(): void {
    if (!this.state) return;
    if (this.state.isComplete) return;
    
    this.state.round++;
    this.nextQuestion();
  }

  /**
   * 获取随机答案（超时时使用）
   */
  private getRandomAnswer(optionCount: number): string {
    const options = ['A', 'B', 'C'].slice(0, optionCount);
    return options[Math.floor(Math.random() * options.length)];
  }

  private createErrorResult(message: string): RoundResult {
    return {
      questionId: -1,
      questionText: '',
      answers: [],
      isConsistent: false,
      bossHealthChange: 0,
      playerHealthChanges: [],
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
      playerAnswers: Object.fromEntries(this.state.playerAnswers),
      // 在答题阶段隐藏其他玩家的答案
      answeredPlayers: this.state.answeredPlayers,
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
}

export default ParrotManager;
