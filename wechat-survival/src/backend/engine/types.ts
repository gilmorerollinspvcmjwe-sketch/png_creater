/**
 * WeChat Survival Phase 1 - 核心类型定义
 * 基于本地存储版本的游戏数据结构
 */

// ==================== 资源系统 ====================

export type ResourceType = 'food' | 'water' | 'medicine' | 'ammo' | 'scrap' | 'wood' | 'caps';

export interface Resources {
  food: number;      // 食物
  water: number;     // 水
  medicine: number;  // 药品
  ammo: number;      // 弹药
  scrap: number;     // 废铁
  wood: number;      // 木材
  caps: number;      // 瓶盖（货币）
}

// ==================== 角色属性系统 ====================

export interface PlayerAttributes {
  health: number;        // 生命值 (HP)
  stamina: number;       // 体力
  attack: number;        // 攻击力
  defense: number;       // 防御力
  critRate: number;      // 暴击率 (%)
  dodgeRate: number;     // 闪避率 (%)
  level: number;         // 等级
  exp: number;           // 经验值
  maxHealth: number;     // 最大生命值
  maxStamina: number;    // 最大体力
}

// ==================== 避难所/房间系统 ====================

export interface Shelter {
  level: number;         // 避难所等级
  defense: number;       // 防御等级
  power: number;         // 电力等级
  space: number;         // 空间容量
  maxSpace: number;      // 最大空间
  npcSlots: number;      // NPC 槽位
  facilities: Facility[]; // 设施列表
}

export interface Facility {
  id: string;
  type: 'wall' | 'trap' | 'guard' | 'farm' | 'water' | 'power' | 'medical';
  level: number;
  name: string;
  description: string;
  effect: {
    type: string;
    value: number;
  };
}

// ==================== NPC 系统 ====================

export type NPCType = 'merchant' | 'quest_giver' | 'survivor' | 'hostile' | 'special';
export type NPCRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR' | 'L';

export interface NPC {
  id: string;
  name: string;
  type: NPCType;
  rarity: NPCRarity;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  personality: string;
  relationship: number;    // 好感度 (0-100)
  isRecruited: boolean;    // 是否已招募
  specialAbility?: string; // 特殊能力
  dialogue?: Dialogue[];   // 对话内容
  tradeItems?: TradeItem[]; // 交易物品（商人）
  quests?: string[];       // 可发布任务 ID
}

export interface Dialogue {
  id: string;
  text: string;
  condition?: {
    minRelationship?: number;
    questCompleted?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'night';
  };
  responses?: DialogueResponse[];
}

export interface DialogueResponse {
  text: string;
  effect?: {
    relationshipChange?: number;
    nextDialogue?: string;
    triggerQuest?: string;
  };
}

export interface TradeItem {
  itemId: string;
  name: string;
  price: number;
  currency: 'caps' | 'scrap' | 'ammo';
  stock?: number; // -1 表示无限
}

// ==================== 任务系统 ====================

export type QuestType = 'main' | 'side' | 'daily' | 'event';
export type QuestStatus = 'available' | 'accepted' | 'completed' | 'failed';

export interface Quest {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  difficulty: number;  // 1-10
  status: QuestStatus;
  giverId?: string;    // 任务发布者 NPC ID
  prerequisites?: string[]; // 前置任务 ID
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'collect' | 'kill' | 'explore' | 'talk' | 'build' | 'survive';
  target: string;
  current: number;
  required: number;
  isCompleted: boolean;
}

export interface QuestReward {
  type: 'resource' | 'exp' | 'item' | 'unlock';
  resourceType?: ResourceType;
  amount?: number;
  itemId?: string;
  unlockId?: string;
  description: string;
}

// ==================== 事件系统 ====================

export type EventType = 'explore' | 'combat' | 'raid' | 'trade' | 'social' | 'random';
export type EventTriggerType = 'manual' | 'time' | 'condition' | 'random';

export interface GameEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  triggerType: EventTriggerType;
  triggerCondition?: {
    probability?: number;  // 触发概率 (0-1)
    day?: number;          // 第几天触发
    timeOfDay?: string;
    location?: string;
    prerequisites?: string[];
  };
  options: EventOption[];
  results: EventResult[];
}

export interface EventOption {
  id: string;
  text: string;
  requirements?: {
    resource?: Partial<Resources>;
    attribute?: Partial<PlayerAttributes>;
    item?: string;
  };
  riskLevel: 'none' | 'low' | 'medium' | 'high';
}

export interface EventResult {
  optionId: string;
  resourceChange?: Partial<Resources>;
  attributeChange?: Partial<PlayerAttributes>;
  relationshipChange?: Record<string, number>;
  triggerBattle?: boolean;
  battleId?: string;
  message: string;
}

// ==================== 战斗系统 ====================

export interface CombatEnemy {
  id: string;
  name: string;
  type: 'zombie' | 'mutant' | 'raider' | 'boss';
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  critRate: number;
  dodgeRate: number;
  expReward: number;
  lootTable: LootItem[];
}

export interface LootItem {
  itemId: string;
  name: string;
  probability: number;  // 掉落概率 (0-1)
  minAmount: number;
  maxAmount: number;
}

export interface CombatState {
  isInCombat: boolean;
  enemies: CombatEnemy[];
  playerTurn: boolean;
  combatLog: CombatLogEntry[];
  round: number;
}

export interface CombatLogEntry {
  round: number;
  actor: 'player' | 'enemy';
  actorId?: string;
  action: 'attack' | 'defend' | 'skill' | 'item' | 'flee';
  target?: string;
  damage?: number;
  isCrit?: boolean;
  isDodged?: boolean;
  message: string;
}

// ==================== 游戏状态 ====================

export interface GameState {
  // 基础信息
  day: number;
  time: number;  // 0-1439 (分钟)
  survivalDays: number;
  
  // 玩家数据
  player: PlayerAttributes;
  resources: Resources;
  shelter: Shelter;
  
  // NPC 数据
  npcs: NPC[];
  
  // 任务数据
  quests: Quest[];
  
  // 事件数据
  activeEvents: string[];  // 活跃事件 ID
  completedEvents: string[]; // 已完成事件 ID
  
  // 战斗数据
  combatState: CombatState | null;
  
  // 元数据
  lastSaveTime: number;
  version: string;
}

// ==================== 存档数据 ====================

export interface SaveData {
  version: string;
  saveTime: number;
  gameDay: number;
  survivalDays: number;
  checksum: string;
  gameState: GameState;
}
