/**
 * 游戏主引擎 - 整合所有系统，提供统一的游戏逻辑接口
 */

import { GameState, Resources, Quest, NPC, GameEvent, CombatEnemy } from './types';
import { ResourceSystem } from './resourceSystem';
import { PlayerSystem } from './playerSystem';
import { CombatSystem } from './combatSystem';
import { QuestSystem, createMainQuests, createSideQuests } from './questSystem';
import { EventSystem, createExploreEvents, createBattleEvents, createRandomEvents } from './eventSystem';
import { NPCSystem, createAllNpcs } from './npcSystem';
import { LocalStorageSystem, createInitialGameState } from '../storage/localStorage';

/**
 * 游戏引擎类
 */
export class GameEngine {
  // 游戏状态
  private gameState: GameState;
  
  // 子系统
  private resourceSystem: ResourceSystem;
  private playerSystem: PlayerSystem;
  private combatSystem: CombatSystem;
  private questSystem: QuestSystem;
  private eventSystem: EventSystem;
  private npcSystem: NPCSystem;
  private storageSystem: LocalStorageSystem;
  
  // 自动保存停止函数
  private stopAutoSave?: () => void;

  constructor() {
    // 创建初始状态
    this.gameState = createInitialGameState();
    
    // 初始化子系统
    this.resourceSystem = new ResourceSystem(this.gameState.resources);
    this.playerSystem = new PlayerSystem(this.gameState.player);
    this.combatSystem = new CombatSystem(this.playerSystem);
    this.questSystem = new QuestSystem(this.resourceSystem, this.playerSystem);
    this.eventSystem = new EventSystem();
    this.npcSystem = new NPCSystem();
    this.storageSystem = new LocalStorageSystem();
    
    // 加载初始数据
    this.loadInitialData();
  }

  /**
   * 加载初始数据
   */
  private loadInitialData(): void {
    // 加载任务
    const mainQuests = createMainQuests();
    const sideQuests = createSideQuests();
    this.questSystem.loadQuests([...mainQuests, ...sideQuests]);
    
    // 加载事件
    const exploreEvents = createExploreEvents();
    const battleEvents = createBattleEvents();
    const randomEvents = createRandomEvents();
    this.eventSystem.loadEvents([...exploreEvents, ...battleEvents, ...randomEvents]);
    
    // 加载 NPC
    const npcs = createAllNpcs();
    this.npcSystem.loadNpcs(npcs);
    
    // 同步到游戏状态
    this.syncToGameState();
  }

  /**
   * 开始新游戏
   */
  newGame(): { success: boolean; message: string } {
    this.gameState = createInitialGameState();
    
    // 重置所有系统
    this.resourceSystem = new ResourceSystem(this.gameState.resources);
    this.playerSystem = new PlayerSystem(this.gameState.player);
    this.combatSystem = new CombatSystem(this.playerSystem);
    this.questSystem = new QuestSystem(this.resourceSystem, this.playerSystem);
    this.eventSystem = new EventSystem();
    this.npcSystem = new NPCSystem();
    
    // 重新加载初始数据
    this.loadInitialData();
    
    // 保存
    return this.saveGame();
  }

  /**
   * 加载游戏
   */
  loadGame(): { success: boolean; message: string; gameState?: GameState } {
    const result = this.storageSystem.loadGame();
    
    if (result.success && result.gameState) {
      this.gameState = result.gameState;
      
      // 从游戏状态恢复子系统
      this.resourceSystem.loadFromGameState(this.gameState);
      this.playerSystem.loadFromGameState(this.gameState);
      this.combatSystem.deserialize(this.gameState.combatState);
      this.questSystem.deserialize(this.gameState.quests);
      this.eventSystem.deserialize({
        activeEvents: this.gameState.activeEvents,
        completedEvents: this.gameState.completedEvents,
      });
      this.npcSystem.deserialize({ npcs: this.gameState.npcs, recruitedNpcs: [] });
      
      return { success: true, message: result.message, gameState: this.gameState };
    }
    
    return result;
  }

  /**
   * 保存游戏
   */
  saveGame(): { success: boolean; message: string } {
    this.syncToGameState();
    return this.storageSystem.saveGame(this.gameState);
  }

  /**
   * 同步子系统数据到游戏状态
   */
  private syncToGameState(): void {
    this.gameState.resources = this.resourceSystem.serialize();
    this.gameState.player = this.playerSystem.serialize();
    this.gameState.combatState = this.combatSystem.serialize();
    this.gameState.quests = this.questSystem.serialize();
    
    const eventState = this.eventSystem.serialize();
    this.gameState.activeEvents = eventState.activeEvents;
    this.gameState.completedEvents = eventState.completedEvents;
    
    const npcState = this.npcSystem.serialize();
    this.gameState.npcs = npcState.npcs;
    
    this.gameState.lastSaveTime = Date.now();
  }

  /**
   * 获取游戏状态
   */
  getGameState(): GameState {
    this.syncToGameState();
    return { ...this.gameState };
  }

  /**
   * 获取资源
   */
  getResources(): Resources {
    return this.resourceSystem.getResources();
  }

  /**
   * 获取玩家属性
   */
  getPlayerAttributes() {
    return this.playerSystem.getAttributes();
  }

  /**
   * 探索
   */
  explore(): { success: boolean; event?: GameEvent; message: string } {
    // 消耗体力
    const { success } = this.playerSystem.modifyStamina(-10);
    if (!success) {
      return { success: false, message: '体力不足' };
    }
    
    // 随机触发事件
    const event = this.eventSystem.selectRandomEvent('explore');
    
    if (!event) {
      return { success: false, message: '没有可触发的事件' };
    }
    
    return this.eventSystem.triggerEvent(event.id);
  }

  /**
   * 选择事件选项
   */
  selectEventOption(eventId: string, optionId: string): { 
    success: boolean; 
    result?: any; 
    message: string 
  } {
    const result = this.eventSystem.selectEventOption(eventId, optionId);
    
    if (!result) {
      return { success: false, message: '无效的事件选项' };
    }
    
    // 应用结果
    if (result.resourceChange) {
      this.resourceSystem.addResources(result.resourceChange);
    }
    
    if (result.attributeChange) {
      // 应用属性变化
    }
    
    if (result.triggerBattle && result.battleId) {
      return this.startBattle(result.battleId);
    }
    
    return { success: true, result, message: result.message };
  }

  /**
   * 开始战斗
   */
  startBattle(battleId: string): { success: boolean; combatState?: any; message: string } {
    // 根据 battleId 生成敌人
    const enemies = this.generateEnemiesForBattle(battleId);
    
    if (enemies.length === 0) {
      return { success: false, message: '无法开始战斗' };
    }
    
    const combatState = this.combatSystem.startCombat(enemies);
    this.gameState.combatState = combatState;
    
    return { success: true, combatState, message: '战斗开始' };
  }

  /**
   * 生成战斗敌人
   */
  private generateEnemiesForBattle(battleId: string): CombatEnemy[] {
    const battleConfigs: Record<string, { count: number; level: number; types: any[] }> = {
      'BATTLE_01': { count: 2, level: 1, types: ['zombie'] },
      'BATTLE_02': { count: 3, level: 2, types: ['zombie'] },
      'BATTLE_03': { count: 4, level: 3, types: ['zombie', 'raider'] },
      'BATTLE_04': { count: 6, level: 4, types: ['zombie'] },
      'BATTLE_05': { count: 4, level: 5, types: ['raider'] },
      'BATTLE_06': { count: 1, level: 8, types: ['mutant'] },
      'BATTLE_07': { count: 6, level: 7, types: ['zombie', 'mutant'] },
      'BATTLE_08': { count: 4, level: 10, types: ['boss'] },
    };
    
    const config = battleConfigs[battleId] || { count: 3, level: 2, types: ['zombie'] };
    
    return CombatSystem.generateEnemies({
      count: config.count,
      baseLevel: config.level,
      types: config.types,
    });
  }

  /**
   * 玩家攻击
   */
  playerAttack(enemyId: string): { success: boolean; combatState?: any; message: string } {
    if (!this.gameState.combatState) {
      return { success: false, message: '不在战斗中' };
    }
    
    const combatState = this.combatSystem.playerAttack(enemyId);
    this.gameState.combatState = combatState;
    
    // 检查战斗是否结束
    if (!combatState.isInCombat) {
      return this.endCombat();
    }
    
    return { success: true, combatState, message: '攻击完成' };
  }

  /**
   * 结束战斗
   */
  private endCombat(): { success: boolean; rewards?: any; message: string } {
    if (!this.gameState.combatState) {
      return { success: false, message: '不在战斗中' };
    }
    
    const result = this.gameState.combatState.enemies.length === 0 ? 'win' : 'lose';
    
    if (result === 'win') {
      // 计算奖励
      const { exp, loot } = this.combatSystem.calculateRewards();
      this.playerSystem.addExp(exp);
      
      // 发放战利品
      loot.forEach(item => {
        if (item.itemId === 'caps') {
          this.resourceSystem.addResource('caps', item.amount);
        } else if (item.itemId === 'ammo') {
          this.resourceSystem.addResource('ammo', item.amount);
        }
        // 其他物品...
      });
      
      this.gameState.combatState = null;
      
      return { 
        success: true, 
        rewards: { exp, loot }, 
        message: `战斗胜利！获得 ${exp} 经验值` 
      };
    }
    
    this.gameState.combatState = null;
    return { success: false, message: '战斗失败' };
  }

  /**
   * 逃跑
   */
  flee(): { success: boolean; message: string } {
    if (!this.gameState.combatState) {
      return { success: false, message: '不在战斗中' };
    }
    
    const result = this.combatSystem.flee();
    
    if (result.success) {
      this.gameState.combatState = null;
    }
    
    return result;
  }

  /**
   * 接受任务
   */
  acceptQuest(questId: string): { success: boolean; message: string } {
    return this.questSystem.acceptQuest(questId);
  }

  /**
   * 获取任务列表
   */
  getQuests() {
    return this.questSystem.getQuests();
  }

  /**
   * 领取任务奖励
   */
  claimQuestReward(questId: string): { success: boolean; message: string } {
    return this.questSystem.claimQuestReward(questId);
  }

  /**
   * 与 NPC 对话
   */
  talkToNpc(npcId: string): { success: boolean; dialogue?: any; message: string } {
    return this.npcSystem.talkToNpc(npcId);
  }

  /**
   * 招募 NPC
   */
  recruitNpc(npcId: string): { success: boolean; message: string } {
    return this.npcSystem.recruitNpc(npcId);
  }

  /**
   * 与 NPC 交易
   */
  tradeWithNpc(npcId: string, itemId: string, quantity: number = 1): { 
    success: boolean; 
    message: string 
  } {
    return this.npcSystem.tradeWithNpc(npcId, itemId, quantity);
  }

  /**
   * 获取 NPC 列表
   */
  getNpcs() {
    return this.npcSystem.getAllNpcs();
  }

  /**
   * 时间流逝
   */
  passTime(minutes: number): { 
    success: boolean; 
    dayChanged: boolean; 
    newDay: number;
    message: string 
  } {
    this.gameState.time += minutes;
    
    let dayChanged = false;
    
    while (this.gameState.time >= 1440) {
      this.gameState.time -= 1440;
      this.gameState.day++;
      this.gameState.survivalDays++;
      dayChanged = true;
      
      // 处理每日结算
      this.processDailyTick();
    }
    
    return {
      success: true,
      dayChanged,
      newDay: this.gameState.day,
      message: dayChanged ? `第 ${this.gameState.day} 天开始了` : '时间流逝',
    };
  }

  /**
   * 处理每日结算
   */
  private processDailyTick(): void {
    // 资源产出和消耗
    const { shortages } = this.resourceSystem.processDailyTick();
    
    if (shortages.length > 0) {
      // 资源短缺惩罚
      this.playerSystem.modifyHealth(-10);
    }
    
    // 重置日常任务
    this.questSystem.resetDailyQuests();
  }

  /**
   * 开始自动保存
   */
  startAutoSave(intervalMs: number = 300000): void {
    this.stopAutoSave?.();
    this.stopAutoSave = this.storageSystem.startAutoSave(
      () => this.getGameState(),
      intervalMs
    );
  }

  /**
   * 停止自动保存
   */
  stopAutoSaveFunc(): void {
    this.stopAutoSave?.();
    this.stopAutoSave = undefined;
  }

  /**
   * 获取存档信息
   */
  getSaveInfo() {
    return this.storageSystem.getSaveInfo();
  }

  /**
   * 导出存档
   */
  exportSave(): string | null {
    return this.storageSystem.exportSave();
  }

  /**
   * 导入存档
   */
  importSave(saveData: string): { success: boolean; message: string } {
    return this.storageSystem.importSave(saveData);
  }
}

export default GameEngine;
