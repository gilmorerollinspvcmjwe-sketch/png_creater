/**
 * 数值平衡配置
 * WeChat Survival Phase 1 数值平衡表
 */

/**
 * 资源产出/消耗表
 */
export const RESOURCE_BALANCE = {
  // 基础产出（每天）
  production: {
    food: 5,
    water: 5,
    medicine: 1,
    ammo: 2,
    scrap: 3,
    wood: 3,
    caps: 10,
  },
  
  // 基础消耗（每人每天）
  consumption: {
    food: 3,
    water: 2,
    medicine: 0.5,
  },
  
  // 存储上限
  limits: {
    food: 100,
    water: 100,
    medicine: 50,
    ammo: 200,
    scrap: 200,
    wood: 200,
    caps: 9999,
  },
  
  // 探索获取（平均值）
  exploration_gain: {
    low_risk: { food: 3, water: 2, scrap: 1 },
    medium_risk: { food: 5, water: 3, ammo: 2 },
    high_risk: { food: 8, water: 5, ammo: 5, caps: 20 },
  },
};

/**
 * 敌人属性配置
 */
export const ENEMY_STATS = {
  zombie: {
    base: {
      hp: 30,
      attack: 5,
      defense: 2,
      critRate: 0,
      dodgeRate: 0,
      expReward: 10,
    },
    growthPerLevel: {
      hp: 3,
      attack: 0.5,
      defense: 0.2,
      expReward: 2,
    },
  },
  
  mutant: {
    base: {
      hp: 80,
      attack: 15,
      defense: 5,
      critRate: 10,
      dodgeRate: 5,
      expReward: 50,
    },
    growthPerLevel: {
      hp: 8,
      attack: 1.5,
      defense: 0.5,
      expReward: 5,
    },
  },
  
  raider: {
    base: {
      hp: 40,
      attack: 10,
      defense: 3,
      critRate: 5,
      dodgeRate: 5,
      expReward: 20,
    },
    growthPerLevel: {
      hp: 4,
      attack: 1,
      defense: 0.3,
      expReward: 3,
    },
  },
  
  boss: {
    base: {
      hp: 200,
      attack: 25,
      defense: 10,
      critRate: 15,
      dodgeRate: 10,
      expReward: 200,
    },
    growthPerLevel: {
      hp: 20,
      attack: 2.5,
      defense: 1,
      expReward: 20,
    },
  },
};

/**
 * 难度曲线配置
 */
export const DIFFICULTY_CURVE = {
  // 天数区间推荐
  day_ranges: [
    { min: 1, max: 7, recommendedLevel: [1, 5], enemyStrength: 'easy', resourceNeed: 'low' },
    { min: 8, max: 14, recommendedLevel: [5, 10], enemyStrength: 'medium', resourceNeed: 'medium' },
    { min: 15, max: 21, recommendedLevel: [10, 15], enemyStrength: 'hard', resourceNeed: 'high' },
    { min: 22, max: 30, recommendedLevel: [15, 20], enemyStrength: 'very_hard', resourceNeed: 'very_high' },
  ],
  
  // 事件类型分布
  event_distribution: {
    days_1_7: { explore: 0.6, combat: 0.2, random: 0.2 },
    days_8_14: { explore: 0.5, combat: 0.3, random: 0.2 },
    days_15_21: { explore: 0.4, combat: 0.4, random: 0.2 },
    days_22_30: { explore: 0.3, combat: 0.5, random: 0.2 },
  },
};

/**
 * 升级经验需求表
 */
export const EXP_REQUIREMENTS = {
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
  16: 85293,
  17: 127940,
  18: 191910,
  19: 287865,
  20: 431798,
};

/**
 * 属性成长配置
 */
export const ATTRIBUTE_GROWTH = {
  per_level: {
    health: 5,
    stamina: 2,
    attack: 2,
    defense: 1,
    critRate: 0.5,
    dodgeRate: 0.5,
  },
  
  limits: {
    health: 500,
    stamina: 200,
    attack: 100,
    defense: 50,
    critRate: 30,
    dodgeRate: 30,
  },
};

/**
 * 任务奖励配置
 */
export const QUEST_REWARDS = {
  main: {
    MAIN_01: { exp: 100, unlock: 'shelter_build' },
    MAIN_02: { exp: 200, item: 'iron_knife' },
    MAIN_03: { exp: 300, unlock: 'npc_system' },
    MAIN_04: { exp: 500, resource: { medicine: 10 } },
    MAIN_05: { exp: 2000, unlock: 'ending_1' },
  },
  
  side: {
    resource_collection: { exp: 100, resource_bonus: 'medium' },
    combat_challenge: { exp: 200, item_reward: 'weapon_blueprint' },
    exploration: { exp: 150, unlock: 'new_area' },
    npc_relation: { exp: 80, unlock: 'special_ability' },
  },
};

/**
 * 战斗公式
 */
export const COMBAT_FORMULAS = {
  // 伤害计算
  damage: (attack: number, defense: number) => {
    const defenseReduction = Math.min(0.5, defense / (defense + 100));
    return Math.floor(attack * (1 - defenseReduction));
  },
  
  // 暴击伤害
  critDamage: (baseDamage: number) => {
    return Math.floor(baseDamage * 1.5);
  },
  
  // 闪避概率
  dodge: (dodgeRate: number) => {
    return Math.random() * 100 < dodgeRate;
  },
  
  // 逃跑成功率
  fleeChance: (playerLevel: number, avgEnemyLevel: number, enemyCount: number) => {
    return Math.min(0.9, Math.max(0.3, 0.5 + (playerLevel - avgEnemyLevel) * 0.1 - enemyCount * 0.1));
  },
};

/**
 * 经济系统配置
 */
export const ECONOMY = {
  // 交易价格
  prices: {
    food: { buy: 2, sell: 1 },
    water: { buy: 2, sell: 1 },
    medicine: { buy: 10, sell: 5 },
    ammo: { buy: 3, sell: 1 },
    scrap: { buy: 2, sell: 1 },
    wood: { buy: 2, sell: 1 },
  },
  
  // 商人刷新
  merchant: {
    spawnChance: 0.05, // 5% 概率
    minDaysBetween: 3,
    maxDaysBetween: 5,
  },
};

/**
 * 避难所升级配置
 */
export const SHELTER_UPGRADE = {
  levels: [
    { level: 1, cost: { wood: 0, scrap: 0 }, maxSpace: 10, npcSlots: 2 },
    { level: 2, cost: { wood: 50, scrap: 30 }, maxSpace: 15, npcSlots: 3 },
    { level: 3, cost: { wood: 100, scrap: 60 }, maxSpace: 20, npcSlots: 4 },
    { level: 4, cost: { wood: 200, scrap: 120 }, maxSpace: 25, npcSlots: 5 },
    { level: 5, cost: { wood: 400, scrap: 240 }, maxSpace: 30, npcSlots: 6 },
  ],
};

/**
 * 掉落表配置
 */
export const LOOT_TABLES = {
  zombie: [
    { itemId: 'rotten_meat', probability: 0.3, minAmount: 1, maxAmount: 2 },
    { itemId: 'cloth', probability: 0.2, minAmount: 1, maxAmount: 1 },
  ],
  
  mutant: [
    { itemId: 'mutant_gland', probability: 0.5, minAmount: 1, maxAmount: 1 },
    { itemId: 'scrap', probability: 0.3, minAmount: 2, maxAmount: 5 },
  ],
  
  raider: [
    { itemId: 'caps', probability: 0.5, minAmount: 5, maxAmount: 15 },
    { itemId: 'ammo', probability: 0.3, minAmount: 3, maxAmount: 6 },
  ],
  
  boss: [
    { itemId: 'rare_weapon', probability: 0.3, minAmount: 1, maxAmount: 1 },
    { itemId: 'caps', probability: 1, minAmount: 50, maxAmount: 100 },
    { itemId: 'medicine', probability: 0.5, minAmount: 3, maxAmount: 5 },
  ],
};

/**
 * 事件触发概率
 */
export const EVENT_PROBABILITIES = {
  explore: {
    resource_discovery: 0.15,
    encounter: 0.1,
    choice: 0.08,
  },
  
  combat: {
    small_group: 0.2,
    medium_group: 0.08,
    large_group: 0.03,
    boss: 0.01,
  },
  
  random: {
    weather: 0.1,
    airdrop: 0.05,
    refugee: 0.08,
    disease: 0.05,
    trader: 0.05,
    earthquake: 0.03,
    good_news: 0.15,
  },
};

// 导出所有配置
export const BALANCE_CONFIG = {
  RESOURCE_BALANCE,
  ENEMY_STATS,
  DIFFICULTY_CURVE,
  EXP_REQUIREMENTS,
  ATTRIBUTE_GROWTH,
  QUEST_REWARDS,
  COMBAT_FORMULAS,
  ECONOMY,
  SHELTER_UPGRADE,
  LOOT_TABLES,
  EVENT_PROBABILITIES,
};

export default BALANCE_CONFIG;
