/**
 * Phase 1 玩法验证专用类型定义
 * 基于 PHASE1_DESIGN.md 和 SCHEMA.md
 */

// ==================== 任务类型 ====================

export type QuestType = 'main' | 'side' | 'daily' | 'event';
export type QuestDifficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface QuestObjective {
  description: string;
  completed: boolean;
  count: number;
  target: number;
}

export interface QuestReward {
  type: 'item' | 'resource' | 'exp' | 'affection';
  id?: string;
  amount: number;
  npcId?: string;
  name?: string;
}

export interface Quest {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  difficulty: QuestDifficulty;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  npcId?: string;
  factionId?: string;
  acceptedAt?: number;
  completedAt?: number;
}

// ==================== NPC 类型 ====================

export type NPCType = 'maid' | 'companion' | 'assistant' | 'warrior' | 'merchant' | 'rival' | 'boss';
export type NPCRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR' | 'L';
export type NPCStatus = 'idle' | 'recruited' | 'trading' | 'hostile' | 'friendly';

export interface NPCAttributes {
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface NPC {
  id: string;
  name: string;
  type: NPCType;
  rarity: NPCRarity;
  attributes: NPCAttributes;
  personality: string;
  acquisition: string;
  relationship: number; // 好感度 0-100
  status: NPCStatus;
  avatar: string;
  role: string;
  bio: string;
  faction?: string;
  specialAbility?: string;
}

// ==================== 事件类型 ====================

export type EventType = 'explore' | 'combat' | 'raid' | 'trade' | 'social' | 'random';
export type EventTriggerType = 'manual' | 'time' | 'condition' | 'random';

export interface EventOption {
  id: string;
  text: string;
  requirements?: {
    resource?: {
      type: string;
      amount: number;
    };
    stat?: {
      type: string;
      min: number;
    };
  };
  result: {
    reward?: {
      resources?: Record<string, number>;
      items?: string[];
    };
    damage?: number;
    effect?: string;
  };
}

export interface GameEvent {
  id: string;
  type: EventType;
  triggerType: EventTriggerType;
  title: string;
  description: string;
  options: EventOption[];
  completed: boolean;
  areaId?: number;
  difficulty?: number;
}

// ==================== 资源类型 ====================

export type ResourceType = 'food' | 'water' | 'wood' | 'scrap' | 'caps' | 'ammo' | 'medicine';

export interface Resources {
  food: number;
  water: number;
  wood: number;
  scrap: number;
  caps: number;
  ammo: number;
  medicine: number;
}

// ==================== 避难所类型 ====================

export type FacilityType = 'wall' | 'trap' | 'guard' | 'farm' | 'power' | 'water' | 'medical';

export interface Facility {
  type: FacilityType;
  level: number;
  capacity?: number;
  production?: number;
}

export interface Shelter {
  level: number;
  area: number;
  npcSlots: number;
  resources: Partial<Resources>;
  defense: {
    wall: number;
    trap: number;
    guard: number;
  };
  facilities: Facility[];
  power: number;
  space: number;
  defenseLevel: number;
  powerLevel: number;
  farmLevel: number;
  waterLevel: number;
}

// ==================== 角色属性 ====================

export interface PlayerAttributes {
  health: number;      // 生命值
  hunger: number;      // 饱食度
  thirst: number;      // 口渴度
  stamina: number;     // 体力
  level: number;       // 等级
  exp: number;         // 经验值
  strength: number;    // 力量
  agility: number;     // 敏捷
  intelligence: number; // 智力
}

// ==================== 物品类型 ====================

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'material' | 'key' | 'treasure';
export type ItemRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  stackable: boolean;
  value: number;
  icon?: string;
  stats?: Record<string, number>;
}

export interface InventoryItem extends Item {
  count: number;
}

// ==================== 敌人类型 ====================

export type EnemyType = 'undead' | 'beast' | 'human' | 'mutant' | 'machine' | 'boss';

export interface EnemyAttributes {
  level: number;
  hp: number;
  attack: number;
  defense: number;
}

export interface Enemy {
  id: string;
  name: string;
  type: EnemyType;
  attributes: EnemyAttributes;
  rewards: {
    exp: number;
    items?: string[];
    resources?: Partial<Resources>;
  };
}

// ==================== 聊天消息类型 ====================

export type MessageType = 'user' | 'system' | 'npc' | 'player';
export type ChatType = 'direct' | 'group' | 'system' | 'task' | 'event' | 'npc' | 'faction';

export interface ChatMessage {
  id: string;
  sender: MessageType;
  senderName?: string;
  text: string;
  time: string;
  actions?: string[]; // 快捷操作按钮
  eventId?: string;
  questId?: string;
}

export interface ChatInfo {
  id: string;
  name: string;
  avatar: string | string[];
  desc: string;
  type: ChatType;
  pinned?: boolean;
  memberCount?: number;
  unread?: number;
  lastMessage?: ChatMessage;
}

// ==================== 游戏状态 ====================

export interface GameState {
  // 基础资源
  resources: Resources;
  
  // 避难所
  shelter: Shelter;
  
  // 玩家属性
  player: PlayerAttributes;
  
  // 背包
  inventory: InventoryItem[];
  
  // 任务
  quests: Quest[];
  
  // NPC
  npcs: NPC[];
  contacts: NPC[];
  
  // 聊天
  chats: ChatInfo[];
  messages: Record<string, ChatMessage[]>;
  
  // 游戏进度
  days: number;
  currentLocation: string;
  
  // UI 状态
  activeTab: 'message' | 'task' | 'inventory' | 'shelter';
  activeChatId: string;
  selectedContact: NPC | null;
  showCharacterPanel: boolean;
  showInventory: boolean;
  showQuestPanel: boolean;
  showMap: boolean;
  showShelterEditor: boolean;
  
  // 战斗状态
  isInCombat: boolean;
  currentCombat?: {
    enemies: Enemy[];
    playerHealth: number;
    turn: number;
  };
  
  // 事件
  activeEvents: GameEvent[];
}

// ==================== 主线任务数据 (Phase 1) ====================

export const PHASE1_MAIN_QUESTS: Quest[] = [
  {
    id: 'MAIN_01',
    type: 'main',
    title: '第一天：基础生存',
    description: '末世爆发已经 30 天了，你的避难所刚刚建立，物资极度匮乏。今天是你作为避难所管理者的第一天，你需要收集足够的生存物资。',
    objectives: [
      { description: '收集食物', completed: false, count: 0, target: 10 },
      { description: '收集水', completed: false, count: 0, target: 10 }
    ],
    rewards: [
      { type: 'resource', amount: 100, name: '解锁避难所建设功能' }
    ],
    difficulty: 1,
    status: 'pending'
  },
  {
    id: 'MAIN_02',
    type: 'main',
    title: '第三天：清理周边',
    description: '避难所周边的丧尸越来越多，已经开始威胁到你们的安全。是时候主动出击，清除这些威胁了。',
    objectives: [
      { description: '击杀普通丧尸', completed: false, count: 0, target: 5 }
    ],
    rewards: [
      { type: 'item', amount: 1, name: '铁刀' },
      { type: 'exp', amount: 200 }
    ],
    difficulty: 2,
    status: 'pending'
  },
  {
    id: 'MAIN_03',
    type: 'main',
    title: '第五天：寻找幸存者',
    description: '你听说附近有其他幸存者，也许可以招募他们加入你的避难所。',
    objectives: [
      { description: '招募幸存者', completed: false, count: 0, target: 1 }
    ],
    rewards: [
      { type: 'resource', amount: 300, name: '开启幸存者系统' }
    ],
    difficulty: 3,
    status: 'pending'
  },
  {
    id: 'MAIN_04',
    type: 'main',
    title: '第十天：医疗设施',
    description: '随着幸存者增加，医疗需求也越来越大。建设一个医疗室吧。',
    objectives: [
      { description: '建设医疗室', completed: false, count: 0, target: 1 }
    ],
    rewards: [
      { type: 'resource', amount: 500, name: '药品产出 +1/天' }
    ],
    difficulty: 5,
    status: 'pending'
  },
  {
    id: 'MAIN_05',
    type: 'main',
    title: '第三十天：解药线索',
    description: '终于，你找到了关于病毒解药的重要线索。',
    objectives: [
      { description: '找到解药线索', completed: false, count: 0, target: 1 }
    ],
    rewards: [
      { type: 'exp', amount: 5000, name: '通关结局' }
    ],
    difficulty: 10,
    status: 'pending'
  }
];

// ==================== 支线任务数据 (Phase 1 - 部分示例) ====================

export const PHASE1_SIDE_QUESTS: Quest[] = [
  // 资源收集类
  {
    id: 'SIDE_01',
    type: 'side',
    title: '寻找干净水源',
    description: '收集足够的干净饮用水。',
    objectives: [
      { description: '收集水', completed: false, count: 0, target: 30 }
    ],
    rewards: [
      { type: 'item', amount: 1, name: '净水器图纸' }
    ],
    difficulty: 2,
    status: 'pending'
  },
  {
    id: 'SIDE_02',
    type: 'side',
    title: '囤积粮食',
    description: '收集足够的食物储备。',
    objectives: [
      { description: '收集食物', completed: false, count: 0, target: 50 }
    ],
    rewards: [
      { type: 'resource', id: 'caps', amount: 500 }
    ],
    difficulty: 3,
    status: 'pending'
  },
  // 战斗挑战类
  {
    id: 'SIDE_06',
    type: 'side',
    title: '清除变异体',
    description: '消灭一只变异丧尸。',
    objectives: [
      { description: '击杀变异丧尸', completed: false, count: 0, target: 1 }
    ],
    rewards: [
      { type: 'item', amount: 1, name: '电磁枪图纸' }
    ],
    difficulty: 6,
    status: 'pending'
  }
];

// ==================== NPC 数据 (Phase 1) ====================

export const PHASE1_NPCS: NPC[] = [
  // 商人
  {
    id: 'NPC_MERCHANT_01',
    name: '流浪商人汤姆',
    type: 'merchant',
    rarity: 'R',
    attributes: { level: 10, hp: 50, attack: 5, defense: 5, speed: 8 },
    personality: '幽默、奸诈',
    acquisition: '随机出现，每 3-5 天一次',
    relationship: 0,
    status: 'idle',
    avatar: 'https://picsum.photos/seed/trader/50/50',
    role: '商人',
    bio: '嘿，幸存者！我叫汤姆，这片废土上最精明的商人！',
    specialAbility: '交易'
  },
  {
    id: 'NPC_MERCHANT_02',
    name: '军火商铁拳',
    type: 'merchant',
    rarity: 'SR',
    attributes: { level: 15, hp: 80, attack: 15, defense: 10, speed: 6 },
    personality: '冷漠、简短',
    acquisition: '城市废墟解锁后',
    relationship: 0,
    status: 'idle',
    avatar: 'https://picsum.photos/seed/gunsmith/50/50',
    role: '军火商',
    bio: '武器，换不换？',
    specialAbility: '军火交易'
  },
  // 任务 giver
  {
    id: 'NPC_QUEST_01',
    name: '老兵约翰',
    type: 'warrior',
    rarity: 'SR',
    attributes: { level: 20, hp: 100, attack: 20, defense: 15, speed: 10 },
    personality: '严肃、专业',
    acquisition: '主线任务解锁',
    relationship: 0,
    status: 'idle',
    avatar: 'https://picsum.photos/seed/veteran/50/50',
    role: '任务发布',
    bio: '前特种兵，擅长战斗和战术。',
    specialAbility: '战斗指导'
  },
  {
    id: 'NPC_QUEST_02',
    name: '工程师老马',
    type: 'assistant',
    rarity: 'SR',
    attributes: { level: 18, hp: 60, attack: 8, defense: 10, speed: 7 },
    personality: '温和、聪明',
    acquisition: '主线任务解锁',
    relationship: 0,
    status: 'idle',
    avatar: 'https://picsum.photos/seed/engineer/50/50',
    role: '任务发布/特殊 NPC',
    bio: '退休工程师，擅长机械维修。',
    specialAbility: '装备维修'
  },
  // 可招募幸存者
  {
    id: 'NPC_SURVIVOR_01',
    name: '退役医生林姐',
    type: 'companion',
    rarity: 'SR',
    attributes: { level: 15, hp: 70, attack: 5, defense: 8, speed: 6 },
    personality: '温柔、负责',
    acquisition: '医疗室等级≥2，药品×5',
    relationship: 0,
    status: 'idle',
    avatar: 'https://picsum.photos/seed/doctor/50/50',
    role: '医疗',
    bio: '40 岁，前三甲医院外科医生。',
    specialAbility: '治疗伤员（免费）'
  },
  {
    id: 'NPC_SURVIVOR_02',
    name: '大学生阿杰',
    type: 'assistant',
    rarity: 'R',
    attributes: { level: 10, hp: 50, attack: 6, defense: 5, speed: 9 },
    personality: '活泼、聪明',
    acquisition: '电力等级≥3，完成城市废墟探索',
    relationship: 0,
    status: 'idle',
    avatar: 'https://picsum.photos/seed/student/50/50',
    role: '技术',
    bio: '22 岁，计算机专业。',
    specialAbility: '电磁设备维修'
  },
  {
    id: 'NPC_SURVIVOR_03',
    name: '前警察老张',
    type: 'warrior',
    rarity: 'SR',
    attributes: { level: 18, hp: 90, attack: 18, defense: 12, speed: 10 },
    personality: '正直、果断',
    acquisition: '战斗胜利 5 次，拥有铁刀或更好武器',
    relationship: 0,
    status: 'idle',
    avatar: 'https://picsum.photos/seed/police/50/50',
    role: '战斗',
    bio: '45 岁，退休警察，擅长格斗。',
    specialAbility: '守卫避难所'
  }
];

// ==================== 探索事件数据 (Phase 1 - 部分示例) ====================

export const PHASE1_EXPLORE_EVENTS: GameEvent[] = [
  {
    id: 'EXPLORE_01',
    type: 'explore',
    triggerType: 'manual',
    title: '废弃超市',
    description: '你发现了一家废弃超市，货架倾倒，地上散落着过期的罐头。超市内部似乎有人活动的痕迹...',
    options: [
      {
        id: 'opt1',
        text: '搜索物资（获得食物×5, 水×3）- 有风险',
        result: {
          reward: {
            resources: { food: 5, water: 3 }
          }
        }
      },
      {
        id: 'opt2',
        text: '谨慎搜索（获得食物×2, 水×2）- 无风险',
        result: {
          reward: {
            resources: { food: 2, water: 2 }
          }
        }
      },
      {
        id: 'opt3',
        text: '离开（无收获，无风险）',
        result: {}
      }
    ],
    completed: false
  },
  {
    id: 'EXPLORE_02',
    type: 'explore',
    triggerType: 'manual',
    title: '民居搜索',
    description: '一栋废弃的居民楼，门窗紧闭，不知道里面有什么。',
    options: [
      {
        id: 'opt1',
        text: '破门而入（随机获得）',
        result: {
          reward: {
            resources: { food: 3, water: 2, scrap: 1 }
          }
        }
      },
      {
        id: 'opt2',
        text: '敲门询问（无风险，获得少）',
        result: {
          reward: {
            resources: { food: 1, water: 1 }
          }
        }
      },
      {
        id: 'opt3',
        text: '离开',
        result: {}
      }
    ],
    completed: false
  }
];
