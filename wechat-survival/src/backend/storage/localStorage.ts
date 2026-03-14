/**
 * 本地存储系统 - 游戏存档保存/读取、数据序列化/反序列化、版本管理
 */

import { GameState, SaveData, Resources, PlayerAttributes, Shelter, NPC, Quest, CombatState } from '../engine/types';

const STORAGE_KEY = 'wechat_survival_save';
const STORAGE_VERSION = '1.0.0';
const BACKUP_KEY = 'wechat_survival_backup';

/**
 * 计算校验和（用于数据完整性检查）
 */
function calculateChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * 本地存储系统类
 */
export class LocalStorageSystem {
  private currentVersion: string = STORAGE_VERSION;
  
  /**
   * 保存游戏数据
   */
  saveGame(gameState: GameState): { success: boolean; message: string } {
    try {
      const saveData: SaveData = {
        version: this.currentVersion,
        saveTime: Date.now(),
        gameDay: gameState.day,
        survivalDays: gameState.survivalDays,
        checksum: calculateChecksum(gameState),
        gameState: this.sanitizeGameState(gameState),
      };
      
      // 备份当前存档
      this.createBackup();
      
      // 保存新存档
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      
      return { success: true, message: '游戏已保存' };
    } catch (error) {
      console.error('保存游戏失败:', error);
      return { success: false, message: '保存失败：' + (error as Error).message };
    }
  }

  /**
   * 加载游戏数据
   */
  loadGame(): { success: boolean; gameState?: GameState; message: string } {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      
      if (!saved) {
        return { success: false, message: '没有存档数据' };
      }
      
      const saveData: SaveData = JSON.parse(saved);
      
      // 版本检查
      if (!this.isVersionCompatible(saveData.version)) {
        return { 
          success: false, 
          message: `存档版本不兼容：${saveData.version}` 
        };
      }
      
      // 校验和验证
      const expectedChecksum = calculateChecksum(saveData.gameState);
      if (saveData.checksum !== expectedChecksum) {
        console.warn('存档校验失败，尝试从备份恢复...');
        return this.loadBackup();
      }
      
      return { 
        success: true, 
        gameState: this.deserializeGameState(saveData.gameState),
        message: '游戏已加载' 
      };
    } catch (error) {
      console.error('加载游戏失败:', error);
      return { success: false, message: '加载失败：' + (error as Error).message };
    }
  }

  /**
   * 创建备份
   */
  private createBackup(): void {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) {
        localStorage.setItem(BACKUP_KEY, current);
      }
    } catch (error) {
      console.warn('创建备份失败:', error);
    }
  }

  /**
   * 从备份加载
   */
  private loadBackup(): { success: boolean; gameState?: GameState; message: string } {
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      
      if (!backup) {
        return { success: false, message: '备份也不存在' };
      }
      
      const saveData: SaveData = JSON.parse(backup);
      
      if (!this.isVersionCompatible(saveData.version)) {
        return { success: false, message: '备份版本不兼容' };
      }
      
      return { 
        success: true, 
        gameState: this.deserializeGameState(saveData.gameState),
        message: '已从备份恢复' 
      };
    } catch (error) {
      console.error('从备份加载失败:', error);
      return { success: false, message: '备份恢复失败' };
    }
  }

  /**
   * 检查版本兼容性
   */
  private isVersionCompatible(version: string): boolean {
    const current = this.parseVersion(this.currentVersion);
    const saved = this.parseVersion(version);
    
    // 主版本必须相同
    return current.major === saved.major;
  }

  /**
   * 解析版本号
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  }

  /**
   * 清理游戏状态（移除不可序列化的数据）
   */
  private sanitizeGameState(gameState: GameState): GameState {
    // 创建深拷贝
    const sanitized = JSON.parse(JSON.stringify(gameState));
    
    // 移除战斗状态（如果正在战斗中，下次加载时重置）
    if (sanitized.combatState && sanitized.combatState.isInCombat) {
      sanitized.combatState = null;
    }
    
    return sanitized;
  }

  /**
   * 反序列化游戏状态
   */
  private deserializeGameState(gameState: GameState): GameState {
    // 确保所有字段都存在
    return {
      ...gameState,
      combatState: gameState.combatState || null,
    };
  }

  /**
   * 获取存档信息
   */
  getSaveInfo(): { 
    exists: boolean; 
    version?: string; 
    saveTime?: number; 
    gameDay?: number;
    survivalDays?: number;
  } {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      
      if (!saved) {
        return { exists: false };
      }
      
      const saveData: SaveData = JSON.parse(saved);
      
      return {
        exists: true,
        version: saveData.version,
        saveTime: saveData.saveTime,
        gameDay: saveData.gameDay,
        survivalDays: saveData.survivalDays,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * 删除存档
   */
  deleteSave(): { success: boolean; message: string } {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
      return { success: true, message: '存档已删除' };
    } catch (error) {
      return { success: false, message: '删除失败' };
    }
  }

  /**
   * 导出存档（用于备份）
   */
  exportSave(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('导出存档失败:', error);
      return null;
    }
  }

  /**
   * 导入存档
   */
  importSave(saveData: string): { success: boolean; message: string } {
    try {
      const parsed: SaveData = JSON.parse(saveData);
      
      if (!parsed.version || !parsed.gameState) {
        return { success: false, message: '无效的存档数据' };
      }
      
      if (!this.isVersionCompatible(parsed.version)) {
        return { success: false, message: '存档版本不兼容' };
      }
      
      localStorage.setItem(STORAGE_KEY, saveData);
      return { success: true, message: '存档已导入' };
    } catch (error) {
      return { success: false, message: '导入失败：' + (error as Error).message };
    }
  }

  /**
   * 自动保存（每 5 分钟）
   */
  startAutoSave(gameStateGetter: () => GameState, intervalMs: number = 300000): () => void {
    const intervalId = setInterval(() => {
      this.saveGame(gameStateGetter());
    }, intervalMs);
    
    return () => clearInterval(intervalId);
  }

  /**
   * 获取存储空间使用情况
   */
  getStorageUsage(): { 
    used: number; 
    limit: number; 
    percentage: number;
    canSave: boolean;
  } {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          used += localStorage.getItem(key)?.length || 0;
        }
      }
      
      // localStorage 通常限制在 5MB 左右
      const limit = 5 * 1024 * 1024;
      const percentage = (used / limit) * 100;
      
      return {
        used,
        limit,
        percentage,
        canSave: percentage < 90,
      };
    } catch (error) {
      return {
        used: 0,
        limit: 0,
        percentage: 0,
        canSave: true,
      };
    }
  }
}

/**
 * 创建初始游戏状态
 */
export function createInitialGameState(): GameState {
  return {
    day: 1,
    time: 480, // 早上 8:00
    survivalDays: 1,
    
    player: {
      health: 100,
      stamina: 50,
      attack: 10,
      defense: 5,
      critRate: 5,
      dodgeRate: 5,
      level: 1,
      exp: 0,
      maxHealth: 100,
      maxStamina: 50,
    },
    
    resources: {
      food: 20,
      water: 20,
      medicine: 5,
      ammo: 10,
      scrap: 10,
      wood: 10,
      caps: 50,
    },
    
    shelter: {
      level: 1,
      defense: 10,
      power: 5,
      space: 10,
      maxSpace: 10,
      npcSlots: 2,
      facilities: [],
    },
    
    npcs: [],
    quests: [],
    activeEvents: [],
    completedEvents: [],
    combatState: null,
    
    lastSaveTime: Date.now(),
    version: STORAGE_VERSION,
  };
}

/**
 * 序列化游戏状态（用于传输）
 */
export function serializeGameState(gameState: GameState): string {
  return JSON.stringify(gameState);
}

/**
 * 反序列化游戏状态
 */
export function deserializeGameState(data: string): GameState {
  return JSON.parse(data);
}

export default LocalStorageSystem;
