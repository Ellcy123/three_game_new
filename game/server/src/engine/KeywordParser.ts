import { KeywordCombination } from '../../../shared/src/types/game';

/** 同义词配置类型 */
interface SynonymConfig {
  characters: Record<string, string[]>;
  items: Record<string, string[]>;
}

/** 玩家名字映射 */
interface PlayerNameMapping {
  playerId: string;
  customName: string;
  characterType: string; // 'cat' | 'dog' | 'turtle'
}

/**
 * 关键词解析器
 * 负责解析玩家输入的关键词组合，支持同义词识别和玩家名字识别
 */
export class KeywordParser {
  private synonymMap: Map<string, string> = new Map();
  private playerNameMap: Map<string, string> = new Map(); // customName -> characterType
  
  constructor(config: SynonymConfig) {
    this.buildSynonymMap(config);
  }

  /**
   * 设置玩家名字映射
   * 将玩家自定义名字映射到角色类型
   */
  setPlayerNames(players: PlayerNameMapping[]): void {
    this.playerNameMap.clear();
    for (const player of players) {
      if (player.customName) {
        this.playerNameMap.set(player.customName.toLowerCase(), player.characterType);
      }
    }
  }

  /**
   * 构建同义词映射表
   */
  private buildSynonymMap(config: SynonymConfig): void {
    // 处理角色同义词
    for (const [standard, synonyms] of Object.entries(config.characters)) {
      for (const synonym of synonyms) {
        this.synonymMap.set(synonym.toLowerCase(), standard);
      }
      // 标准词也映射到自己
      this.synonymMap.set(standard.toLowerCase(), standard);
    }
    
    // 处理道具同义词
    for (const [standard, synonyms] of Object.entries(config.items)) {
      for (const synonym of synonyms) {
        this.synonymMap.set(synonym.toLowerCase(), standard);
      }
      this.synonymMap.set(standard.toLowerCase(), standard);
    }
  }

  /**
   * 解析输入字符串为关键词组合
   * 支持格式: "A+B", "A + B", "A＋B"（全角加号）
   */
  parse(input: string): KeywordCombination | null {
    if (!input || typeof input !== 'string') {
      return null;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    // 支持半角和全角加号
    const parts = trimmed.split(/[+＋]/).map(p => p.trim()).filter(p => p);
    
    if (parts.length !== 2) {
      return null;
    }

    const keyword1 = this.normalize(parts[0]);
    const keyword2 = this.normalize(parts[1]);

    return {
      keyword1,
      keyword2,
      rawInput: input
    };
  }

  /**
   * 将同义词标准化为标准关键词
   * 优先检查玩家名字映射，然后检查同义词映射
   * 如果找不到映射，返回原词的小写形式
   */
  normalize(keyword: string): string {
    if (!keyword) {
      return '';
    }
    const lower = keyword.toLowerCase().trim();
    
    // 优先检查玩家名字映射
    const characterType = this.playerNameMap.get(lower);
    if (characterType) {
      return characterType;
    }
    
    return this.synonymMap.get(lower) || lower;
  }

  /**
   * 检查两个组合是否语义等价
   * 考虑顺序无关性：A+B 等价于 B+A
   */
  isEquivalent(a: KeywordCombination, b: KeywordCombination): boolean {
    const aSet = new Set([a.keyword1, a.keyword2]);
    const bSet = new Set([b.keyword1, b.keyword2]);
    
    if (aSet.size !== bSet.size) {
      return false;
    }
    
    for (const item of aSet) {
      if (!bSet.has(item)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 序列化组合为字符串
   * 按字母顺序排序以保证一致性
   */
  serialize(combination: KeywordCombination): string {
    const sorted = [combination.keyword1, combination.keyword2].sort();
    return `${sorted[0]}+${sorted[1]}`;
  }

  /**
   * 反序列化字符串为组合
   */
  deserialize(str: string): KeywordCombination {
    const parts = str.split('+');
    if (parts.length !== 2) {
      throw new Error(`Invalid serialized combination: ${str}`);
    }
    return {
      keyword1: parts[0],
      keyword2: parts[1],
      rawInput: str
    };
  }

  /**
   * 添加新的同义词映射
   */
  addSynonym(standard: string, synonym: string): void {
    this.synonymMap.set(synonym.toLowerCase(), standard);
  }

  /**
   * 检查关键词是否已知
   */
  isKnownKeyword(keyword: string): boolean {
    return this.synonymMap.has(keyword.toLowerCase());
  }
}
