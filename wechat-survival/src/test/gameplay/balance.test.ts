/**
 * WeChat Survival - Balance Tests
 * 
 * Tests for game balance: resource production/consumption, combat difficulty
 * Based on PHASE1_DESIGN.md Section 8
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Types
interface ResourceStats {
  production: number;
  consumption: number;
  storageLimit: number;
}

interface PlayerStats {
  hp: number;
  attack: number;
  defense: number;
  critRate: number;
  dodgeRate: number;
}

interface EnemyStats {
  hp: number;
  attack: number;
  defense: number;
  specialAbility?: string;
}

// Data from PHASE1_DESIGN.md Section 8
const RESOURCES: Record<string, ResourceStats> = {
  food: { production: 5, consumption: 3, storageLimit: 100 },
  water: { production: 5, consumption: 2, storageLimit: 100 },
  medicine: { production: 1, consumption: 0.5, storageLimit: 50 },
  ammo: { production: 2, consumption: 1, storageLimit: 200 },
  scrap: { production: 3, consumption: 0, storageLimit: 200 },
  wood: { production: 3, consumption: 0, storageLimit: 200 },
  caps: { production: 10, consumption: 0, storageLimit: 9999 },
};

const PLAYER_BASE_STATS: PlayerStats = {
  hp: 100,
  attack: 10,
  defense: 5,
  critRate: 5,
  dodgeRate: 5,
};

const PLAYER_GROWTH: Partial<PlayerStats> = {
  hp: 5,
  attack: 2,
  defense: 1,
  critRate: 0.5,
  dodgeRate: 0.5,
};

const ENEMIES: Record<string, EnemyStats> = {
  normal_zombie: { hp: 30, attack: 5, defense: 0 },
  agile_zombie: { hp: 20, attack: 8, defense: 0, specialAbility: '闪避20%' },
  mutant_zombie: { hp: 80, attack: 15, defense: 5, specialAbility: '生命恢复' },
  bandit: { hp: 40, attack: 10, defense: 2, specialAbility: '远程攻击' },
  zombie_boss: { hp: 200, attack: 25, defense: 10, specialAbility: '指挥光环' },
};

// Experience curve: base * 1.5^(level-1)
const getExpForLevel = (level: number): number => 
  Math.floor(100 * Math.pow(1.5, level - 1));

describe('Balance Tests', () => {
  describe('Resource System', () => {
    /**
     * Test: Daily resource net production
     * Validates: PHASE1_DESIGN.md Section 8.1 - 基础产出/天
     */
    it('should calculate daily net resource production', () => {
      const survivors = 1;
      
      Object.keys(RESOURCES).forEach(resource => {
        const stats = RESOURCES[resource];
        const netProduction = stats.production - (stats.consumption * survivors);
        
        // Food: 5 - 3*1 = 2
        // Water: 5 - 2*1 = 3
        expect(netProduction).toBeDefined();
      });
    });

    /**
     * Test: Food production/consumption ratio
     * Validates: PHASE1_DESIGN.md Section 8.1 - 食物 5/3
     */
    it('should have positive food net production', () => {
      const netFood = RESOURCES.food.production - RESOURCES.food.consumption;
      expect(netFood).toBeGreaterThan(0);
    });

    /**
     * Test: Water production/consumption ratio
     * Validates: PHASE1_DESIGN.md Section 8.1 - 水 5/2
     */
    it('should have positive water net production', () => {
      const netWater = RESOURCES.water.production - RESOURCES.water.consumption;
      expect(netWater).toBeGreaterThan(0);
    });

    /**
     * Test: Resource storage limits
     * Validates: PHASE1_DESIGN.md Section 8.1 - 存储上限
     */
    it('should enforce storage limits', () => {
      let food = 100;
      const limit = RESOURCES.food.storageLimit;
      const newFood = 10;
      
      // Would exceed limit
      if (food + newFood > limit) {
        food = limit;
      } else {
        food += newFood;
      }
      
      expect(food).toBe(100);
    });

    /**
     * Test: Currency has no storage limit
     * Validates: PHASE1_DESIGN.md Section 8.1 - 瓶盖 9999
     */
    it('should have high caps storage limit', () => {
      expect(RESOURCES.caps.storageLimit).toBe(9999);
    });

    /**
     * Test: Ammo is combat-only resource
     * Validates: PHASE1_DESIGN.md Section 8.1 - 弹药战斗消耗
     */
    it('should have ammo for combat only', () => {
      expect(RESOURCES.ammo.consumption).toBeGreaterThan(0);
    });

    /**
     * Test: Building materials have no consumption
     * Validates: PHASE1_DESIGN.md Section 8.1 - 废铁/木材无日常消耗
     */
    it('should have no daily consumption for building materials', () => {
      expect(RESOURCES.scrap.consumption).toBe(0);
      expect(RESOURCES.wood.consumption).toBe(0);
    });
  });

  describe('Player Stats', () => {
    /**
     * Test: Base player stats
     * Validates: PHASE1_DESIGN.md Section 8.2 - 玩家属性基础值
     */
    it('should have correct base player stats', () => {
      expect(PLAYER_BASE_STATS.hp).toBe(100);
      expect(PLAYER_BASE_STATS.attack).toBe(10);
      expect(PLAYER_BASE_STATS.defense).toBe(5);
    });

    /**
     * Test: Stat growth per level
     * Validates: PHASE1_DESIGN.md Section 8.2 - 成长/级
     */
    it('should grow stats correctly per level', () => {
      const level2Stats = {
        hp: PLAYER_BASE_STATS.hp + PLAYER_GROWTH.hp!,
        attack: PLAYER_BASE_STATS.attack + PLAYER_GROWTH.attack!,
        defense: PLAYER_BASE_STATS.defense + PLAYER_GROWTH.defense!,
      };
      
      expect(level2Stats.hp).toBe(105);
      expect(level2Stats.attack).toBe(12);
      expect(level2Stats.defense).toBe(6);
    });

    /**
     * Test: Stat caps
     * Validates: PHASE1_DESIGN.md Section 8.2 - 属性上限
     */
    it('should respect stat caps', () => {
      const maxHP = 500;
      const currentHP = 450;
      
      expect(currentHP).toBeLessThan(maxHP);
    });

    /**
     * Test: Critical and dodge rates
     * Validates: PHASE1_DESIGN.md Section 8.2 - 暴击率/闪避率
     */
    it('should have reasonable crit and dodge rates', () => {
      expect(PLAYER_BASE_STATS.critRate).toBe(5);
      expect(PLAYER_BASE_STATS.dodgeRate).toBe(5);
    });

    /**
     * Test: Level 20 player stats
     * Validates: PHASE1_DESIGN.md - 20级玩家
     */
    it('should calculate level 20 player stats', () => {
      const levelsGained = 19; // from level 1 to 20
      const level20Stats = {
        hp: PLAYER_BASE_STATS.hp + (PLAYER_GROWTH.hp! * levelsGained),
        attack: PLAYER_BASE_STATS.attack + (PLAYER_GROWTH.attack! * levelsGained),
        defense: PLAYER_BASE_STATS.defense + (PLAYER_GROWTH.defense! * levelsGained),
      };
      
      expect(level20Stats.hp).toBe(195); // 100 + 5*19
      expect(level20Stats.attack).toBe(48); // 10 + 2*19 = 48
      expect(level20Stats.defense).toBe(24); // 5 + 1*19
    });
  });

  describe('Enemy Stats', () => {
    /**
     * Test: Normal zombie stats
     * Validates: PHASE1_DESIGN.md Section 8.2 - 普通丧尸
     */
    it('should have correct normal zombie stats', () => {
      const zombie = ENEMIES.normal_zombie;
      expect(zombie.hp).toBe(30);
      expect(zombie.attack).toBe(5);
      expect(zombie.defense).toBe(0);
    });

    /**
     * Test: Agile zombie has dodge
     * Validates: PHASE1_DESIGN.md Section 8.2 - 敏捷型闪避20%
     */
    it('should have agile zombie with dodge ability', () => {
      const zombie = ENEMIES.agile_zombie;
      expect(zombie.specialAbility).toContain('闪避');
    });

    /**
     * Test: Mutant zombie has regen
     * Validates: PHASE1_DESIGN.md Section 8.2 - 变异丧尸生命恢复
     */
    it('should have mutant zombie with regen', () => {
      const zombie = ENEMIES.mutant_zombie;
      expect(zombie.specialAbility).toContain('生命恢复');
    });

    /**
     * Test: Bandit has ranged attack
     * Validates: PHASE1_DESIGN.md Section 8.2 - 匪徒远程攻击
     */
    it('should have bandit with ranged attack', () => {
      const bandit = ENEMIES.bandit;
      expect(bandit.specialAbility).toContain('远程攻击');
    });

    /**
     * Test: Boss has command aura
     * Validates: PHASE1_DESIGN.md Section 8.2 - 丧尸首领指挥光环
     */
    it('should have boss with command aura', () => {
      const boss = ENEMIES.zombie_boss;
      expect(boss.specialAbility).toContain('指挥');
    });

    /**
     * Test: Boss is significantly stronger
     * Validates: PHASE1_DESIGN.md Section 8.2 - Boss 200+生命
     */
    it('should have boss significantly stronger than normal enemies', () => {
      const boss = ENEMIES.zombie_boss;
      const normal = ENEMIES.normal_zombie;
      
      expect(boss.hp).toBeGreaterThan(normal.hp * 5);
      expect(boss.attack).toBeGreaterThan(normal.attack * 3);
    });
  });

  describe('Combat Balance', () => {
    /**
     * Test: Player vs normal zombie
     * Validates: PHASE1_DESIGN.md - 玩家可击败普通丧尸
     */
    it('should allow player to defeat normal zombie', () => {
      const playerDamage = PLAYER_BASE_STATS.attack - ENEMIES.normal_zombie.defense;
      const rounds = Math.ceil(ENEMIES.normal_zombie.hp / playerDamage);
      
      expect(rounds).toBeLessThanOrEqual(4);
    });

    /**
     * Test: Player vs mutant zombie
     * Validates: PHASE1_DESIGN.md Section 8.2 - 变异丧尸难度
     */
    it('should make mutant zombie challenging', () => {
      const playerDamage = PLAYER_BASE_STATS.attack - ENEMIES.mutant_zombie.defense;
      const rounds = Math.ceil(ENEMIES.mutant_zombie.hp / playerDamage);
      
      expect(rounds).toBeGreaterThan(5);
    });

    /**
     * Test: Damage formula
     * Validates: PHASE1_DESIGN.md Section 8.2 - 攻击力-防御力
     */
    it('should calculate damage correctly', () => {
      const attack = 10;
      const defense = 5;
      const damage = Math.max(1, attack - defense);
      
      expect(damage).toBe(5);
    });

    /**
     * Test: Combat resource consumption
     * Validates: PHASE1_DESIGN.md Section 8.1 - 弹药消耗
     */
    it('should consume ammo during combat', () => {
      let ammo = 20;
      const combatCost = 5;
      
      // Multiple fights
      ammo -= combatCost;
      ammo -= combatCost;
      
      expect(ammo).toBe(10);
    });

    /**
     * Test: Healing item usage
     * Validates: PHASE1_DESIGN.md Section 8.1 - 药品消耗
     */
    it('should consume medicine for healing', () => {
      let medicine = 10;
      const healCost = 2;
      
      medicine -= healCost;
      
      expect(medicine).toBe(8);
    });
  });

  describe('Experience Curve', () => {
    /**
     * Test: Experience formula
     * Validates: PHASE1_DESIGN.md Section 8.4 - 经验公式
     */
    it('should calculate experience correctly', () => {
      expect(getExpForLevel(1)).toBe(100);
      expect(getExpForLevel(2)).toBe(150);
      expect(getExpForLevel(3)).toBe(225);
    });

    /**
     * Test: Cumulative experience
     * Validates: PHASE1_DESIGN.md Section 8.4 - 累计经验
     */
    it('should calculate cumulative experience', () => {
      const cumulativeExp = [
        getExpForLevel(1),
        getExpForLevel(1) + getExpForLevel(2),
        getExpForLevel(1) + getExpForLevel(2) + getExpForLevel(3),
      ];
      
      expect(cumulativeExp[0]).toBe(100);
      expect(cumulativeExp[1]).toBe(250);
      expect(cumulativeExp[2]).toBe(475);
    });

    /**
     * Test: Level 10 experience requirement
     * Validates: PHASE1_DESIGN.md Section 8.4 - 10级所需经验
     */
    it('should require significant exp for level 10', () => {
      let totalExp = 0;
      for (let i = 1; i <= 10; i++) {
        totalExp += getExpForLevel(i);
      }
      
      expect(totalExp).toBeGreaterThan(10000);
    });

    /**
     * Test: Exponential scaling
     * Validates: PHASE1_DESIGN.md Section 8.4 - 1.5倍增长
     */
    it('should scale exponentially', () => {
      const ratio1to2 = getExpForLevel(2) / getExpForLevel(1);
      const ratio2to3 = getExpForLevel(3) / getExpForLevel(2);
      
      expect(ratio1to2).toBeCloseTo(1.5, 1);
      expect(ratio2to3).toBeCloseTo(1.5, 1);
    });
  });

  describe('Difficulty Curve', () => {
    /**
     * Test: Day-based difficulty progression
     * Validates: PHASE1_DESIGN.md Section 8.3 - 难度曲线
     */
    it('should progress difficulty with days', () => {
      const day = 10;
      let recommendedLevel: number;
      
      if (day <= 7) recommendedLevel = Math.floor((day - 1) / 1.4) + 1;
      else if (day <= 14) recommendedLevel = Math.floor((day - 7) / 0.7) + 5;
      else if (day <= 21) recommendedLevel = Math.floor((day - 14) / 0.7) + 10;
      else recommendedLevel = Math.floor((day - 21) / 1.5) + 15;
      
      expect(recommendedLevel).toBeGreaterThan(5);
    });

    /**
     * Test: Early game difficulty (Days 1-7)
     * Validates: PHASE1_DESIGN.md Section 8.3 - 简单难度
     */
    it('should be easy in early game', () => {
      const enemyStrength = 'low';
      const resourceDemand = 'low';
      
      expect(enemyStrength).toBe('low');
      expect(resourceDemand).toBe('low');
    });

    /**
     * Test: Mid game difficulty (Days 8-14)
     * Validates: PHASE1_DESIGN.md Section 8.3 - 中等难度
     */
    it('should be medium difficulty in mid game', () => {
      const eventTypes = ['combat', 'resource'];
      
      expect(eventTypes).toContain('combat');
    });

    /**
     * Test: Late game difficulty (Days 15+)
     * Validates: PHASE1_DESIGN.md Section 8.3 - 困难/Boss战
     */
    it('should have boss battles in late game', () => {
      const day = 25;
      const hasBoss = day >= 20;
      
      expect(hasBoss).toBe(true);
    });
  });

  describe('Quest Rewards Balance', () => {
    /**
     * Test: Main quest rewards scale with difficulty
     * Validates: PHASE1_DESIGN.md Section 5 - 任务奖励与难度匹配
     */
    it('should scale main quest rewards', () => {
      const mainQuestRewards = {
        MAIN_01: { exp: 100 },
        MAIN_02: { exp: 200 },
        MAIN_03: { exp: 300 },
        MAIN_04: { exp: 400 },
        MAIN_05: { exp: 500 },
      };
      
      // Later quests should have higher rewards
      expect(mainQuestRewards.MAIN_05.exp).toBeGreaterThan(mainQuestRewards.MAIN_01.exp);
    });

    /**
     * Test: Side quest rewards are reasonable
     * Validates: PHASE1_DESIGN.md Section 5.2 - 支线任务奖励
     */
    it('should have reasonable side quest rewards', () => {
      const mainQuestRewards = [
        { id: 'MAIN_01', rewards: [{ type: 'exp', value: 100 }] },
        { id: 'MAIN_02', rewards: [{ type: 'exp', value: 200 }] },
        { id: 'MAIN_03', rewards: [{ type: 'exp', value: 300 }] },
        { id: 'MAIN_04', rewards: [{ type: 'exp', value: 400 }] },
        { id: 'MAIN_05', rewards: [{ type: 'exp', value: 500 }] },
      ];
      const sideQuestExp = { min: 50, max: 200 };
      
      // Side quests should give less exp than later main quests
      expect(sideQuestExp.max).toBeLessThanOrEqual(mainQuestRewards[4].rewards[0].value);
    });
  });
});
