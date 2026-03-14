// AI 原生游戏 - JSON Schema 类型定义
// 项目路径: projects/ai-native-game/src/schemas/

// ============================================
// 基础类型定义
// ============================================

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Location {
  areaId: string;
  x?: number;
  y?: number;
  name?: string;
}

export interface Price {
  currency: string;
  amount: number;
}

export interface Duration {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

// ============================================
// 任务 Schema
// ============================================

export type QuestType = 'main' | 'side' | 'daily' | 'random' | 'event';
export type QuestCategory = 'story' | 'combat' | 'exploration' | 'crafting' | 'social';
export type ObjectiveType = 'kill' | 'collect' | 'explore' | 'talk' | 'craft' | 'deliver' | 'protect';
export type RewardType = 'item' | 'resource' | 'exp' | 'currency' | 'skill_point' | 'reputation';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  target: string;
  count: number;
  optional?: boolean;
}

export interface QuestReward {
  type: RewardType;
  id?: string;
  amount: number;
  weight?: number;
}

export interface Quest extends BaseEntity {
  title: string;
  description: string;
  type: QuestType;
  difficulty: Difficulty;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites: string[];
  timeLimit?: number;
  repeatable?: boolean;
  category: QuestCategory;
}

// ============================================
// NPC Schema
// ============================================

export type NPCRole = 'quest_giver' | 'merchant' | 'trainer' | 'story' | 'guard' | 'civilian' | 'boss';
export type NPCService = 'shop' | 'train' | 'heal' | 'teleport' | 'craft';

export interface NPCAppearance {
  race: string;
  gender: 'male' | 'female' | 'other';
  age?: string;
  distinctiveFeatures: string[];
}

export interface LocationRef {
  areaId: string;
  x?: number;
  y?: number;
  description?: string;
}

export interface NPCRelationship {
  targetId: string;
  type: 'ally' | 'enemy' | 'rival' | 'family' | 'friend';
  standing: number; // -100 到 100
}

export interface DialogueOption {
  id: string;
  text: string;
  nextNodeId?: string;
  requirements?: Record<string, unknown>;
  effects?: Record<string, unknown>;
}

export interface DialogueNode {
  id: string;
  speaker: 'npc' | 'player';
  text: string;
  options?: DialogueOption[];
  emotion?: string;
}

export interface NPC extends BaseEntity {
  name: string;
  title?: string;
  appearance: NPCAppearance;
  personality: string[];
  backstory: string;
  role: NPCRole;
  location: LocationRef;
  faction?: string;
  relationships: NPCRelationship[];
  dialogueTree?: DialogueNode;
  questOffers?: string[];
  shop?: string;
  services?: NPCService[];
}

// ============================================
// 物品 Schema
// ============================================

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'material' | 'quest_item' | 'key_item';

export interface ItemStats {
  health?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  crit?: number;
  [key: string]: number | undefined;
}

export interface ItemEffect {
  trigger: 'on_use' | 'on_equip' | 'on_hit' | 'passive';
  type: string;
  value: number;
  duration?: number;
}

export interface ItemRequirements {
  level?: number;
  strength?: number;
  intelligence?: number;
  faction?: string;
  [key: string]: number | string | undefined;
}

export interface ItemSource {
  droppedBy?: string[];
  craftable?: boolean;
  purchasable?: boolean;
  foundIn?: string[];
}

export interface Item extends BaseEntity {
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  stackable: boolean;
  maxStack?: number;
  value: number;
  stats?: ItemStats;
  effects?: ItemEffect[];
  requirements?: ItemRequirements;
  source?: ItemSource;
}

// ============================================
// 敌人/怪物 Schema
// ============================================

export type EnemyType = 'humanoid' | 'beast' | 'undead' | 'demon' | 'elemental' | 'dragon' | 'boss';

export interface EnemyStats {
  health: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
}

export interface EnemyAbility {
  id: string;
  name: string;
  description: string;
  type: 'attack' | 'defense' | 'buff' | 'debuff' | 'special';
  damage?: number;
  effect?: string;
  cooldown?: number;
  manaCost?: number;
}

export interface EnemyDrop {
  itemId: string;
  rate: number;
  minAmount: number;
  maxAmount: number;
  guaranteed?: boolean;
}

export interface EnemyBehavior {
  type: 'aggressive' | 'passive' | 'patrol' | 'guard';
  range?: number;
}

export interface ElementalResistance {
  element: string;
  resistance: number; // 负数表示弱点
}

export interface Enemy extends BaseEntity {
  name: string;
  description: string;
  type: EnemyType;
  level: number;
  stats: EnemyStats;
  abilities: EnemyAbility[];
  drops: EnemyDrop[];
  behaviors?: EnemyBehavior[];
  resistance?: ElementalResistance[];
  weakness?: string[];
}

// ============================================
// 事件 Schema
// ============================================

export type EventType = 'random' | 'story' | 'world' | 'seasonal' | 'combat';
export type TriggerType = 'location' | 'time' | 'level' | 'quest_complete' | 'item_possess' | 'random';

export interface EventTrigger {
  type: TriggerType;
  condition: string;
  value?: number;
}

export interface EventRequirement {
  type: string;
  item?: string;
  level?: number;
  quest?: string;
  resource?: { type: string; amount: number };
}

export interface EventOutcome {
  type: 'give_item' | 'take_item' | 'gain_exp' | 'lose_health' | 
       'start_quest' | 'end_quest' | 'change_reputation' | 'teleport';
  target: string;
  value: number | string;
  weight?: number;
}

export interface EventChoice {
  id: string;
  text: string;
  requirements?: EventRequirement[];
  outcomes: EventOutcome[];
}

export interface EventEffect {
  type: string;
  value: number | string;
  target?: string;
}

export interface GameEvent extends BaseEntity {
  title: string;
  description: string;
  type: EventType;
  severity: Difficulty;
  triggers: EventTrigger[];
  choices: EventChoice[];
  effects: EventEffect[];
  cooldown?: number;
  exclusiveWith?: string[];
}

// ============================================
// 玩家 Schema
// ============================================

export interface PlayerStats {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
}

export interface PlayerInventory {
  items: Array<{
    itemId: string;
    amount: number;
  }>;
  gold: number;
  maxSlots: number;
}

export interface PlayerQuest {
  questId: string;
  status: 'available' | 'accepted' | 'completed' | 'failed';
  progress: Array<{
    objectiveId: string;
    current: number;
    target: number;
  }>;
  startedAt?: string;
  completedAt?: string;
}

export interface PlayerFactionStanding {
  factionId: string;
  standing: number;
}

export interface Player extends BaseEntity {
  name: string;
  level: number;
  experience: number;
  class: string;
  stats: PlayerStats;
  inventory: PlayerInventory;
  quests: PlayerQuest[];
  factionStandings: PlayerFactionStanding[];
  location: Location;
  skills: string[];
}

// ============================================
// 区域/地图 Schema
// ============================================

export interface Area extends BaseEntity {
  name: string;
  description: string;
  type: 'town' | 'dungeon' | 'wild' | 'dungeon' | 'special';
  levelRange: [number, number];
  npcs: string[];
  enemies: string[];
  connections: string[];
  events?: string[];
}

// ============================================
// Schema 验证器接口
// ============================================

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface IValidator<T> {
  validate(data: T, context?: unknown): ValidationResult;
}

// ============================================
// 游戏规则配置
// ============================================

export const GAME_RULES = {
  player: {
    maxLevel: 100,
    baseExpCurve: (level: number) => Math.floor(100 * Math.pow(1.5, level)),
    baseStats: { health: 100, attack: 10, defense: 5, speed: 10, crit: 5 },
    statGrowth: { health: 10, attack: 2, defense: 1, speed: 1, crit: 0.5 }
  },
  quest: {
    difficultyRange: [1, 10] as [number, number],
    objectivesRange: [1, 5] as [number, number],
    expMultiplier: 50,
    currencyRange: [10, 1000] as [number, number],
    itemRewardChance: 0.3,
    maxItemRewards: 3
  },
  combat: {
    critRateCap: 50,
    critDamageMultiplier: 1.5,
    dodgeRateCap: 30
  },
  item: {
    rarityWeights: {
      common: 60,
      uncommon: 25,
      rare: 10,
      epic: 4,
      legendary: 0.9,
      mythic: 0.1
    },
    stackLimits: {
      material: 999,
      consumable: 99,
      quest_item: 1,
      key_item: 1
    }
  }
} as const;

export type GameRules = typeof GAME_RULES;
