/**
 * 游戏数值计算工具函数
 */

import type { Resources, OfflineData, OfflineGain, ScavengeGain, Maid, Facility } from '../types/game';

/**
 * 最大离线时间（7 天，单位：秒）
 */
const MAX_OFFLINE_SECONDS = 7 * 24 * 60 * 60;

/**
 * 基础资源产出配置（每秒）
 */
const BASE_PRODUCTION: Resources = {
  food: 1,
  wood: 0.5,
  iron: 0.2,
  crystal: 0.01,
};

/**
 * 计算资源产出倍率
 * @param facilities 设施列表
 * @param maids 女仆列表
 * @returns 总倍率（设施加成 × 女仆加成）
 */
function getProductionMultiplier(
  facilities: Facility[],
  maids: Maid[]
): number {
  // 设施加成
  const facilityMultiplier = facilities.reduce((mult, facility) => {
    return mult * (1 + (facility.productionBonus || 0) / 100);
  }, 1);
  
  // 女仆加成
  const maidMultiplier = maids.reduce((mult, maid) => {
    return mult * (1 + maid.stats.production / 100);
  }, 1);
  
  return facilityMultiplier * maidMultiplier;
}

/**
 * 计算离线资源收益
 */
function calculateResourceGain(
  offlineSeconds: number,
  ironHouseLevel: number,
  facilities: Facility[],
  maids: Maid[]
): Resources {
  const multiplier = getProductionMultiplier(facilities, maids);
  
  // 铁屋等级加成（每级 +5%）
  const levelBonus = 1 + (ironHouseLevel - 1) * 0.05;
  
  return {
    food: Math.floor(BASE_PRODUCTION.food * offlineSeconds * multiplier * levelBonus),
    wood: Math.floor(BASE_PRODUCTION.wood * offlineSeconds * multiplier * levelBonus),
    iron: Math.floor(BASE_PRODUCTION.iron * offlineSeconds * multiplier * levelBonus),
    crystal: Math.floor(BASE_PRODUCTION.crystal * offlineSeconds * multiplier * levelBonus),
  };
}

/**
 * 计算拾荒收益
 */
function calculateScavengingGain(
  _offlineSeconds: number,
  teams: any[] // ScavengingTeam[]
): ScavengeGain[] {
  return teams
    .filter(team => team.status === 'scavenging' || team.status === 'completed')
    .map(team => {
      // 简化的拾荒收益计算
      const baseGain: Resources = {
        food: 10,
        wood: 5,
        iron: 2,
        crystal: 0.1,
      };
      
      // 队伍效率（基于女仆拾荒属性）
      const teamEfficiency = 1 + (team.maidStats?.scavenging || 0) / 100;
      
      // 区域系数（简化为 1-3 倍）
      const areaMultiplier = 1 + (team.areaId - 1) * 0.5;
      
      const gain: Resources = {
        food: Math.floor(baseGain.food * teamEfficiency * areaMultiplier),
        wood: Math.floor(baseGain.wood * teamEfficiency * areaMultiplier),
        iron: Math.floor(baseGain.iron * teamEfficiency * areaMultiplier),
        crystal: Math.floor(baseGain.crystal * teamEfficiency * areaMultiplier),
      };
      
      return {
        resources: gain,
        risk: {
          loss: 0,
          hasRareItem: Math.random() < 0.1, // 10% 概率获得稀有物品
        },
      };
    });
}

/**
 * 计算离线收益（核心函数）
 * @param config 离线数据配置
 * @param now 当前时间戳（毫秒），可选，默认为 Date.now()
 * @returns 离线收益结果
 */
export function calculateOfflineGain(config: OfflineData, now?: number): OfflineGain {
  const currentTime = now ?? Date.now();
  const offlineSeconds = Math.min(
    Math.floor((currentTime - config.lastLoginTime) / 1000),
    MAX_OFFLINE_SECONDS
  );
  
  if (offlineSeconds <= 0) {
    return {
      resources: { food: 0, wood: 0, iron: 0, crystal: 0 },
      scavenging: [],
      battle: [],
      totalSeconds: 0,
      summary: '欢迎回来！',
    };
  }
  
  // 计算资源产出
  const resourceGain = calculateResourceGain(
    offlineSeconds,
    config.ironHouseLevel,
    config.facilities,
    config.maids
  );
  
  // 计算拾荒收益
  const scavengingGain = calculateScavengingGain(offlineSeconds, config.scavengingTeams);
  
  // 汇总拾荒资源
  const scavengingResources: Resources = scavengingGain.reduce(
    (acc, gain) => ({
      food: acc.food + gain.resources.food,
      wood: acc.wood + gain.resources.wood,
      iron: acc.iron + gain.resources.iron,
      crystal: acc.crystal + gain.resources.crystal,
    }),
    { food: 0, wood: 0, iron: 0, crystal: 0 }
  );
  
  // 总资源
  const totalResources: Resources = {
    food: resourceGain.food + scavengingResources.food,
    wood: resourceGain.wood + scavengingResources.wood,
    iron: resourceGain.iron + scavengingResources.iron,
    crystal: resourceGain.crystal + scavengingResources.crystal,
  };
  
  // 生成摘要
  const summary = generateGainSummary(offlineSeconds, totalResources, scavengingGain.length);
  
  return {
    resources: totalResources,
    scavenging: scavengingGain,
    battle: [], // 战斗收益在登录时单独计算
    totalSeconds: offlineSeconds,
    summary,
  };
}

/**
 * 生成收益摘要
 */
function generateGainSummary(
  seconds: number,
  resources: Resources,
  scavengingCount: number
): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let summary = `离线${hours > 0 ? hours + '小时' : ''}${minutes > 0 ? minutes + '分钟' : '片刻'}，`;
  summary += `获得食物${resources.food}、木材${resources.wood}、铁矿${resources.iron}、魂晶${resources.crystal.toFixed(1)}`;
  
  if (scavengingCount > 0) {
    summary += `，拾荒队伍完成${scavengingCount}次任务`;
  }
  
  return summary + '。';
}

/**
 * 计算铁屋升级所需资源
 * @param currentLevel 当前等级
 * @returns 所需资源
 */
export function getUpgradeCost(currentLevel: number): Resources {
  const base = { food: 100, wood: 100, iron: 50 };
  const multiplier = Math.pow(1.15, currentLevel - 1);
  
  return {
    food: Math.floor(base.food * multiplier),
    wood: Math.floor(base.wood * multiplier),
    iron: Math.floor(base.iron * multiplier),
    crystal: 0,
  };
}

/**
 * 计算铁屋升级所需时间（秒）
 * @param currentLevel 当前等级
 * @returns 秒数
 */
export function getUpgradeTime(currentLevel: number): number {
  // 基础时间 60 秒，每级 +10 秒
  return 60 + (currentLevel - 1) * 10;
}

/**
 * 检查资源是否足够
 * @param current 当前资源
 * @param required 所需资源
 * @returns 是否足够
 */
export function hasEnoughResources(current: Resources, required: Resources): boolean {
  return (
    current.food >= required.food &&
    current.wood >= required.wood &&
    current.iron >= required.iron &&
    current.crystal >= required.crystal
  );
}

/**
 * 扣除资源
 * @param current 当前资源
 * @param cost 消耗资源
 * @returns 扣除后的资源
 */
export function deductResources(current: Resources, cost: Resources): Resources {
  return {
    food: Math.max(0, current.food - cost.food),
    wood: Math.max(0, current.wood - cost.wood),
    iron: Math.max(0, current.iron - cost.iron),
    crystal: Math.max(0, current.crystal - cost.crystal),
  };
}

/**
 * 增加资源
 * @param current 当前资源
 * @param gain 获得资源
 * @returns 增加后的资源
 */
export function addResources(current: Resources, gain: Resources): Resources {
  return {
    food: current.food + gain.food,
    wood: current.wood + gain.wood,
    iron: current.iron + gain.iron,
    crystal: current.crystal + gain.crystal,
  };
}
