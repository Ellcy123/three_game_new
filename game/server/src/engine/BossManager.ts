/**
 * BOSS战管理器
 * 管理三个BOSS战：鼠鼠大王、百变小鹦、死神
 */

import { StoryReward } from './StoryManager';

// 玩家技能/道具信息
export interface PlayerSkillInfo {
  playerId: string;
  characterType: 'cat' | 'dog' | 'turtle';
  skills: StoryReward[];
  items: StoryReward[];
  forms?: StoryReward[];
  transformerForm?: string | null; // 'truck' | 'car' | 'cannon'
}

// BOSS战玩家状态
export interface BossPlayerState {
  playerId: string;
  characterType: 'cat' | 'dog' | 'turtle';
  health: number;
  maxHealth: number;
  isAlive: boolean;
  isActive: boolean; // 当前出战
  skills: StoryReward[];
  items: StoryReward[];
  usedSkills: string[]; // 已使用的一次性技能
  usedItems: string[]; // 已使用的一次性道具
  transformerForm?: string | null; // 变形金刚形态
  reviveCount?: number; // 复活次数（超级跑车+纳米核心用）
}

// BOSS战基础状态
export interface BossState {
  bossId: 'mouse_king' | 'parrot' | 'death';
  bossName: string;
  bossHealth: number;
  bossMaxHealth: number;
  phase: string;
  round: number;
  players: BossPlayerState[];
  isComplete: boolean;
  result: 'pending' | 'win' | 'lose';
  ending?: string;
}

// 鼠鼠大王特有状态
export interface MouseKingState extends BossState {
  bossId: 'mouse_king';
  holeContents: string[]; // ['A', 'B', 'C', 'D', 'E'] 随机分配到洞口1-5
  currentPlayerId: string | null;
  lastHoleResult: {
    holeIndex: number;
    content: string;
    damage: number;
    message: string;
  } | null;
  excludedHoles: number[]; // 被技能排除的洞口
  canSelectMultiple: boolean; // 是否可以选多个洞口
  multiSelectCount: number; // 可选洞口数量
}

// 百变小鹦特有状态
export interface ParrotState extends BossState {
  bossId: 'parrot';
  currentQuestion: number;
  questionPool: Question[];
  usedQuestions: number[];
  playerAnswers: Map<string, string>;
  lastQuestionResult: {
    question: Question;
    answers: { playerId: string; answer: string }[];
    isConsistent: boolean;
    damage: number;
  } | null;
}

// 死神特有状态
export interface DeathState extends BossState {
  bossId: 'death';
  chips: number;
  targetChips: number; // 1000
  lastDiceResult: number;
  lastDoubleDiceResult: number;
  currentBet: number;
  roundRules: DeathRoundRule[];
}

// 题目接口
export interface Question {
  id: number;
  text: string;
  options: { key: string; text: string }[];
}

// 死神轮次规则
export interface DeathRoundRule {
  round: number;
  name: string;
  description: string;
  odds: number | number[];
  type: 'bet' | 'auto';
}

// 技能触发结果
export interface SkillTriggerResult {
  triggered: boolean;
  skillName: string;
  message: string;
  effect: any;
}

// 工具函数：投骰子
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// 工具函数：洗牌
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 检查玩家是否有某技能
export function hasSkill(player: BossPlayerState, skillId: string): boolean {
  return player.skills.some(s => s.id === skillId);
}

// 检查玩家是否有某道具
export function hasItem(player: BossPlayerState, itemId: string): boolean {
  return player.items.some(i => i.id === itemId);
}

// 检查技能是否已使用
export function isSkillUsed(player: BossPlayerState, skillId: string): boolean {
  return player.usedSkills.includes(skillId);
}

// 检查道具是否已使用
export function isItemUsed(player: BossPlayerState, itemId: string): boolean {
  return player.usedItems.includes(itemId);
}

// 标记技能已使用
export function markSkillUsed(player: BossPlayerState, skillId: string): void {
  if (!player.usedSkills.includes(skillId)) {
    player.usedSkills.push(skillId);
  }
}

// 标记道具已使用
export function markItemUsed(player: BossPlayerState, itemId: string): void {
  if (!player.usedItems.includes(itemId)) {
    player.usedItems.push(itemId);
  }
}
