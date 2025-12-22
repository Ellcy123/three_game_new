/**
 * 故事管理器
 * 管理第三幕的个人剧情线
 */

export interface StoryReward {
  type: 'skill' | 'item' | 'form' | 'none';
  id?: string;
  name: string;
  grade: string;
  effect: string;
  healthBonus?: number;
  specialEffect?: string; // 'maxHealth1' 等特殊效果
  used?: boolean; // 道具/技能是否已使用
}

export interface StoryOption {
  text: string;
  story: string[];
  reward?: StoryReward;
  rewards?: StoryReward[]; // 支持多奖励
}

export interface StoryChoice {
  title: string;
  story: string[];
  options: Record<string, StoryOption>;
}

export interface PlayerStoryState {
  playerId: string;
  characterType: 'cat' | 'dog' | 'turtle';
  branch: string | null; // 'A' | 'B' | 'C'
  branchName: string | null; // '功夫猫' | '招财猫' | '机器猫'
  currentChoiceIndex: number; // 0, 1, 2
  choices: string[]; // 选择记录 ['A', 'B', 'C']
  skills: StoryReward[];
  items: StoryReward[];
  forms: StoryReward[]; // 形态记录（变形金刚用）
  transformerForm: string | null; // 'truck' | 'car' | 'cannon'
  completed: boolean;
}

export interface StoryState {
  phase: 'intro' | 'turn_intro' | 'branch_select' | 'branch_story' | 'choice' | 'choice_result' | 'ending' | 'summary' | 'next_player';
  currentPlayerIndex: number; // 0=猫, 1=狗, 2=龟
  playerStates: PlayerStoryState[];
  currentStoryTexts: string[];
  currentStoryIndex: number;
  currentChoice: StoryChoice | null;
  selectedOption: string | null;
}

export class StoryManager {
  private state: StoryState | null = null;

  /**
   * 初始化故事状态
   */
  initialize(players: { id: string; characterType: string }[]): StoryState {
    const playerStates: PlayerStoryState[] = players.map(p => ({
      playerId: p.id,
      characterType: p.characterType as 'cat' | 'dog' | 'turtle',
      branch: null,
      branchName: null,
      currentChoiceIndex: 0,
      choices: [],
      skills: [],
      items: [],
      forms: [],
      transformerForm: null,
      completed: false
    }));

    // 按角色顺序排序：猫 -> 狗 -> 龟
    playerStates.sort((a, b) => {
      const order = { cat: 0, dog: 1, turtle: 2 };
      return order[a.characterType] - order[b.characterType];
    });

    this.state = {
      phase: 'intro',
      currentPlayerIndex: 0,
      playerStates,
      currentStoryTexts: [],
      currentStoryIndex: 0,
      currentChoice: null,
      selectedOption: null
    };

    return this.state;
  }

  getState(): StoryState | null {
    return this.state;
  }

  getCurrentPlayer(): PlayerStoryState | null {
    if (!this.state) return null;
    return this.state.playerStates[this.state.currentPlayerIndex];
  }

  /**
   * 根据角色类型获取玩家状态
   */
  getPlayerByCharacterType(characterType: string): PlayerStoryState | null {
    if (!this.state) return null;
    return this.state.playerStates.find(p => p.characterType === characterType) || null;
  }

  /**
   * 设置当前剧情文本
   */
  setStoryTexts(texts: string[]): void {
    if (!this.state) return;
    this.state.currentStoryTexts = texts;
    this.state.currentStoryIndex = 0;
  }

  /**
   * 下一段剧情
   */
  nextStory(): boolean {
    if (!this.state) return false;
    if (this.state.currentStoryIndex < this.state.currentStoryTexts.length - 1) {
      this.state.currentStoryIndex++;
      return true;
    }
    return false;
  }

  /**
   * 设置阶段
   */
  setPhase(phase: StoryState['phase']): void {
    if (!this.state) return;
    this.state.phase = phase;
  }

  /**
   * 选择分支
   */
  selectBranch(branch: 'A' | 'B' | 'C'): void {
    if (!this.state) return;
    const player = this.getCurrentPlayer();
    if (!player) return;

    player.branch = branch;
    
    // 根据角色类型设置分支名称
    const branchNamesByCharacter: Record<string, Record<string, string>> = {
      cat: { A: '功夫猫', B: '招财猫', C: '机器猫' },
      dog: { A: '哮天犬', B: '变形金刚', C: '自主创业' },
      turtle: { A: '忍者龟', B: '水炮龟', C: '金龟婿' }
    };
    
    player.branchName = branchNamesByCharacter[player.characterType]?.[branch] || branch;
  }

  /**
   * 设置当前选择点
   */
  setCurrentChoice(choice: StoryChoice): void {
    if (!this.state) return;
    this.state.currentChoice = choice;
    this.state.selectedOption = null;
  }

  /**
   * 做出选择
   */
  makeChoice(option: string): StoryOption | null {
    if (!this.state || !this.state.currentChoice) return null;
    
    const player = this.getCurrentPlayer();
    if (!player) return null;

    const selectedOption = this.state.currentChoice.options[option];
    if (!selectedOption) return null;

    this.state.selectedOption = option;
    player.choices.push(option);

    // 处理多奖励（rewards数组）
    if (selectedOption.rewards && selectedOption.rewards.length > 0) {
      for (const reward of selectedOption.rewards) {
        this.applyReward(player, reward);
      }
    }
    // 处理单奖励（向后兼容）
    else if (selectedOption.reward) {
      this.applyReward(player, selectedOption.reward);
    }

    return selectedOption;
  }

  /**
   * 应用单个奖励
   */
  private applyReward(player: PlayerStoryState, reward: StoryReward): void {
    if (reward.type === 'skill') {
      player.skills.push(reward);
    } else if (reward.type === 'item') {
      player.items.push(reward);
    } else if (reward.type === 'form') {
      player.forms.push(reward);
      // 记录变形金刚形态
      if (reward.id === 'truck' || reward.id === 'car' || reward.id === 'cannon') {
        player.transformerForm = reward.id;
      }
    }
  }

  /**
   * 进入下一个选择点
   */
  nextChoice(): boolean {
    if (!this.state) return false;
    const player = this.getCurrentPlayer();
    if (!player) return false;

    player.currentChoiceIndex++;
    this.state.currentChoice = null;
    this.state.selectedOption = null;

    // 检查是否完成所有选择（3个选择点）
    if (player.currentChoiceIndex >= 3) {
      player.completed = true;
      return false; // 没有更多选择
    }
    return true; // 还有更多选择
  }

  /**
   * 进入下一个玩家
   */
  nextPlayer(): boolean {
    if (!this.state) return false;
    
    this.state.currentPlayerIndex++;
    
    // 检查是否所有玩家都完成
    if (this.state.currentPlayerIndex >= this.state.playerStates.length) {
      return false; // 所有玩家完成
    }

    // 重置状态
    this.state.currentChoice = null;
    this.state.selectedOption = null;
    this.state.currentStoryTexts = [];
    this.state.currentStoryIndex = 0;

    return true;
  }

  /**
   * 获取玩家获得的所有奖励
   */
  getPlayerRewards(playerId: string): { skills: StoryReward[]; items: StoryReward[]; forms: StoryReward[]; transformerForm: string | null } | null {
    if (!this.state) return null;
    const player = this.state.playerStates.find(p => p.playerId === playerId);
    if (!player) return null;
    return { 
      skills: player.skills, 
      items: player.items,
      forms: player.forms,
      transformerForm: player.transformerForm
    };
  }

  /**
   * 计算生命值加成
   */
  calculateHealthBonus(playerId: string): number {
    if (!this.state) return 0;
    const player = this.state.playerStates.find(p => p.playerId === playerId);
    if (!player) return 0;

    let bonus = 0;
    for (const skill of player.skills) {
      if (skill.healthBonus) bonus += skill.healthBonus;
    }
    for (const item of player.items) {
      if (item.healthBonus) bonus += item.healthBonus;
    }
    for (const form of player.forms) {
      if (form.healthBonus) bonus += form.healthBonus;
    }
    return bonus;
  }

  /**
   * 获取玩家的变形金刚形态
   */
  getTransformerForm(playerId: string): string | null {
    if (!this.state) return null;
    const player = this.state.playerStates.find(p => p.playerId === playerId);
    return player?.transformerForm || null;
  }

  /**
   * 检查玩家是否有特殊效果
   */
  hasSpecialEffect(playerId: string, effectId: string): boolean {
    if (!this.state) return false;
    const player = this.state.playerStates.find(p => p.playerId === playerId);
    if (!player) return false;
    
    // 检查形态的特殊效果
    for (const form of player.forms) {
      if (form.specialEffect === effectId) return true;
    }
    // 检查技能的特殊效果
    for (const skill of player.skills) {
      if (skill.specialEffect === effectId) return true;
    }
    return false;
  }

  /**
   * 序列化状态
   */
  serializeState(): any {
    if (!this.state) return null;
    return {
      phase: this.state.phase,
      currentPlayerIndex: this.state.currentPlayerIndex,
      playerStates: this.state.playerStates,
      currentStoryTexts: this.state.currentStoryTexts,
      currentStoryIndex: this.state.currentStoryIndex,
      currentChoice: this.state.currentChoice,
      selectedOption: this.state.selectedOption
    };
  }

  cleanup(): void {
    this.state = null;
  }
}