/**
 * 资源系统 - 管理游戏资源的产出、消耗和交易
 */

import { Resources, ResourceType, GameState } from './types';

// 基础资源产出配置（每天）
const BASE_PRODUCTION: Resources = {
  food: 5,
  water: 5,
  medicine: 1,
  ammo: 2,
  scrap: 3,
  wood: 3,
  caps: 10,
};

// 基础资源消耗配置（每人每天）
const BASE_CONSUMPTION: Resources = {
  food: 3,
  water: 2,
  medicine: 0,
  ammo: 0,
  scrap: 0,
  wood: 0,
  caps: 0,
};

// 资源存储上限
const RESOURCE_LIMITS: Record<ResourceType, number> = {
  food: 100,
  water: 100,
  medicine: 50,
  ammo: 200,
  scrap: 200,
  wood: 200,
  caps: 9999,
};

/**
 * 资源系统类
 */
export class ResourceSystem {
  private resources: Resources;
  private productionBonus: number = 1;  // 产出加成系数
  private consumptionBonus: number = 1; // 消耗加成系数
  private npcCount: number = 1;         // NPC 数量（影响消耗）

  constructor(initialResources?: Partial<Resources>) {
    this.resources = {
      food: 20,
      water: 20,
      medicine: 5,
      ammo: 10,
      scrap: 10,
      wood: 10,
      caps: 50,
      ...initialResources,
    };
  }

  /**
   * 获取当前资源
   */
  getResources(): Resources {
    return { ...this.resources };
  }

  /**
   * 获取特定资源数量
   */
  getResource(type: ResourceType): number {
    return this.resources[type];
  }

  /**
   * 添加资源
   */
  addResource(type: ResourceType, amount: number): { success: boolean; actualAmount: number } {
    if (amount < 0) {
      return { success: false, actualAmount: 0 };
    }

    const current = this.resources[type];
    const limit = RESOURCE_LIMITS[type];
    const actualAmount = Math.min(amount, limit - current);
    
    this.resources[type] += actualAmount;
    
    return {
      success: actualAmount > 0,
      actualAmount,
    };
  }

  /**
   * 消耗资源
   */
  consumeResource(type: ResourceType, amount: number): { success: boolean; actualAmount: number } {
    if (amount < 0) {
      return { success: false, actualAmount: 0 };
    }

    const current = this.resources[type];
    const actualAmount = Math.min(amount, current);
    
    this.resources[type] -= actualAmount;
    
    return {
      success: actualAmount >= amount,
      actualAmount,
    };
  }

  /**
   * 批量添加资源
   */
  addResources(resources: Partial<Resources>): Record<ResourceType, number> {
    const result: Record<ResourceType, number> = {
      food: 0,
      water: 0,
      medicine: 0,
      ammo: 0,
      scrap: 0,
      wood: 0,
      caps: 0,
    };

    (Object.keys(resources) as ResourceType[]).forEach((type) => {
      const amount = resources[type] || 0;
      if (amount > 0) {
        const { actualAmount } = this.addResource(type, amount);
        result[type] = actualAmount;
      }
    });

    return result;
  }

  /**
   * 批量消耗资源
   */
  consumeResources(resources: Partial<Resources>): { success: boolean; consumed: Record<ResourceType, number> } {
    const consumed: Record<ResourceType, number> = {
      food: 0,
      water: 0,
      medicine: 0,
      ammo: 0,
      scrap: 0,
      wood: 0,
      caps: 0,
    };

    // 先检查是否有足够的资源
    for (const [type, amount] of Object.entries(resources)) {
      if (amount && this.resources[type as ResourceType] < amount) {
        return { success: false, consumed };
      }
    }

    // 消耗资源
    for (const [type, amount] of Object.entries(resources)) {
      if (amount) {
        const { actualAmount } = this.consumeResource(type as ResourceType, amount);
        consumed[type as ResourceType] = actualAmount;
      }
    }

    return { success: true, consumed };
  }

  /**
   * 检查是否有足够的资源
   */
  hasResources(resources: Partial<Resources>): boolean {
    for (const [type, amount] of Object.entries(resources)) {
      if (amount && this.resources[type as ResourceType] < amount) {
        return false;
      }
    }
    return true;
  }

  /**
   * 计算每日产出
   */
  calculateDailyProduction(): Resources {
    return {
      food: Math.floor(BASE_PRODUCTION.food * this.productionBonus),
      water: Math.floor(BASE_PRODUCTION.water * this.productionBonus),
      medicine: Math.floor(BASE_PRODUCTION.medicine * this.productionBonus),
      ammo: Math.floor(BASE_PRODUCTION.ammo * this.productionBonus),
      scrap: Math.floor(BASE_PRODUCTION.scrap * this.productionBonus),
      wood: Math.floor(BASE_PRODUCTION.wood * this.productionBonus),
      caps: Math.floor(BASE_PRODUCTION.caps * this.productionBonus),
    };
  }

  /**
   * 计算每日消耗
   */
  calculateDailyConsumption(): Resources {
    return {
      food: Math.floor(BASE_CONSUMPTION.food * this.npcCount * this.consumptionBonus),
      water: Math.floor(BASE_CONSUMPTION.water * this.npcCount * this.consumptionBonus),
      medicine: Math.floor(BASE_CONSUMPTION.medicine * this.npcCount * this.consumptionBonus),
      ammo: 0,
      scrap: 0,
      wood: 0,
      caps: 0,
    };
  }

  /**
   * 处理每日资源结算
   */
  processDailyTick(): {
    production: Resources;
    consumption: Resources;
    netChange: Resources;
    shortages: ResourceType[];
  } {
    const production = this.calculateDailyProduction();
    const consumption = this.calculateDailyConsumption();
    
    // 添加产出
    this.addResources(production);
    
    // 计算净变化和短缺
    const netChange: Resources = {
      food: production.food - consumption.food,
      water: production.water - consumption.water,
      medicine: production.medicine - consumption.medicine,
      ammo: production.ammo,
      scrap: production.scrap,
      wood: production.wood,
      caps: production.caps,
    };

    const shortages: ResourceType[] = [];
    
    // 消耗资源（食物和水）
    const { success: foodSuccess } = this.consumeResource('food', consumption.food);
    if (!foodSuccess) shortages.push('food');
    
    const { success: waterSuccess } = this.consumeResource('water', consumption.water);
    if (!waterSuccess) shortages.push('water');

    return { production, consumption, netChange, shortages };
  }

  /**
   * 设置产出加成
   */
  setProductionBonus(bonus: number): void {
    this.productionBonus = Math.max(0, bonus);
  }

  /**
   * 设置消耗加成
   */
  setConsumptionBonus(bonus: number): void {
    this.consumptionBonus = Math.max(0, bonus);
  }

  /**
   * 设置 NPC 数量
   */
  setNpcCount(count: number): void {
    this.npcCount = Math.max(1, count);
  }

  /**
   * 获取资源存储上限
   */
  getResourceLimit(type: ResourceType): number {
    return RESOURCE_LIMITS[type];
  }

  /**
   * 获取资源填充率 (0-1)
   */
  getFillRate(type: ResourceType): number {
    return this.resources[type] / RESOURCE_LIMITS[type];
  }

  /**
   * 序列化资源数据
   */
  serialize(): Resources {
    return { ...this.resources };
  }

  /**
   * 反序列化资源数据
   */
  deserialize(data: Resources): void {
    this.resources = { ...data };
  }

  /**
   * 从游戏状态加载
   */
  loadFromGameState(gameState: GameState): void {
    this.resources = { ...gameState.resources };
  }

  /**
   * 保存到游戏状态
   */
  saveToGameState(gameState: GameState): GameState {
    return {
      ...gameState,
      resources: this.serialize(),
    };
  }
}

export default ResourceSystem;
