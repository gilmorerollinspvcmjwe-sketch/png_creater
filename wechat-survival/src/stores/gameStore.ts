import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- 原有 wechat-survival 类型 ---
export type ResourceType = 'water' | 'food' | 'wood' | 'scrap' | 'caps';
export type Resources = Record<ResourceType, number>;

export type Message = {
  id: string;
  sender: 'user' | 'system' | 'npc' | 'player';
  senderName?: string;
  text: string;
  time: string;
  actions?: string[];
};

export type ChatType = 'direct' | 'group' | 'system' | 'task' | 'event' | 'npc' | 'faction';
export type ChatId = string;

export interface ChatInfo {
  id: ChatId;
  name: string;
  avatar: string | string[];
  desc: string;
  type: ChatType;
  pinned?: boolean;
  memberCount?: number;
  unread?: number;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: 'idle' | 'recruited' | 'trading' | 'hostile' | 'friendly';
  bio: string;
  affection: number;
  faction?: string;
}

export interface Shelter {
  level: number;
  defense: number;
  power: number;
  space: number;
}

export interface Maid {
  id: string;
  name: string;
  affection: number;
  hunger: number;
  combat: number;
  avatar: string;
}

// --- 铁屋生存扩展类型 ---
export interface PlayerAttribute {
  health: number;
  hunger: number;
  thirst: number;
  stamina: number;
  level: number;
  exp: number;
  strength: number;
  agility: number;
  intelligence: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'weapon' | 'armor' | 'material' | 'quest';
  count: number;
  icon?: string;
  stats?: Record<string, number>;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  objectives: { description: string; completed: boolean; count: number; target: number }[];
  rewards: { type: 'item' | 'resource' | 'exp' | 'affection'; id?: string; amount: number; npcId?: string }[];
  npcId?: string;
  factionId?: string;
}

export interface FactionReputation {
  factionId: string;
  factionName: string;
  reputation: number;
  rank: string;
}

export interface GameState {
  // --- 原有 wechat-survival 状态 ---
  resources: Resources;
  shelter: Shelter;
  maids: Maid[];
  days: number;
  monsterTimer: number;
  idleIncome: Resources;
  chats: ChatInfo[];
  contacts: Contact[];
  messages: Record<ChatId, Message[]>;

  // --- UI 状态 ---
  activeTab: 'chat' | 'contact';
  activeChatId: ChatId;
  selectedContact: Contact | null;
  showMap: boolean;
  showShelterEditor: boolean;
  showCharacterPanel: boolean;
  showInventory: boolean;
  showQuestPanel: boolean;

  // --- 铁屋生存新增状态 ---
  player: PlayerAttribute;
  inventory: InventoryItem[];
  quests: Quest[];
  factions: FactionReputation[];
  currentLocation: string;
  isInCombat: boolean;
}

export interface GameActions {
  // --- 原有 wechat-survival 方法 ---
  setResources: (resources: Partial<Resources>) => void;
  addResource: (type: ResourceType, amount: number) => void;
  subtractResource: (type: ResourceType, amount: number) => boolean;
  addMessage: (chatId: ChatId, message: Omit<Message, 'id' | 'time'>) => void;
  setActiveChat: (chatId: ChatId) => void;
  setActiveTab: (tab: 'chat' | 'contact') => void;
  setSelectedContact: (contact: Contact | null) => void;
  toggleMap: (show?: boolean) => void;
  toggleShelterEditor: (show?: boolean) => void;
  nextDay: () => void;
  decreaseMonsterTimer: () => void;

  // --- 铁屋生存新增方法 ---
  updatePlayerAttributes: (attrs: Partial<PlayerAttribute>) => void;
  addItem: (item: InventoryItem, count?: number) => void;
  removeItem: (itemId: string, count?: number) => boolean;
  addQuest: (quest: Quest) => void;
  updateQuestProgress: (questId: string, objectiveIndex: number, count: number) => void;
  completeQuest: (questId: string) => void;
  updateFactionReputation: (factionId: string, amount: number) => void;
  addNpcToContacts: (npc: Contact) => void;
  createNpcChat: (npcId: string, npcName: string, avatar: string) => void;
  sendGameEvent: (event: { type: string; data: any; chatId?: string }) => void;
  toggleCharacterPanel: (show?: boolean) => void;
  toggleInventory: (show?: boolean) => void;
  toggleQuestPanel: (show?: boolean) => void;
}

const INITIAL_RESOURCES: Resources = { water: 20, food: 20, wood: 10, scrap: 5, caps: 50 };
const INITIAL_SHELTER: Shelter = { level: 1, defense: 10, power: 5, space: 10 };
const INITIAL_MAIDS: Maid[] = [
  { id: 'maid_ai', name: '小爱', affection: 20, hunger: 100, combat: 5, avatar: 'https://picsum.photos/seed/maid1/50/50' },
  { id: 'maid_luna', name: '露娜', affection: 10, hunger: 100, combat: 8, avatar: 'https://picsum.photos/seed/maid2/50/50' },
];

const INITIAL_CHATS: ChatInfo[] = [
  { id: 'sys_notice', name: '消息通知', avatar: 'https://picsum.photos/seed/notice/50/50', desc: '系统重要预警', type: 'system', pinned: true },
  { id: 'group_building', name: '求生大楼群', avatar: ['https://picsum.photos/seed/p1/20/20', 'https://picsum.photos/seed/p2/20/20', 'https://picsum.photos/seed/p3/20/20', 'https://picsum.photos/seed/p4/20/20'], desc: '300位幸存者在线', type: 'group', pinned: true, memberCount: 300 },
  { id: 'explore', name: '废土探索', avatar: 'https://picsum.photos/seed/explore/50/50', desc: '无限大世界探索', type: 'task' },
  { id: 'shelter', name: '我的避难所', avatar: 'https://picsum.photos/seed/shelter/50/50', desc: '基地建设', type: 'task' },
  { id: 'maid_ai', name: '女仆-小爱', avatar: 'https://picsum.photos/seed/maid1/50/50', desc: '你的专属助手', type: 'direct' },
  { id: 'event_trader', name: '流浪商人', avatar: 'https://picsum.photos/seed/trader/50/50', desc: '限时交易事件', type: 'event' },
  { id: 'task_scout', name: '侦察任务', avatar: 'https://picsum.photos/seed/task/50/50', desc: '清理周边丧尸', type: 'task' },
];

const INITIAL_CONTACTS: Contact[] = [
  { id: 'npc_doc', name: '老医生', avatar: 'https://picsum.photos/seed/doc/50/50', role: '医疗/交易', status: 'idle', bio: '在废土行医多年，手里有不少好药。', affection: 0 },
  { id: 'npc_smith', name: '铁匠老王', avatar: 'https://picsum.photos/seed/smith/50/50', role: '打造/招募', status: 'idle', bio: '只要有废铁，他能做出任何东西。', affection: 0 },
  { id: 'npc_fox', name: '红狐狸', avatar: 'https://picsum.photos/seed/fox/50/50', role: '情报/任务', status: 'idle', bio: '游走在各大势力之间的情报贩子。', affection: 0 },
];

const INITIAL_MESSAGES: Record<ChatId, Message[]> = {
  sys_notice: [{ id: 's1', sender: 'system', text: '【系统消息】今晚将有小型丧尸潮攻击，请加固防御。\n【挂机收益】昨日收益：水+10，食物+10。', time: '09:00' }],
  group_building: [{ id: 'g1', sender: 'player', senderName: '张三', text: '有人有余粮吗？我快饿死了。', time: '10:05' }],
  explore: [{ id: 'e1', sender: 'system', text: '【探索】当前位于：废弃加油站。点击下方指令开始行动。', time: '10:00' }],
  shelter: [{ id: 'sh1', sender: 'system', text: '【避难所】当前等级：1。点击右上角“聊天记录”进入可视化编辑模式。', time: '10:00' }],
  maid_ai: [{ id: 'm1', sender: 'npc', text: '主人，今天也要加油哦！', time: '08:30' }],
  event_trader: [{ id: 't1', sender: 'npc', text: '嘿，伙计，来看看我今天带了什么好货？', time: '11:00' }],
  task_scout: [{ id: 'ts1', sender: 'system', text: '【任务】清理避难所南侧的3个丧尸。奖励：瓶盖x20。', time: '10:30' }],
};

const INITIAL_PLAYER: PlayerAttribute = {
  health: 100,
  hunger: 100,
  thirst: 100,
  stamina: 100,
  level: 1,
  exp: 0,
  strength: 5,
  agility: 5,
  intelligence: 5,
};

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      // --- 初始状态 ---
      resources: INITIAL_RESOURCES,
      shelter: INITIAL_SHELTER,
      maids: INITIAL_MAIDS,
      days: 1,
      monsterTimer: 60,
      idleIncome: { water: 1, food: 1, wood: 0, scrap: 0, caps: 0 },
      chats: INITIAL_CHATS,
      contacts: INITIAL_CONTACTS,
      messages: INITIAL_MESSAGES,

      activeTab: 'chat',
      activeChatId: 'explore',
      selectedContact: null,
      showMap: false,
      showShelterEditor: false,
      showCharacterPanel: false,
      showInventory: false,
      showQuestPanel: false,

      player: INITIAL_PLAYER,
      inventory: [],
      quests: [],
      factions: [],
      currentLocation: '废弃加油站',
      isInCombat: false,

      // --- 原有方法实现 ---
      setResources: (resources) => set(state => ({ resources: { ...state.resources, ...resources } })),
      addResource: (type, amount) => set(state => ({
        resources: { ...state.resources, [type]: state.resources[type] + amount }
      })),
      subtractResource: (type, amount) => {
        const state = get();
        if (state.resources[type] < amount) return false;
        set({ resources: { ...state.resources, [type]: state.resources[type] - amount } });
        return true;
      },
      addMessage: (chatId, message) => set(state => ({
        messages: {
          ...state.messages,
          [chatId]: [
            ...(state.messages[chatId] || []),
            {
              ...message,
              id: Math.random().toString(36).substr(2, 9),
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          ]
        }
      })),
      setActiveChat: (chatId) => set({ activeChatId: chatId }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedContact: (contact) => set({ selectedContact: contact }),
      toggleMap: (show) => set(state => ({ showMap: show ?? !state.showMap })),
      toggleShelterEditor: (show) => set(state => ({ showShelterEditor: show ?? !state.showShelterEditor })),
      nextDay: () => set(state => ({ days: state.days + 1 })),
      decreaseMonsterTimer: () => set(state => ({ monsterTimer: state.monsterTimer <= 1 ? 60 : state.monsterTimer - 1 })),

      // --- 铁屋生存新增方法实现 ---
      updatePlayerAttributes: (attrs) => set(state => ({ player: { ...state.player, ...attrs } })),
      addItem: (item, count = 1) => set(state => {
        const existingItem = state.inventory.find(i => i.id === item.id);
        if (existingItem) {
          return {
            inventory: state.inventory.map(i => 
              i.id === item.id ? { ...i, count: i.count + count } : i
            )
          };
        }
        return { inventory: [...state.inventory, { ...item, count }] };
      }),
      removeItem: (itemId, count = 1) => {
        const state = get();
        const existingItem = state.inventory.find(i => i.id === itemId);
        if (!existingItem || existingItem.count < count) return false;
        if (existingItem.count === count) {
          set({ inventory: state.inventory.filter(i => i.id !== itemId) });
        } else {
          set({ inventory: state.inventory.map(i => 
            i.id === itemId ? { ...i, count: i.count - count } : i
          ) });
        }
        return true;
      },
      addQuest: (quest) => set(state => ({ quests: [...state.quests, quest] })),
      updateQuestProgress: (questId, objectiveIndex, count) => set(state => ({
        quests: state.quests.map(q => {
          if (q.id !== questId) return q;
          const objectives = [...q.objectives];
          objectives[objectiveIndex] = {
            ...objectives[objectiveIndex],
            count: Math.min(objectives[objectiveIndex].count + count, objectives[objectiveIndex].target),
            completed: objectives[objectiveIndex].count + count >= objectives[objectiveIndex].target
          };
          return { ...q, objectives };
        })
      })),
      completeQuest: (questId) => set(state => ({
        quests: state.quests.map(q => q.id === questId ? { ...q, status: 'completed' } : q)
      })),
      updateFactionReputation: (factionId, amount) => set(state => ({
        factions: state.factions.map(f => 
          f.factionId === factionId ? { ...f, reputation: f.reputation + amount } : f
        )
      })),
      addNpcToContacts: (npc) => set(state => {
        if (state.contacts.find(c => c.id === npc.id)) return state;
        return { contacts: [...state.contacts, npc] };
      }),
      createNpcChat: (npcId, npcName, avatar) => set(state => {
        if (state.chats.find(c => c.id === npcId)) return state;
        return {
          chats: [...state.chats, {
            id: npcId,
            name: npcName,
            avatar,
            desc: 'NPC 对话',
            type: 'npc'
          }]
        };
      }),
      sendGameEvent: (event) => {
        const { type, data, chatId = 'sys_notice' } = event;
        const state = get();

        // 处理不同类型的游戏事件
        switch (type) {
          case 'resource_gained':
            state.addMessage(chatId, {
              sender: 'system',
              text: `【获得物资】${Object.entries(data.resources).map(([k, v]) => `${k}: +${v}`).join(', ')}`
            });
            Object.entries(data.resources).forEach(([k, v]) => state.addResource(k as ResourceType, v as number));
            break;
          case 'quest_accepted':
            state.addQuest(data.quest);
            state.addMessage(chatId, {
              sender: 'system',
              text: `【任务接受】${data.quest.title}\n${data.quest.description}`
            });
            break;
          case 'quest_completed':
            state.completeQuest(data.questId);
            state.addMessage(chatId, {
              sender: 'system',
              text: `【任务完成】${data.quest.title}\n获得奖励：${data.rewards.map((r: any) => r.name || r.type).join(', ')}`
            });
            break;
          case 'combat_result':
            state.addMessage(chatId, {
              sender: 'system',
              text: `【战斗结果】${data.won ? '胜利！' : '失败！'}\n${data.reward ? `获得：${data.reward}` : ''}${data.damage ? `\n受到伤害：${data.damage}` : ''}`
            });
            break;
          case 'npc_interaction':
            if (!state.chats.find(c => c.id === data.npcId)) {
              state.createNpcChat(data.npcId, data.npcName, data.avatar);
              state.addNpcToContacts({
                id: data.npcId,
                name: data.npcName,
                avatar: data.avatar,
                role: data.role,
                status: 'idle',
                bio: data.bio,
                affection: 0
              });
            }
            state.addMessage(data.npcId, {
              sender: 'npc',
              text: data.message,
              actions: data.actions
            });
            break;
        }
      },
      toggleCharacterPanel: (show) => set(state => ({ showCharacterPanel: show ?? !state.showCharacterPanel })),
      toggleInventory: (show) => set(state => ({ showInventory: show ?? !state.showInventory })),
      toggleQuestPanel: (show) => set(state => ({ showQuestPanel: show ?? !state.showQuestPanel })),
    }),
    {
      name: 'iron-house-survival-storage',
      partialize: (state) => ({
        resources: state.resources,
        shelter: state.shelter,
        maids: state.maids,
        days: state.days,
        player: state.player,
        inventory: state.inventory,
        quests: state.quests,
        factions: state.factions,
        contacts: state.contacts,
        chats: state.chats,
        messages: state.messages,
      }),
    }
  )
);
