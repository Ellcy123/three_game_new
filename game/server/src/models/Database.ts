import fs from 'fs';
import path from 'path';
import { GameState } from '../../../shared/src/types/game';

/**
 * 简单的文件存储数据库（替代SQLite）
 */
export class DatabaseManager {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(process.cwd(), 'data');
    this.initialize();
  }

  private initialize(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getFilePath(roomId: string): string {
    return path.join(this.dataDir, `${roomId}.json`);
  }

  saveGameState(state: GameState): void {
    const filePath = this.getFilePath(state.roomId);
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  }

  loadGameState(roomId: string): GameState | null {
    const filePath = this.getFilePath(roomId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as GameState;
  }

  createSave(roomId: string, saveName: string, state: GameState): string {
    const saveId = `save_${Date.now()}`;
    const savePath = path.join(this.dataDir, 'saves', `${saveId}.json`);
    
    const saveDir = path.dirname(savePath);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }
    
    fs.writeFileSync(savePath, JSON.stringify({ roomId, saveName, state }, null, 2));
    return saveId;
  }

  loadSave(saveId: string): GameState | null {
    const savePath = path.join(this.dataDir, 'saves', `${saveId}.json`);
    if (!fs.existsSync(savePath)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
    return data.state as GameState;
  }

  deleteGameState(roomId: string): void {
    const filePath = this.getFilePath(roomId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  close(): void {
    // 文件存储不需要关闭
  }
}
