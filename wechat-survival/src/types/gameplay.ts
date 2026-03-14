/**
 * 后端玩法模块 API 类型定义
 * 与 backend-gameplay 模块的类型保持一致
 */

// ==================== 拾荒模块类型 ====================

export interface ScavengingDispatchRequest {
  userId: string;
  maidIds: string[];
  areaId: number;
  durationSeconds: number;
}

export interface ScavengingCollectRequest {
  userId: string;
  teamId: string;
}

export interface ScavengingTeamResponse {
  id: string;
  userId: string;
  maidIds: string[];
  areaId: number;
  areaName: string;
  dispatchTime: string;
  returnTime: string;
  status: 'idle' | 'scavenging' | 'returning' | 'completed';
  loot?: {
    resources: {
      food: number;
      wood: number;
      iron: number;
      crystal: number;
    };
    items?: string[];
  };
  progress: number;  // 0-100
}

export interface ScavengingAreaResponse {
  id: number;
  name: string;
  type: 'city' | 'suburb' | 'military' | 'underground' | 'special';
  riskLevel: number;  // 1-10
  baseReward: {
    food: number;
    wood: number;
    iron: number;
    crystal: number;
  };
  monsterEncounterRate: number;  // 0-1
  requiredLevel: number;
  description: string;
  unlocked: boolean;
}

// ==================== 战斗模块类型 ====================

export interface DefenseConfigRequest {
  userId: string;
  facilityDefense: number;
  maidIds: string[];
}

export interface CombatRecordResponse {
  id: string;
  userId: string;
  waveType: 'midnight' | 'weekly' | 'blood_moon' | 'abyss';
  defenseValue: number;
  result: 'win' | 'lose' | 'draw';
  reward: {
    food?: number;
    wood?: number;
    iron?: number;
    crystal?: number;
  };
  damageDealt: number;
  damageReceived: number;
  createdAt: string;
}

export interface NextWaveResponse {
  waveType: 'midnight' | 'weekly' | 'blood_moon' | 'abyss';
  name: string;
  nextTime: string;
  difficulty: number;  // 1-10
  monsterCount: {
    min: number;
    max: number;
  };
  bossChance: number;  // 0-1
}

export interface DefenseStatusResponse {
  facilityDefense: number;
  maidDefense: number;
  totalDefense: number;
  buffs: Array<{
    type: string;
    value: number;
    description: string;
  }>;
  nextWave: NextWaveResponse;
}

// ==================== 女仆模块类型 ====================

export type MaidJob = 'scavenger' | 'combat' | 'producer' | 'manager' | 'researcher' | 'support';

export interface MaidStats {
  scavenging: number;
  combat: number;
  production: number;
}

export interface MaidResponse {
  id: string;
  userId: string;
  name: string;
  level: number;
  job: MaidJob;
  favorability: number;  // 0-100
  stats: MaidStats;
  equipment?: {
    weapon?: string;
    armor?: string;
    accessory?: string;
  };
  bonds?: string[];
  createdAt: string;
}

export interface MaidInteractRequest {
  userId: string;
  maidId: string;
  interactionType: 'talk' | 'gift' | 'work' | 'rest';
}

export interface MaidInteractResponse {
  maidId: string;
  favorabilityGain: number;
  newFavorability: number;
  dialogue: string;
  levelUp?: boolean;
}

export interface MaidPromoteRequest {
  userId: string;
  maidId: string;
  targetJob: MaidJob;
}

export interface MaidPromoteResponse {
  maidId: string;
  previousJob: MaidJob;
  newJob: MaidJob;
  statsChange: MaidStats;
}

export interface BondResponse {
  id: string;
  name: string;
  maids: string[];  // maid IDs
  bonus: {
    type: 'scavenging' | 'combat' | 'production' | 'all';
    value: number;  // percentage
  };
  description: string;
  activated: boolean;
}

// ==================== 探索模块类型 ====================

export interface MapAreaResponse {
  id: number;
  name: string;
  type: 'city' | 'suburb' | 'military' | 'underground' | 'special';
  unlocked: boolean;
  outpost: boolean;
  fogOfWar: boolean;
  coordinates: {
    x: number;
    y: number;
  };
  adjacentAreas: number[];
}

export interface ExplorationMapResponse {
  areas: MapAreaResponse[];
  totalUnlocked: number;
  totalAreas: number;
  outpostCount: number;
}

export interface ExploreRequest {
  userId: string;
  areaId: number;
}

export interface ExploreResponse {
  areaId: number;
  areaName: string;
  result: 'success' | 'fail' | 'partial';
  rewards: {
    resources: {
      food: number;
      wood: number;
      iron: number;
      crystal: number;
    };
    items?: string[];
  };
  discovered: boolean;
}

export interface OutpostRequest {
  userId: string;
  areaId: number;
}

export interface OutpostResponse {
  areaId: number;
  outpostLevel: number;
  productionBonus: number;
  defenseBonus: number;
}

export interface EventOptionResponse {
  id: string;
  text: string;
  requirements?: {
    resource?: {
      type: 'food' | 'wood' | 'iron' | 'crystal';
      amount: number;
    };
    maidStat?: {
      stat: 'scavenging' | 'combat' | 'production';
      min: number;
    };
  };
  result: {
    reward?: {
      resources?: {
        food?: number;
        wood?: number;
        iron?: number;
        crystal?: number;
      };
      items?: string[];
    };
    damage?: number;
    effect?: string;
  };
}

export interface EventResponse {
  id: string;
  type: 'treasure' | 'danger' | 'merchant' | 'refugee' | 'ruin' | 'mystery';
  areaId: number;
  title: string;
  description: string;
  options: EventOptionResponse[];
  completed: boolean;
}

// ==================== API 响应包装器 ====================

export interface GameplayApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: number;
}
