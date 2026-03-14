/**
 * 战斗系统 - 回合制战斗逻辑
 */

import { CombatEnemy, CombatState, CombatLogEntry, PlayerAttributes, LootItem, GameState } from './types';
import { PlayerSystem } from './playerSystem';

/**
 * 战斗系统类
 */
export class CombatSystem {
  private combatState: CombatState | null = null;
  private playerSystem: PlayerSystem;

  constructor(playerSystem: PlayerSystem) {
    this.playerSystem = playerSystem;
  }

  /**
   * 开始战斗
   */
  startCombat(enemies: CombatEnemy[]): CombatState {
    this.combatState = {
      isInCombat: true,
      enemies: enemies.map(e => ({ ...e })), // 复制敌人数据
      playerTurn: true,
      combatLog: [],
      round: 1,
    };

    this.logCombat('战斗开始！', 'player');
    
    // 记录敌人信息
    enemies.forEach(enemy => {
      this.logCombat(`${enemy.name} (Lv.${enemy.level}) 出现了！`, 'enemy', enemy.id);
    });

    return this.combatState;
  }

  /**
   * 玩家攻击
   */
  playerAttack(targetEnemyId: string): CombatState {
    if (!this.combatState || !this.combatState.playerTurn) {
      return this.combatState!;
    }

    const enemy = this.combatState.enemies.find(e => e.id === targetEnemyId);
    if (!enemy) {
      return this.combatState;
    }

    const playerAttrs = this.playerSystem.getAttributes();
    
    // 计算伤害
    const defenseReduction = Math.min(0.5, enemy.defense / (enemy.defense + 100));
    const isCrit = Math.random() * 100 < playerAttrs.critRate;
    const critMultiplier = isCrit ? 1.5 : 1;
    const damage = Math.floor(playerAttrs.attack * (1 - defenseReduction) * critMultiplier);
    const actualDamage = Math.max(1, damage);

    // 应用伤害
    enemy.hp -= actualDamage;
    if (enemy.hp < 0) enemy.hp = 0;

    // 记录战斗日志
    const critText = isCrit ? '【暴击】' : '';
    this.logCombat(`${critText}你攻击了 ${enemy.name}，造成 ${actualDamage} 点伤害`, 'player');

    // 检查敌人是否死亡
    if (enemy.hp <= 0) {
      this.logCombat(`${enemy.name} 被击败了！`, 'player');
      this.combatState.enemies = this.combatState.enemies.filter(e => e.id !== targetEnemyId);
      
      // 检查战斗是否结束
      if (this.combatState.enemies.length === 0) {
        this.endCombat('win');
      }
    }

    // 切换到敌人回合
    if (this.combatState.isInCombat) {
      this.combatState.playerTurn = false;
      setTimeout(() => this.enemyTurn(), 500);
    }

    return this.combatState;
  }

  /**
   * 敌人回合
   */
  private enemyTurn(): void {
    if (!this.combatState || !this.combatState.isInCombat) {
      return;
    }

    // 所有存活的敌人攻击
    for (const enemy of this.combatState.enemies) {
      if (enemy.hp <= 0) continue;

      // 计算伤害
      const playerAttrs = this.playerSystem.getAttributes();
      const isDodged = Math.random() * 100 < playerAttrs.dodgeRate;
      
      if (isDodged) {
        this.logCombat(`你闪避了 ${enemy.name} 的攻击！`, 'player');
        continue;
      }

      const defenseReduction = Math.min(0.5, playerAttrs.defense / (playerAttrs.defense + 100));
      const isCrit = Math.random() * 100 < enemy.critRate;
      const critMultiplier = isCrit ? 1.5 : 1;
      const damage = Math.floor(enemy.attack * (1 - defenseReduction) * critMultiplier);
      const actualDamage = Math.max(1, damage);

      // 玩家受到伤害
      this.playerSystem.modifyHealth(-actualDamage);

      // 记录战斗日志
      const critText = isCrit ? '【暴击】' : '';
      this.logCombat(`${critText}${enemy.name} 攻击了你，造成 ${actualDamage} 点伤害`, 'enemy', enemy.id);

      // 检查玩家是否死亡
      if (!this.playerSystem.isAlive()) {
        this.endCombat('lose');
        return;
      }
    }

    // 切换到玩家回合
    if (this.combatState.isInCombat) {
      this.combatState.playerTurn = true;
      this.combatState.round++;
    }
  }

  /**
   * 玩家逃跑
   */
  flee(): { success: boolean; message: string } {
    if (!this.combatState || !this.combatState.playerTurn) {
      return { success: false, message: '现在不能逃跑' };
    }

    // 逃跑成功率基于敌人数量和玩家等级
    const playerLevel = this.playerSystem.getLevel();
    const enemyCount = this.combatState.enemies.length;
    const avgEnemyLevel = this.combatState.enemies.reduce((sum, e) => sum + e.level, 0) / enemyCount;
    
    const fleeChance = Math.min(0.9, Math.max(0.3, 0.5 + (playerLevel - avgEnemyLevel) * 0.1 - enemyCount * 0.1));
    
    if (Math.random() < fleeChance) {
      this.logCombat('逃跑成功！', 'player');
      this.endCombat('flee');
      return { success: true, message: '逃跑成功' };
    } else {
      this.logCombat('逃跑失败！', 'player');
      this.combatState.playerTurn = false;
      setTimeout(() => this.enemyTurn(), 500);
      return { success: false, message: '逃跑失败' };
    }
  }

  /**
   * 使用物品
   */
  useItem(itemId: string, effect: { type: string; value: number }): { success: boolean; message: string } {
    if (!this.combatState || !this.combatState.playerTurn) {
      return { success: false, message: '现在不能使用物品' };
    }

    let message = '';
    
    switch (effect.type) {
      case 'heal':
        const healed = this.playerSystem.heal(effect.value);
        message = `使用了物品，恢复了 ${healed} 点生命值`;
        break;
      case 'stamina':
        const restored = this.playerSystem.rest(effect.value);
        message = `使用了物品，恢复了 ${restored} 点体力`;
        break;
      case 'buff_attack':
        this.playerSystem.applyBonus('attack', effect.value);
        message = `使用了物品，攻击力提升 ${effect.value} 点`;
        break;
      default:
        message = '使用了物品';
    }

    this.logCombat(message, 'player');
    
    this.combatState.playerTurn = false;
    setTimeout(() => this.enemyTurn(), 500);
    
    return { success: true, message };
  }

  /**
   * 结束战斗
   */
  private endCombat(result: 'win' | 'lose' | 'flee'): void {
    if (!this.combatState) return;

    this.combatState.isInCombat = false;
    
    let message = '';
    switch (result) {
      case 'win':
        message = '战斗胜利！';
        break;
      case 'lose':
        message = '战斗失败...';
        break;
      case 'flee':
        message = '成功逃脱';
        break;
    }
    
    this.logCombat(message, 'player');
  }

  /**
   * 记录战斗日志
   */
  private logCombat(message: string, actor: 'player' | 'enemy', actorId?: string): void {
    if (!this.combatState) return;

    const entry: CombatLogEntry = {
      round: this.combatState.round,
      actor,
      actorId,
      action: 'attack',
      message,
    };

    this.combatState.combatLog.push(entry);
    
    // 限制日志长度
    if (this.combatState.combatLog.length > 50) {
      this.combatState.combatLog.shift();
    }
  }

  /**
   * 获取战斗状态
   */
  getCombatState(): CombatState | null {
    return this.combatState;
  }

  /**
   * 检查是否在战斗中
   */
  isInCombat(): boolean {
    return this.combatState?.isInCombat ?? false;
  }

  /**
   * 计算战斗奖励
   */
  calculateRewards(): { exp: number; loot: any[] } {
    if (!this.combatState) {
      return { exp: 0, loot: [] };
    }

    let totalExp = 0;
    const loot: any[] = [];

    // 基于已击败的敌人计算奖励
    // 这里简化处理，实际应该追踪已击败的敌人
    this.combatState.enemies.forEach(enemy => {
      totalExp += enemy.expReward;
      
      // 掉落物品
      enemy.lootTable.forEach(lootItem => {
        if (Math.random() < lootItem.probability) {
          const amount = Math.floor(
            Math.random() * (lootItem.maxAmount - lootItem.minAmount + 1) + lootItem.minAmount
          );
          loot.push({
            itemId: lootItem.itemId,
            name: lootItem.name,
            amount,
          });
        }
      });
    });

    return { exp: totalExp, loot };
  }

  /**
   * 生成敌人
   */
  static generateEnemies(config: {
    count: number;
    baseLevel: number;
    types: ('zombie' | 'mutant' | 'raider' | 'boss')[];
  }): CombatEnemy[] {
    const enemies: CombatEnemy[] = [];
    
    for (let i = 0; i < config.count; i++) {
      const type = config.types[Math.floor(Math.random() * config.types.length)];
      const levelVariation = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
      const level = Math.max(1, config.baseLevel + levelVariation);
      
      enemies.push(CombatSystem.createEnemy(type, level, i));
    }
    
    return enemies;
  }

  /**
   * 创建单个敌人
   */
  static createEnemy(type: 'zombie' | 'mutant' | 'raider' | 'boss', level: number, index: number): CombatEnemy {
    const baseStats: Record<string, any> = {
      zombie: { hp: 30, attack: 5, defense: 2, critRate: 0, dodgeRate: 0, expReward: 10 },
      mutant: { hp: 80, attack: 15, defense: 5, critRate: 10, dodgeRate: 5, expReward: 50 },
      raider: { hp: 40, attack: 10, defense: 3, critRate: 5, dodgeRate: 5, expReward: 20 },
      boss: { hp: 200, attack: 25, defense: 10, critRate: 15, dodgeRate: 10, expReward: 200 },
    };

    const stats = baseStats[type];
    const levelMultiplier = 1 + (level - 1) * 0.1;

    return {
      id: `enemy_${type}_${index}_${Date.now()}`,
      name: CombatSystem.getEnemyName(type),
      type,
      level,
      hp: Math.floor(stats.hp * levelMultiplier),
      maxHp: Math.floor(stats.hp * levelMultiplier),
      attack: Math.floor(stats.attack * levelMultiplier),
      defense: Math.floor(stats.defense * levelMultiplier),
      critRate: stats.critRate,
      dodgeRate: stats.dodgeRate,
      expReward: Math.floor(stats.expReward * levelMultiplier),
      lootTable: CombatSystem.getLootTable(type),
    };
  }

  /**
   * 获取敌人名称
   */
  private static getEnemyName(type: string): string {
    const names: Record<string, string[]> = {
      zombie: ['普通丧尸', '腐烂丧尸', '狂暴丧尸'],
      mutant: ['变异丧尸', '巨型变异体', '腐蚀变异体'],
      raider: ['流浪匪徒', '武装掠夺者', '精英匪兵'],
      boss: ['丧尸首领', '变异体 Boss', '匪徒首领'],
    };
    
    const typeNames = names[type] || ['敌人'];
    return typeNames[Math.floor(Math.random() * typeNames.length)];
  }

  /**
   * 获取掉落表
   */
  private static getLootTable(type: string): LootItem[] {
    const lootTables: Record<string, LootItem[]> = {
      zombie: [
        { itemId: 'rotten_meat', name: '腐肉', probability: 0.3, minAmount: 1, maxAmount: 2 },
        { itemId: 'cloth', name: '破布', probability: 0.2, minAmount: 1, maxAmount: 1 },
      ],
      mutant: [
        { itemId: 'mutant_gland', name: '变异腺体', probability: 0.5, minAmount: 1, maxAmount: 1 },
        { itemId: 'scrap', name: '废铁', probability: 0.3, minAmount: 2, maxAmount: 5 },
      ],
      raider: [
        { itemId: 'caps', name: '瓶盖', probability: 0.5, minAmount: 5, maxAmount: 15 },
        { itemId: 'ammo', name: '子弹', probability: 0.3, minAmount: 3, maxAmount: 6 },
      ],
      boss: [
        { itemId: 'rare_weapon', name: '稀有武器', probability: 0.3, minAmount: 1, maxAmount: 1 },
        { itemId: 'caps', name: '瓶盖', probability: 1, minAmount: 50, maxAmount: 100 },
        { itemId: 'medicine', name: '药品', probability: 0.5, minAmount: 3, maxAmount: 5 },
      ],
    };
    
    return lootTables[type] || [];
  }

  /**
   * 序列化战斗状态
   */
  serialize(): CombatState | null {
    return this.combatState ? { ...this.combatState } : null;
  }

  /**
   * 反序列化战斗状态
   */
  deserialize(data: CombatState | null): void {
    this.combatState = data ? { ...data } : null;
  }
}

export default CombatSystem;
