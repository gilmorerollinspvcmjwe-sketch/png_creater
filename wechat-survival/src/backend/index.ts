/**
 * WeChat Survival Phase 1 - 后端模块导出
 * 本地存储版本
 */

// ==================== 类型导出 ====================
export * from './engine/types';

// ==================== 系统导出 ====================
export { ResourceSystem } from './engine/resourceSystem';
export { PlayerSystem } from './engine/playerSystem';
export { CombatSystem } from './engine/combatSystem';
export { QuestSystem, createMainQuests, createSideQuests } from './engine/questSystem';
export { EventSystem, createExploreEvents, createBattleEvents, createRandomEvents } from './engine/eventSystem';
export { NPCSystem, createAllNpcs, createMerchantNpcs, createQuestGiverNpcs, createSurvivorNpcs, createHostileNpcs } from './engine/npcSystem';

// ==================== 游戏引擎导出 ====================
export { GameEngine } from './engine/gameEngine';
export { GameApi } from './engine/api';
export * from './engine/api';

// ==================== 存储导出 ====================
export { LocalStorageSystem, createInitialGameState, serializeGameState, deserializeGameState } from './storage/localStorage';

// ==================== 数据导出 ====================
export { BALANCE_CONFIG } from './data/balance';
export * from './data/balance';

// ==================== 默认导出 ====================
import { GameEngine } from './engine/gameEngine';
import { GameApi } from './engine/api';
import { LocalStorageSystem } from './storage/localStorage';

export default {
  GameEngine,
  GameApi,
  LocalStorageSystem,
};
