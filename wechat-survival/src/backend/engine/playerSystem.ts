/**
 * 角色属性系统 - 管理玩家属性、升级和战斗能力
 */

import { PlayerAttributes, GameState } from './types';

// 升级经验需求表
const EXP_REQUIREMENTS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 475,
  5: 813,
  6: 1319,
  7: 2078,
  8: 3217,
  9: 4925,
  10: 7388,
  11: 11232,
  12: 16848,
  13: 25272,
  14: 37908,
  15: 56862,
};

// 属性成长配置
const ATTRIBUTE_GROWTH = {
  health: 5,
  stamina: 2,
  attack: 2,
  defense: 1,
  critRate: 0.5,
  dodgeRate: 0.5,
};

// 属性上限
const ATTRIBUTE_LIMITS = {
  health: 500,
  stamina: 200,
  attack: 100,
  defense: 50,
  critRate: 30,
  dodgeRate: 30,
  level: 100,
};

/**
 * 角色属性系统类
 */
export class PlayerSystem {
  private attributes: PlayerAttributes;

  constructor(initialAttributes?: Partial<PlayerAttributes>) {
    this.attributes = {
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
      ...initialAttributes,
    };
  }

  /**
   * 获取当前属性
   */
  getAttributes(): PlayerAttributes {
    return { ...this.attributes };
  }

  /**
   * 获取等级
   */
  getLevel(): number {
    return this.attributes.level;
  }

  /**
   * 获取经验值
   */
  getExp(): number {
    return this.attributes.exp;
  }

  /**
   * 获取下一级所需经验
   */
  getExpToNextLevel(): number {
    const currentLevel = this.attributes.level;
    const nextLevelExp = EXP_REQUIREMENTS[currentLevel + 1] || this.calculateExpForLevel(currentLevel + 1);
    return Math.max(0, nextLevelExp - this.attributes.exp);
  }

  /**
   * 计算指定等级所需经验
   */
  private calculateExpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  /**
   * 添加经验值
   */
  addExp(amount: number): { leveledUp: boolean; newLevel: number } {
    if (amount <= 0) {
      return { leveledUp: false, newLevel: this.attributes.level };
    }

    this.attributes.exp += amount;
    
    // 检查是否升级
    const nextLevelExp = EXP_REQUIREMENTS[this.attributes.level + 1] || 
                         this.calculateExpForLevel(this.attributes.level + 1);
    
    if (this.attributes.exp >= nextLevelExp && this.attributes.level < ATTRIBUTE_LIMITS.level) {
      this.levelUp();
      return { leveledUp: true, newLevel: this.attributes.level };
    }

    return { leveledUp: false, newLevel: this.attributes.level };
  }

  /**
   * 升级
   */
  private levelUp(): void {
    this.attributes.level++;
    
    // 增加属性
    this.attributes.maxHealth += ATTRIBUTE_GROWTH.health;
    this.attributes.maxStamina += ATTRIBUTE_GROWTH.stamina;
    this.attributes.attack += ATTRIBUTE_GROWTH.attack;
    this.attributes.defense += ATTRIBUTE_GROWTH.defense;
    this.attributes.critRate = Math.min(ATTRIBUTE_LIMITS.critRate, this.attributes.critRate + ATTRIBUTE_GROWTH.critRate);
    this.attributes.dodgeRate = Math.min(ATTRIBUTE_LIMITS.dodgeRate, this.attributes.dodgeRate + ATTRIBUTE_GROWTH.dodgeRate);
    
    // 恢复生命值和体力
    this.attributes.health = this.attributes.maxHealth;
    this.attributes.stamina = this.attributes.maxStamina;
  }

  /**
   * 修改生命值
   */
  modifyHealth(amount: number): { success: boolean; newHealth: number } {
    const newHealth = Math.max(0, Math.min(this.attributes.maxHealth, this.attributes.health + amount));
    const actualChange = newHealth - this.attributes.health;
    
    if (actualChange === 0 && amount !== 0) {
      return { success: false, newHealth };
    }
    
    this.attributes.health = newHealth;
    return { success: true, newHealth };
  }

  /**
   * 修改体力
   */
  modifyStamina(amount: number): { success: boolean; newStamina: number } {
    const newStamina = Math.max(0, Math.min(this.attributes.maxStamina, this.attributes.stamina + amount));
    const actualChange = newStamina - this.attributes.stamina;
    
    if (actualChange === 0 && amount !== 0) {
      return { success: false, newStamina };
    }
    
    this.attributes.stamina = newStamina;
    return { success: true, newStamina };
  }

  /**
   * 检查是否存活
   */
  isAlive(): boolean {
    return this.attributes.health > 0;
  }

  /**
   * 计算战斗伤害
   */
  calculateDamage(targetDefense: number): { damage: number; isCrit: boolean } {
    const baseDamage = this.attributes.attack;
    const defenseReduction = Math.min(0.5, targetDefense / (targetDefense + 100));
    
    // 暴击判定
    const isCrit = Math.random() * 100 < this.attributes.critRate;
    const critMultiplier = isCrit ? 1.5 : 1;
    
    // 计算最终伤害
    const damage = Math.floor(baseDamage * (1 - defenseReduction) * critMultiplier);
    
    return { damage: Math.max(1, damage), isCrit };
  }

  /**
   * 计算受到的伤害
   */
  calculateReceivedDamage(baseDamage: number): { damage: number; isDodged: boolean } {
    // 闪避判定
    const isDodged = Math.random() * 100 < this.attributes.dodgeRate;
    
    if (isDodged) {
      return { damage: 0, isDodged: true };
    }
    
    // 防御减免
    const defenseReduction = Math.min(0.5, this.attributes.defense / (this.attributes.defense + 100));
    const damage = Math.floor(baseDamage * (1 - defenseReduction));
    
    return { damage: Math.max(1, damage), isDodged: false };
  }

  /**
   * 恢复生命值
   */
  heal(amount: number): number {
    const { newHealth } = this.modifyHealth(amount);
    return newHealth - this.attributes.health;
  }

  /**
   * 恢复体力
   */
  rest(amount: number): number {
    const { newStamina } = this.modifyStamina(amount);
    return newStamina - this.attributes.stamina;
  }

  /**
   * 完全恢复
   */
  fullyRestore(): void {
    this.attributes.health = this.attributes.maxHealth;
    this.attributes.stamina = this.attributes.maxStamina;
  }

  /**
   * 设置属性加成
   */
  applyBonus(type: keyof PlayerAttributes, value: number): void {
    if (type in this.attributes) {
      (this.attributes as any)[type] += value;
      
      // 应用上限
      if (type === 'critRate' || type === 'dodgeRate') {
        (this.attributes as any)[type] = Math.min(ATTRIBUTE_LIMITS[type], (this.attributes as any)[type]);
      } else if (type in ATTRIBUTE_LIMITS) {
        (this.attributes as any)[type] = Math.min(ATTRIBUTE_LIMITS[type], (this.attributes as any)[type]);
      }
    }
  }

  /**
   * 序列化属性数据
   */
  serialize(): PlayerAttributes {
    return { ...this.attributes };
  }

  /**
   * 反序列化属性数据
   */
  deserialize(data: PlayerAttributes): void {
    this.attributes = { ...data };
  }

  /**
   * 从游戏状态加载
   */
  loadFromGameState(gameState: GameState): void {
    this.attributes = { ...gameState.player };
  }

  /**
   * 保存到游戏状态
   */
  saveToGameState(gameState: GameState): GameState {
    return {
      ...gameState,
      player: this.serialize(),
    };
  }

  /**
   * 获取属性详情（用于 UI 显示）
   */
  getStatsDetail(): Record<string, string> {
    return {
      '等级': `Lv.${this.attributes.level}`,
      '经验值': `${this.attributes.exp} / ${this.getExpToNextLevel()}`,
      '生命值': `${this.attributes.health} / ${this.attributes.maxHealth}`,
      '体力': `${this.attributes.stamina} / ${this.attributes.maxStamina}`,
      '攻击力': this.attributes.attack.toString(),
      '防御力': this.attributes.defense.toString(),
      '暴击率': `${this.attributes.critRate.toFixed(1)}%`,
      '闪避率': `${this.attributes.dodgeRate.toFixed(1)}%`,
    };
  }
}

export default PlayerSystem;
