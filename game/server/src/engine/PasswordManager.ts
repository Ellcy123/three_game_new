import { GameState } from '../../../shared/src/types/game';
import { SUITCASE_PASSWORD, LEVEL1_PASSWORD } from '../../../shared/src/constants/game';

/**
 * 密码验证结果
 */
export interface PasswordResult {
  success: boolean;
  message: string;
  nextAction?: 'free_cat' | 'level_complete';
}

/**
 * 密码管理器
 * 处理行李箱密码和大门密码的验证
 */
export class PasswordManager {
  /**
   * 验证行李箱密码
   */
  verifySuitcasePassword(password: string, state: GameState): PasswordResult {
    const catPlayer = state.players.find(p => p.characterType === 'cat');
    
    if (!catPlayer) {
      return {
        success: false,
        message: '系统错误：找不到猫咪角色'
      };
    }

    if (!catPlayer.isTrapped) {
      return {
        success: false,
        message: '行李箱已经打开了'
      };
    }

    if (password === SUITCASE_PASSWORD) {
      return {
        success: true,
        message: `咔嚓！行李箱打开了。${catPlayer.name}从行李箱里爬了出来，大口呼吸着新鲜空气。`,
        nextAction: 'free_cat'
      };
    }

    return {
      success: false,
      message: '密码错误，行李箱依然紧闭。'
    };
  }

  /**
   * 验证大门密码
   */
  verifyDoorPassword(password: string, state: GameState): PasswordResult {
    // 检查是否收集了所有字母
    const requiredLetters = ['C', 'E', 'H', 'O'];
    const hasAllLetters = requiredLetters.every(
      letter => state.collectedLetters.includes(letter)
    );

    if (!hasAllLetters) {
      const collected = state.collectedLetters.length;
      return {
        success: false,
        message: `大门需要输入四位密码，但你们还没有找到足够的线索。已收集字母：${collected}/4`
      };
    }

    // 验证密码（不区分大小写）
    if (password.toUpperCase() === LEVEL1_PASSWORD) {
      return {
        success: true,
        message: '轰隆隆...大门缓缓打开了！你们凭借智慧打开了密室大门，完成了第一关！',
        nextAction: 'level_complete'
      };
    }

    return {
      success: false,
      message: '密码错误，大门依然紧闭。提示：密码可能与你们找到的字母有关。'
    };
  }

  /**
   * 获取已收集字母的提示
   */
  getLetterHint(state: GameState): string {
    if (state.collectedLetters.length === 0) {
      return '你们还没有收集到任何字母';
    }
    
    const letters = state.collectedLetters.sort().join('、');
    return `已收集的字母：${letters}（${state.collectedLetters.length}/4）`;
  }

  /**
   * 检查是否可以尝试开门
   */
  canAttemptDoor(state: GameState): { canAttempt: boolean; reason?: string } {
    if (!state.smallRoomUnlocked) {
      return {
        canAttempt: false,
        reason: '你还没有发现大门'
      };
    }

    const requiredLetters = ['C', 'E', 'H', 'O'];
    const hasAllLetters = requiredLetters.every(
      letter => state.collectedLetters.includes(letter)
    );

    if (!hasAllLetters) {
      return {
        canAttempt: false,
        reason: this.getLetterHint(state)
      };
    }

    return { canAttempt: true };
  }
}
