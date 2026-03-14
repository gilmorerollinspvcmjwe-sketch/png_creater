// 游戏核心类型定义

/**
 * 资源类型
 */
export interface Resources {
  food: number;      // 食物
  wood: number;      // 木材
  iron: number;      // 铁矿
  crystal: number;   // 魂晶
}

/**
 * 资源产出配置
 */
export interface ResourceProduction {
  food: number;
  wood: number;
  iron: number;
  crystal: number;
}

/**
 * 铁屋数据
 */
export interface IronHouse {
  id: string;
  level: number;           // 等级 (1-100)
  exp: number;             // 经验值
  defense: number;         // 当前防御值
  maxDefense: number;      // 最大防御值
  facilities: Facility[];  // 设施列表
  technologies: string[];  // 已解锁科技 ID 列表
  isAutoUpgrade: boolean;  // 是否自动升级
  upgradeQueueEndTime: number; // 升级队列结束时间戳
}

/**
 * 设施数据
 */
export interface Facility {
  id: string;
  type: 'farm' | 'lumber' | 'mine' | 'barrack' | 'research' | 'defense';
  level: number;
  position: { x: number; y: number };
  productionBonus?: number;  // 产出加成百分比
  defenseBonus?: number;     // 防御加成百分比
}

/**
 * 女仆稀有度
 */
export type MaidRarity = 'R' | 'SR' | 'SSR' | 'UR';

/**
 * 女仆数据
 */
export interface Maid {
  id: string;
  templateId: number;      // 女仆模板 ID
  name: string;            // 昵称
  level: number;           // 等级 (1-100)
  exp: number;             // 经验值
  rarity: MaidRarity;      // 稀有度
  affection: number;       // 好感度 (0-100)
  stats: MaidStats;        // 属性
  skills: Skill[];         // 技能列表
  job?: string;            // 转职职业
  isLocked: boolean;       // 是否锁定
  avatar?: string;         // 头像 URL
}

/**
 * 女仆属性
 */
export interface MaidStats {
  scavenging: number;  // 拾荒效率
  combat: number;      // 战斗能力
  production: number;  // 生产加成
}

/**
 * 技能数据
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  type: 'active' | 'passive';
}

/**
 * 拾荒队伍
 */
export interface ScavengingTeam {
  id: string;
  areaId: number;          // 区域 ID
  maidIds: string[];       // 女仆 ID 列表
  departureTime: number;   // 出发时间戳
  returnTime: number;      // 返回时间戳
  status: 'idle' | 'scavenging' | 'returning' | 'completed';
  gain?: ScavengeGain;     // 收益数据
  durability: number;      // 队伍耐久 (0-100)
  isAutoDispatch: boolean; // 是否自动派遣
}

/**
 * 拾荒收益
 */
export interface ScavengeGain {
  resources: Resources;
  items?: string[];        // 获得的物品 ID 列表
  risk?: {                 // 风险信息
    loss: number;          // 损失百分比
    hasRareItem: boolean;  // 是否获得稀有物品
  };
}

/**
 * 拾荒区域
 */
export interface ScavengeArea {
  id: number;
  name: string;
  description: string;
  difficulty: number;      // 难度等级 (1-10)
  baseGain: Resources;     // 基础收益
  duration: number;        // 时长 (分钟)
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  unlockLevel: number;     // 解锁所需的铁屋等级
}

/**
 * 战斗战报
 */
export interface BattleReport {
  id: string;
  type: 'midnight_raid' | 'invasion' | 'explore';
  result: 'win' | 'lose' | 'draw';
  defense: number;
  enemyStrength: number;
  damage: number;
  reward?: Resources;
  loss?: Resources;
  createdAt: number;
}

/**
 * 游戏配置
 */
export interface GameConfig {
  autoUpgrade: boolean;      // 自动升级
  autoScavenge: boolean;     // 自动派遣
  autoDefense: boolean;      // 自动防御
  defenseStrategy: 'balanced' | 'aggressive' | 'defensive';
  notifications: {
    enabled: boolean;
    midnightRaid: boolean;
    scavengingComplete: boolean;
    upgradeComplete: boolean;
  };
}

/**
 * 用户数据
 */
export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  survivalDays: number;      // 生存天数
  isPremium: boolean;        // 是否会员
}

/**
 * 系统通知
 */
export interface Notification {
  id: string;
  type: 'system' | 'maid' | 'alliance' | 'battle' | 'gain';
  title: string;
  content: string;
  avatar?: string;
  unread: boolean;
  createdAt: number;
  action?: {
    type: 'navigate';
    target: string;
  };
}

/**
 * 离线数据
 */
export interface OfflineData {
  lastLoginTime: number;
  ironHouseLevel: number;
  facilities: Facility[];
  scavengingTeams: ScavengingTeam[];
  maids: Maid[];
  resources: Resources;
  config: GameConfig;
}

/**
 * 离线收益计算结果
 */
export interface OfflineGain {
  resources: Resources;
  scavenging: ScavengeGain[];
  battle: BattleReport[];
  totalSeconds: number;
  summary: string;
}
