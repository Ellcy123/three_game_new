/**
 * 游戏模块导出索引
 *
 * 统一导出所有游戏相关模块
 */

// 游戏引擎
export { GameEngine, createGameEngine } from './GameEngine';

// 第一关逻辑
export { Chapter1, createChapter1 } from './Chapter1';

// 类型定义会从 types 模块导入
export type {
  GameState,
  GameAction,
  ActionResult,
  PlayerState,
  GameSession,
} from '../types/game.types';
