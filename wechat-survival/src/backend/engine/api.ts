/**
 * WeChat Survival Phase 1 - 与前端对接的接口定义
 * 本地存储版本 API
 */

import { GameState, Resources, PlayerAttributes, Quest, NPC, GameEvent, CombatState } from './types';
import { GameEngine } from './gameEngine';

// ==================== API 响应类型 ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}

// ==================== 游戏控制接口 ====================

export interface NewGameRequest {
  // 无参数
}

export interface NewGameResponse {
  success: boolean;
  message: string;
  gameState?: GameState;
}

export interface LoadGameRequest {
  // 无参数
}

export interface LoadGameResponse {
  success: boolean;
  message: string;
  gameState?: GameState;
}

export interface SaveGameRequest {
  // 无参数
}

export interface SaveGameResponse {
  success: boolean;
  message: string;
}

export interface GetGameStateRequest {
  // 无参数
}

export interface GetGameStateResponse {
  success: boolean;
  gameState: GameState;
}

// ==================== 探索接口 ====================

export interface ExploreRequest {
  // 无参数
}

export interface ExploreResponse {
  success: boolean;
  event?: GameEvent;
  message: string;
}

export interface SelectEventOptionRequest {
  eventId: string;
  optionId: string;
}

export interface SelectEventOptionResponse {
  success: boolean;
  result?: any;
  combatState?: CombatState;
  message: string;
}

// ==================== 战斗接口 ====================

export interface StartBattleRequest {
  battleId: string;
}

export interface StartBattleResponse {
  success: boolean;
  combatState?: CombatState;
  message: string;
}

export interface PlayerAttackRequest {
  enemyId: string;
}

export interface PlayerAttackResponse {
  success: boolean;
  combatState?: CombatState;
  rewards?: {
    exp: number;
    loot: any[];
  };
  message: string;
}

export interface FleeRequest {
  // 无参数
}

export interface FleeResponse {
  success: boolean;
  message: string;
}

// ==================== 任务接口 ====================

export interface GetQuestsRequest {
  type?: 'main' | 'side' | 'daily';
  status?: 'available' | 'accepted' | 'completed';
}

export interface GetQuestsResponse {
  success: boolean;
  quests: Quest[];
}

export interface AcceptQuestRequest {
  questId: string;
}

export interface AcceptQuestResponse {
  success: boolean;
  message: string;
}

export interface ClaimQuestRewardRequest {
  questId: string;
}

export interface ClaimQuestRewardResponse {
  success: boolean;
  message: string;
  rewards?: any[];
}

// ==================== NPC 接口 ====================

export interface GetNpcsRequest {
  type?: 'merchant' | 'quest_giver' | 'survivor' | 'hostile';
  recruited?: boolean;
}

export interface GetNpcsResponse {
  success: boolean;
  npcs: NPC[];
}

export interface TalkToNpcRequest {
  npcId: string;
}

export interface TalkToNpcResponse {
  success: boolean;
  dialogue?: any;
  message: string;
}

export interface RecruitNpcRequest {
  npcId: string;
}

export interface RecruitNpcResponse {
  success: boolean;
  message: string;
}

export interface TradeWithNpcRequest {
  npcId: string;
  itemId: string;
  quantity?: number;
}

export interface TradeWithNpcResponse {
  success: boolean;
  message: string;
  cost?: {
    type: string;
    amount: number;
  };
  receivedItem?: string;
}

// ==================== 资源接口 ====================

export interface GetResourcesRequest {
  // 无参数
}

export interface GetResourcesResponse {
  success: boolean;
  resources: Resources;
}

export interface GetPlayerAttributesRequest {
  // 无参数
}

export interface GetPlayerAttributesResponse {
  success: boolean;
  attributes: PlayerAttributes;
}

// ==================== 时间接口 ====================

export interface PassTimeRequest {
  minutes: number;
}

export interface PassTimeResponse {
  success: boolean;
  dayChanged: boolean;
  newDay: number;
  message: string;
}

// ==================== 存档接口 ====================

export interface ExportSaveRequest {
  // 无参数
}

export interface ExportSaveResponse {
  success: boolean;
  saveData?: string;
  message: string;
}

export interface ImportSaveRequest {
  saveData: string;
}

export interface ImportSaveResponse {
  success: boolean;
  message: string;
}

export interface GetSaveInfoRequest {
  // 无参数
}

export interface GetSaveInfoResponse {
  success: boolean;
  exists: boolean;
  version?: string;
  saveTime?: number;
  gameDay?: number;
  survivalDays?: number;
}

// ==================== API 类 ====================

export class GameApi {
  private engine: GameEngine;

  constructor() {
    this.engine = new GameEngine();
  }

  /**
   * 统一响应包装
   */
  private wrapResponse<T>(data: T, error?: { code: string; message: string }): ApiResponse<T> {
    return {
      success: !error,
      data,
      error,
      timestamp: Date.now(),
    };
  }

  // ==================== 游戏控制 ====================

  async newGame(request: NewGameRequest): ApiResponse<NewGameResponse> {
    try {
      const result = this.engine.newGame();
      return this.wrapResponse({
        success: result.success,
        message: result.message,
        gameState: result.success ? this.engine.getGameState() : undefined,
      });
    } catch (error) {
      return this.wrapResponse({} as NewGameResponse, {
        code: 'NEW_GAME_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async loadGame(request: LoadGameRequest): ApiResponse<LoadGameResponse> {
    try {
      const result = this.engine.loadGame();
      return this.wrapResponse({
        success: result.success,
        message: result.message,
        gameState: result.gameState,
      });
    } catch (error) {
      return this.wrapResponse({} as LoadGameResponse, {
        code: 'LOAD_GAME_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async saveGame(request: SaveGameRequest): ApiResponse<SaveGameResponse> {
    try {
      const result = this.engine.saveGame();
      return this.wrapResponse({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as SaveGameResponse, {
        code: 'SAVE_GAME_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async getGameState(request: GetGameStateRequest): ApiResponse<GetGameStateResponse> {
    try {
      const gameState = this.engine.getGameState();
      return this.wrapResponse({
        success: true,
        gameState,
      });
    } catch (error) {
      return this.wrapResponse({} as GetGameStateResponse, {
        code: 'GET_STATE_ERROR',
        message: (error as Error).message,
      });
    }
  }

  // ==================== 探索 ====================

  async explore(request: ExploreRequest): ApiResponse<ExploreResponse> {
    try {
      const result = this.engine.explore();
      return this.wrapResponse({
        success: result.success,
        event: result.event,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as ExploreResponse, {
        code: 'EXPLORE_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async selectEventOption(request: SelectEventOptionRequest): ApiResponse<SelectEventOptionResponse> {
    try {
      const result = this.engine.selectEventOption(request.eventId, request.optionId);
      return this.wrapResponse({
        success: result.success,
        result: result.result,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as SelectEventOptionResponse, {
        code: 'EVENT_OPTION_ERROR',
        message: (error as Error).message,
      });
    }
  }

  // ==================== 战斗 ====================

  async startBattle(request: StartBattleRequest): ApiResponse<StartBattleResponse> {
    try {
      const result = this.engine.startBattle(request.battleId);
      return this.wrapResponse({
        success: result.success,
        combatState: result.combatState,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as StartBattleResponse, {
        code: 'START_BATTLE_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async playerAttack(request: PlayerAttackRequest): ApiResponse<PlayerAttackResponse> {
    try {
      const result = this.engine.playerAttack(request.enemyId);
      return this.wrapResponse({
        success: result.success,
        combatState: result.combatState,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as PlayerAttackResponse, {
        code: 'ATTACK_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async flee(request: FleeRequest): ApiResponse<FleeResponse> {
    try {
      const result = this.engine.flee();
      return this.wrapResponse({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as FleeResponse, {
        code: 'FLEE_ERROR',
        message: (error as Error).message,
      });
    }
  }

  // ==================== 任务 ====================

  async getQuests(request: GetQuestsRequest): ApiResponse<GetQuestsResponse> {
    try {
      const quests = this.engine.getQuests();
      return this.wrapResponse({
        success: true,
        quests,
      });
    } catch (error) {
      return this.wrapResponse({} as GetQuestsResponse, {
        code: 'GET_QUESTS_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async acceptQuest(request: AcceptQuestRequest): ApiResponse<AcceptQuestResponse> {
    try {
      const result = this.engine.acceptQuest(request.questId);
      return this.wrapResponse({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as AcceptQuestResponse, {
        code: 'ACCEPT_QUEST_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async claimQuestReward(request: ClaimQuestRewardRequest): ApiResponse<ClaimQuestRewardResponse> {
    try {
      const result = this.engine.claimQuestReward(request.questId);
      return this.wrapResponse({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as ClaimQuestRewardResponse, {
        code: 'CLAIM_REWARD_ERROR',
        message: (error as Error).message,
      });
    }
  }

  // ==================== NPC ====================

  async getNpcs(request: GetNpcsRequest): ApiResponse<GetNpcsResponse> {
    try {
      const npcs = this.engine.getNpcs();
      return this.wrapResponse({
        success: true,
        npcs,
      });
    } catch (error) {
      return this.wrapResponse({} as GetNpcsResponse, {
        code: 'GET_NPCS_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async talkToNpc(request: TalkToNpcRequest): ApiResponse<TalkToNpcResponse> {
    try {
      const result = this.engine.talkToNpc(request.npcId);
      return this.wrapResponse({
        success: result.success,
        dialogue: result.dialogue,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as TalkToNpcResponse, {
        code: 'TALK_NPC_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async recruitNpc(request: RecruitNpcRequest): ApiResponse<RecruitNpcResponse> {
    try {
      const result = this.engine.recruitNpc(request.npcId);
      return this.wrapResponse({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as RecruitNpcResponse, {
        code: 'RECRUIT_NPC_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async tradeWithNpc(request: TradeWithNpcRequest): ApiResponse<TradeWithNpcResponse> {
    try {
      const result = this.engine.tradeWithNpc(request.npcId, request.itemId, request.quantity);
      return this.wrapResponse({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as TradeWithNpcResponse, {
        code: 'TRADE_NPC_ERROR',
        message: (error as Error).message,
      });
    }
  }

  // ==================== 资源 ====================

  async getResources(request: GetResourcesRequest): ApiResponse<GetResourcesResponse> {
    try {
      const resources = this.engine.getResources();
      return this.wrapResponse({
        success: true,
        resources,
      });
    } catch (error) {
      return this.wrapResponse({} as GetResourcesResponse, {
        code: 'GET_RESOURCES_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async getPlayerAttributes(request: GetPlayerAttributesRequest): ApiResponse<GetPlayerAttributesResponse> {
    try {
      const attributes = this.engine.getPlayerAttributes();
      return this.wrapResponse({
        success: true,
        attributes,
      });
    } catch (error) {
      return this.wrapResponse({} as GetPlayerAttributesResponse, {
        code: 'GET_ATTRIBUTES_ERROR',
        message: (error as Error).message,
      });
    }
  }

  // ==================== 时间 ====================

  async passTime(request: PassTimeRequest): ApiResponse<PassTimeResponse> {
    try {
      const result = this.engine.passTime(request.minutes);
      return this.wrapResponse({
        success: result.success,
        dayChanged: result.dayChanged,
        newDay: result.newDay,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as PassTimeResponse, {
        code: 'PASS_TIME_ERROR',
        message: (error as Error).message,
      });
    }
  }

  // ==================== 存档 ====================

  async exportSave(request: ExportSaveRequest): ApiResponse<ExportSaveResponse> {
    try {
      const saveData = this.engine.exportSave();
      return this.wrapResponse({
        success: !!saveData,
        saveData: saveData || undefined,
        message: saveData ? '导出成功' : '导出失败',
      });
    } catch (error) {
      return this.wrapResponse({} as ExportSaveResponse, {
        code: 'EXPORT_SAVE_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async importSave(request: ImportSaveRequest): ApiResponse<ImportSaveResponse> {
    try {
      const result = this.engine.importSave(request.saveData);
      return this.wrapResponse({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      return this.wrapResponse({} as ImportSaveResponse, {
        code: 'IMPORT_SAVE_ERROR',
        message: (error as Error).message,
      });
    }
  }

  async getSaveInfo(request: GetSaveInfoRequest): ApiResponse<GetSaveInfoResponse> {
    try {
      const info = this.engine.getSaveInfo();
      return this.wrapResponse({
        success: true,
        ...info,
      });
    } catch (error) {
      return this.wrapResponse({} as GetSaveInfoResponse, {
        code: 'GET_SAVE_INFO_ERROR',
        message: (error as Error).message,
      });
    }
  }
}

export default GameApi;
