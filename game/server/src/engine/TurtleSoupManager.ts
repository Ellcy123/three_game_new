/**
 * 海龟汤（记忆回溯）关卡管理器
 */

export interface TurtleSoupConfig {
  levelId: string;
  name: string;
  freeQuestionsPerPlayer: number;
  openingStory: string[];
  memoryIntro: string[];
  storyText: string;
  keywords: KeywordConfig[];
  finalQuestions: FinalQuestionsConfig;
  animalOptions: AnimalOption[];
  revelation: RevelationConfig;
  transition: string[];
}

export interface KeywordConfig {
  id: string;
  text: string;
  belongsTo: string;
  questions: QuestionConfig[];
}

export interface QuestionConfig {
  id: string;
  text: string;
  answer: boolean;
  value: number;
}

export interface FinalQuestionsConfig {
  deathCount: {
    question: string;
    options: string[];
    correctAnswer: string;
    wrongPenalty: number;
  };
  isHuman: {
    question: string;
    options: string[];
    correctAnswer: string;
    wrongPenalty: number;
  };
  identity: {
    question: string;
    correctAnswers: string[];
    wrongPenalty: number;
  };
}

export interface AnimalOption {
  id: string;
  name: string;
  icon: string;
}

export interface RevelationConfig {
  title: string;
  subtitle: string;
  stories: StoryReveal[];
  epilogue: string[];
}

export interface StoryReveal {
  character: string;
  title: string;
  highlight: string;
  content: string[];
  deathCause: string;
}

export interface PlayerSoupState {
  playerId: string;
  freeQuestions: number;
  usedQuestions: number;
  extraQuestions: number;
  selectedAnimal: string | null;
}

export interface KeywordState {
  id: string;
  text: string;
  isAsked: boolean;
  selectedQuestion: string | null;
  answer: boolean | null;
  askedBy: string | null;
}

export type SoupPhase = 
  | 'opening'
  | 'memory_intro'
  | 'rules'
  | 'questioning'
  | 'confirm_submit'
  | 'question_death_count'
  | 'question_is_human'
  | 'question_identity'
  | 'identity_reveal'  // 新增：显示身份判定结果
  | 'revelation_intro'
  | 'revelation_turtle'
  | 'revelation_dog'
  | 'revelation_cat'
  | 'revelation_epilogue'
  | 'transition'
  | 'complete';

export interface TurtleSoupState {
  phase: SoupPhase;
  storyIndex: number;
  players: PlayerSoupState[];
  keywords: KeywordState[];
  currentQuestionerId: string | null;
  answers: {
    deathCount: string | null;
    isHuman: string | null;
    identities: Map<string, string>;
  };
  results: {
    deathCountCorrect: boolean | null;
    isHumanCorrect: boolean | null;
    identityResults: Map<string, boolean>;
  };
  healthChanges: Map<string, number>;
}

export class TurtleSoupManager {
  private config: TurtleSoupConfig | null = null;
  private state: TurtleSoupState | null = null;

  initialize(config: TurtleSoupConfig, playerIds: string[]): TurtleSoupState {
    this.config = config;

    const players: PlayerSoupState[] = playerIds.map(id => ({
      playerId: id,
      freeQuestions: config.freeQuestionsPerPlayer,
      usedQuestions: 0,
      extraQuestions: 0,
      selectedAnimal: null
    }));

    const keywords: KeywordState[] = config.keywords.map(kw => ({
      id: kw.id,
      text: kw.text,
      isAsked: false,
      selectedQuestion: null,
      answer: null,
      askedBy: null
    }));

    this.state = {
      phase: 'opening',
      storyIndex: 0,
      players,
      keywords,
      currentQuestionerId: null,
      answers: {
        deathCount: null,
        isHuman: null,
        identities: new Map()
      },
      results: {
        deathCountCorrect: null,
        isHumanCorrect: null,
        identityResults: new Map()
      },
      healthChanges: new Map()
    };

    return this.state;
  }

  getState(): TurtleSoupState | null {
    return this.state;
  }

  getConfig(): TurtleSoupConfig | null {
    return this.config;
  }

  nextStory(): boolean {
    if (!this.state || !this.config) return false;

    const maxIndex = this.getMaxStoryIndex();
    if (this.state.storyIndex < maxIndex - 1) {
      this.state.storyIndex++;
      return true;
    }
    return false;
  }

  private getMaxStoryIndex(): number {
    if (!this.config || !this.state) return 0;
    
    switch (this.state.phase) {
      case 'opening':
        return this.config.openingStory.length;
      case 'memory_intro':
        return this.config.memoryIntro.length;
      case 'revelation_epilogue':
        return this.config.revelation.epilogue.length;
      case 'transition':
        return this.config.transition.length;
      default:
        return 1;
    }
  }

  nextPhase(): TurtleSoupState | null {
    if (!this.state) return null;

    const phaseOrder: SoupPhase[] = [
      'opening',
      'memory_intro',
      'rules',
      'questioning',
      'confirm_submit',
      'question_death_count',
      'question_is_human',
      'question_identity',
      'identity_reveal',  // 新增：显示身份判定结果
      'revelation_intro',
      'revelation_turtle',
      'revelation_dog',
      'revelation_cat',
      'revelation_epilogue',
      'complete'  // 跳过transition，直接进入complete
    ];

    const currentIndex = phaseOrder.indexOf(this.state.phase);
    if (currentIndex < phaseOrder.length - 1) {
      this.state.phase = phaseOrder[currentIndex + 1];
      this.state.storyIndex = 0;
    }

    return this.state;
  }

  setPhase(phase: SoupPhase): void {
    if (this.state) {
      this.state.phase = phase;
      this.state.storyIndex = 0;
    }
  }

  askQuestion(playerId: string, keywordId: string, questionId: string): {
    success: boolean;
    message: string;
    answer?: boolean;
    healthCost?: number;
  } {
    if (!this.state || !this.config) {
      return { success: false, message: '游戏状态错误' };
    }

    const keyword = this.state.keywords.find(k => k.id === keywordId);
    if (!keyword) {
      return { success: false, message: '关键词不存在' };
    }

    if (keyword.isAsked) {
      return { success: false, message: '该关键词已被提问过' };
    }

    const keywordConfig = this.config.keywords.find(k => k.id === keywordId);
    if (!keywordConfig) {
      return { success: false, message: '关键词配置错误' };
    }

    const question = keywordConfig.questions.find(q => q.id === questionId);
    if (!question) {
      return { success: false, message: '问题不存在' };
    }

    const player = this.state.players.find(p => p.playerId === playerId);
    if (!player) {
      return { success: false, message: '玩家不存在' };
    }

    let healthCost = 0;
    if (player.freeQuestions > 0) {
      player.freeQuestions--;
    } else {
      healthCost = 1;
      player.extraQuestions++;
    }
    player.usedQuestions++;

    keyword.isAsked = true;
    keyword.selectedQuestion = questionId;
    keyword.answer = question.answer;
    keyword.askedBy = playerId;

    return {
      success: true,
      message: question.answer ? 'YES' : 'NO',
      answer: question.answer,
      healthCost
    };
  }

  submitDeathCount(answer: string): { correct: boolean; penalty: number } {
    if (!this.state || !this.config) {
      return { correct: false, penalty: 0 };
    }

    this.state.answers.deathCount = answer;
    const correct = answer === this.config.finalQuestions.deathCount.correctAnswer;
    this.state.results.deathCountCorrect = correct;

    const penalty = correct ? 0 : this.config.finalQuestions.deathCount.wrongPenalty;
    if (!correct) {
      this.state.players.forEach(p => {
        const current = this.state!.healthChanges.get(p.playerId) || 0;
        this.state!.healthChanges.set(p.playerId, current - penalty);
      });
    }

    return { correct, penalty };
  }

  submitIsHuman(answer: string): { correct: boolean; penalty: number } {
    if (!this.state || !this.config) {
      return { correct: false, penalty: 0 };
    }

    this.state.answers.isHuman = answer;
    const correct = answer === this.config.finalQuestions.isHuman.correctAnswer;
    this.state.results.isHumanCorrect = correct;

    const penalty = correct ? 0 : this.config.finalQuestions.isHuman.wrongPenalty;
    if (!correct) {
      this.state.players.forEach(p => {
        const current = this.state!.healthChanges.get(p.playerId) || 0;
        this.state!.healthChanges.set(p.playerId, current - penalty);
      });
    }

    return { correct, penalty };
  }

  submitIdentity(playerId: string, animalId: string): void {
    if (!this.state) return;
    
    this.state.answers.identities.set(playerId, animalId);
    const player = this.state.players.find(p => p.playerId === playerId);
    if (player) {
      player.selectedAnimal = animalId;
    }
  }

  allIdentitiesSubmitted(): boolean {
    if (!this.state) return false;
    return this.state.players.every(p => p.selectedAnimal !== null);
  }

  judgeIdentities(playerCharacterMap: Map<string, string>): Map<string, boolean> {
    if (!this.state || !this.config) return new Map();

    const results = new Map<string, boolean>();
    
    this.state.players.forEach(player => {
      const selectedAnimal = player.selectedAnimal;
      const actualCharacter = playerCharacterMap.get(player.playerId);
      const correct = selectedAnimal === actualCharacter;
      
      results.set(player.playerId, correct);
      this.state!.results.identityResults.set(player.playerId, correct);

      if (!correct) {
        const penalty = this.config!.finalQuestions.identity.wrongPenalty;
        const current = this.state!.healthChanges.get(player.playerId) || 0;
        this.state!.healthChanges.set(player.playerId, current - penalty);
      }
    });

    return results;
  }

  getHealthChanges(): Map<string, number> {
    return this.state?.healthChanges || new Map();
  }

  getPlayerFreeQuestions(playerId: string): number {
    const player = this.state?.players.find(p => p.playerId === playerId);
    return player?.freeQuestions || 0;
  }

  serializeState(): any {
    if (!this.state || !this.config) return null;

    const identities: Record<string, string> = {};
    this.state.answers.identities.forEach((v, k) => {
      identities[k] = v;
    });

    const identityResults: Record<string, boolean> = {};
    this.state.results.identityResults.forEach((v, k) => {
      identityResults[k] = v;
    });

    const healthChanges: Record<string, number> = {};
    this.state.healthChanges.forEach((v, k) => {
      healthChanges[k] = v;
    });

    return {
      phase: this.state.phase,
      storyIndex: this.state.storyIndex,
      players: this.state.players,
      keywords: this.state.keywords,
      currentQuestionerId: this.state.currentQuestionerId,
      answers: {
        deathCount: this.state.answers.deathCount,
        isHuman: this.state.answers.isHuman,
        identities
      },
      results: {
        deathCountCorrect: this.state.results.deathCountCorrect,
        isHumanCorrect: this.state.results.isHumanCorrect,
        identityResults
      },
      healthChanges,
      config: {
        storyText: this.config.storyText,
        keywords: this.config.keywords,
        finalQuestions: this.config.finalQuestions,
        animalOptions: this.config.animalOptions,
        openingStory: this.config.openingStory,
        memoryIntro: this.config.memoryIntro,
        revelation: this.config.revelation,
        transition: this.config.transition
      }
    };
  }
}
