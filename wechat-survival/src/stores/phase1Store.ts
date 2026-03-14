import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Resources, 
  Shelter, 
  PlayerAttributes, 
  InventoryItem, 
  Quest, 
  NPC, 
  ChatMessage, 
  ChatInfo,
  GameEvent,
  Enemy
} from '../types/phase1';
import { PHASE1_MAIN_QUESTS, PHASE1_SIDE_QUESTS, PHASE1_NPCS } from '../types/phase1';

// ==================== 初始数据 ====================

const INITIAL_RESOURCES: Resources = {
  food: 20,
  water: 20,
  wood: 10,
  scrap: 5,
  caps: 50,
  ammo: 10,
  medicine: 3
};

const INITIAL_SHELTER: Shelter = {
  level: 1,
  area: 10,
  npcSlots: 2,
  resources: {},
  defense: {
    wall: 10,
    trap: 0,
    guard: 0
  },
  facilities: [],
  power: 5,
  space: 10,
  defenseLevel: 1,
  powerLevel: 1,
  farmLevel: 1,
  waterLevel: 1
};

const INITIAL_PLAYER: PlayerAttributes = {
  health: 100,
  hunger: 100,
  thirst: 100,
  stamina: 100,
  level: 1,
  exp: 0,
  strength: 5,
  agility: 5,
  intelligence: 5
};

const INITIAL_CHATS: ChatInfo[] = [
  {
    id: 'sys_notice',
    name: '消息通知',
    avatar: 'https://picsum.photos/seed/notice/50/50',
    desc: '系统重要预警',
    type: 'system',
    pinned: true
  },
  {
    id: 'group_building',
    name: '求生大楼群',
    avatar: [
      'https://picsum.photos/seed/p1/20/20',
      'https://picsum.photos/seed/p2/20/20',
      'https://picsum.photos/seed/p3/20/20',
      'https://picsum.photos/seed/p4/20/20'
    ],
    desc: '300 位幸存者在线',
    type: 'group',
    pinned: true,
    memberCount: 300
  },
  {
    id: 'explore',
    name: '废土探索',
    avatar: 'https://picsum.photos/seed/explore/50/50',
    desc: '无限大世界探索',
    type: 'task'
  },
  {
    id: 'shelter',
    name: '我的避难所',
    avatar: 'https://picsum.photos/seed/shelter/50/50',
    desc: '基地建设',
    type: 'task'
  },
  {
    id: 'quest',
    name: '任务列表',
    avatar: 'https://picsum.photos/seed/quest/50/50',
    desc: '查看当前任务',
    type: 'task'
  },
  {
    id: 'NPC_MERCHANT_01',
    name: '流浪商人汤姆',
    avatar: 'https://picsum.photos/seed/trader/50/50',
    desc: '限时交易事件',
    type: 'event'
  }
];

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  sys_notice: [
    {
      id: 's1',
      sender: 'system',
      text: '【系统消息】欢迎来到废土生存游戏！今晚将有小型丧尸潮攻击，请加固防御。\n【挂机收益】昨日收益：水 +10，食物 +10。',
      time: '09:00'
    }
  ],
  group_building: [
    {
      id: 'g1',
      sender: 'player',
      senderName: '张三',
      text: '有人有余粮吗？我快饿死了。',
      time: '10:05'
    }
  ],
  explore: [
    {
      id: 'e1',
      sender: 'system',
      text: '【探索】当前位于：废弃加油站。点击下方指令开始行动。\n\n【选项】\n1. 周边拾荒\n2. 深入废墟\n3. 返回基地',
      time: '10:00',
      actions: ['周边拾荒', '深入废墟', '返回基地']
    }
  ],
  shelter: [
    {
      id: 'sh1',
      sender: 'system',
      text: '【避难所】当前等级：1\n\n【设施】\n🛡️ 防御等级：Lv.1\n⚡ 电力等级：Lv.1\n🌾 农场等级：Lv.1\n💧 水处理：Lv.1\n\n点击右上角进入可视化编辑模式。',
      time: '10:00'
    }
  ],
  quest: [
    {
      id: 'q1',
      sender: 'system',
      text: '【主线任务】第一天：基础生存\n收集食物×10，水×10\n\n点击接受任务开始。',
      time: '09:00',
      actions: ['接受任务']
    }
  ],
  NPC_MERCHANT_01: [
    {
      id: 't1',
      sender: 'npc',
      text: '嘿，幸存者！我有些好东西，要不要看看？\n\n【可交易物品】\n- 食物×10 = 弹药×5\n- 水×10 = 药品×2\n- 弹药×20 = 稀有材料×1',
      time: '11:00',
      actions: ['交易食物', '交易水', '交易弹药', '离开']
    }
  ]
};

// ==================== Store 类型定义 ====================

interface GameState {
  // 基础状态
  resources: Resources;
  shelter: Shelter;
  player: PlayerAttributes;
  inventory: InventoryItem[];
  quests: Quest[];
  npcs: NPC[];
  contacts: NPC[];
  
  // 聊天系统
  chats: ChatInfo[];
  messages: Record<string, ChatMessage[]>;
  
  // 游戏进度
  days: number;
  monsterTimer: number;
  currentLocation: string;
  
  // 战斗状态
  isInCombat: boolean;
  currentCombat: {
    enemies: Enemy[];
    playerHealth: number;
    turn: number;
  } | null;
  
  // 事件
  activeEvents: GameEvent[];
  
  // UI 状态
  activeTab: 'message' | 'task' | 'inventory' | 'shelter';
  activeChatId: string;
  selectedContact: NPC | null;
  showCharacterPanel: boolean;
  showInventory: boolean;
  showQuestPanel: boolean;
  showMap: boolean;
  showShelterEditor: boolean;
  
  // 方法
  // 资源
  setResources: (resources: Partial<Resources>) => void;
  addResource: (type: keyof Resources, amount: number) => void;
  subtractResource: (type: keyof Resources, amount: number) => boolean;
  
  // 消息
  addMessage: (chatId: string, message: Omit<ChatMessage, 'id' | 'time'>) => void;
  setActiveChat: (chatId: string) => void;
  
  // UI
  setActiveTab: (tab: 'message' | 'task' | 'inventory' | 'shelter') => void;
  setSelectedContact: (contact: NPC | null) => void;
  toggleCharacterPanel: (show?: boolean) => void;
  toggleInventory: (show?: boolean) => void;
  toggleQuestPanel: (show?: boolean) => void;
  toggleMap: (show?: boolean) => void;
  toggleShelterEditor: (show?: boolean) => void;
  
  // 游戏逻辑
  nextDay: () => void;
  decreaseMonsterTimer: () => void;
  acceptQuest: (questId: string) => void;
  completeQuestObjective: (questId: string, objectiveIndex: number, count: number) => void;
  completeQuest: (questId: string) => void;
  addItem: (item: InventoryItem, count?: number) => void;
  removeItem: (itemId: string, count?: number) => boolean;
  addNpc: (npc: NPC) => void;
  updateNpcRelationship: (npcId: string, amount: number) => void;
  
  // 战斗
  startCombat: (enemies: Enemy[]) => void;
  endCombat: (won: boolean, rewards?: any) => void;
  
  // 事件
  triggerEvent: (event: GameEvent) => void;
  resolveEvent: (eventId: string, optionId: string) => void;
}

// ==================== Store 实现 ====================

export const usePhase1Store = create<GameState>()(
  persist(
    (set, get) => ({
      // 初始状态
      resources: INITIAL_RESOURCES,
      shelter: INITIAL_SHELTER,
      player: INITIAL_PLAYER,
      inventory: [],
      quests: [...PHASE1_MAIN_QUESTS, ...PHASE1_SIDE_QUESTS],
      npcs: PHASE1_NPCS,
      contacts: PHASE1_NPCS,
      
      chats: INITIAL_CHATS,
      messages: INITIAL_MESSAGES,
      
      days: 1,
      monsterTimer: 60,
      currentLocation: '废弃加油站',
      
      isInCombat: false,
      currentCombat: null,
      
      activeEvents: [],
      
      activeTab: 'message',
      activeChatId: 'explore',
      selectedContact: null,
      showCharacterPanel: false,
      showInventory: false,
      showQuestPanel: false,
      showMap: false,
      showShelterEditor: false,
      
      // 资源方法
      setResources: (resources) => set(state => ({
        resources: { ...state.resources, ...resources }
      })),
      
      addResource: (type, amount) => set(state => ({
        resources: { 
          ...state.resources, 
          [type]: Math.min(9999, state.resources[type] + amount) 
        }
      })),
      
      subtractResource: (type, amount) => {
        const state = get();
        if (state.resources[type] < amount) return false;
        set({ 
          resources: { 
            ...state.resources, 
            [type]: state.resources[type] - amount 
          } 
        });
        return true;
      },
      
      // 消息方法
      addMessage: (chatId, message) => set(state => ({
        messages: {
          ...state.messages,
          [chatId]: [
            ...(state.messages[chatId] || []),
            {
              ...message,
              id: Math.random().toString(36).substr(2, 9),
              time: new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
            }
          ]
        }
      })),
      
      setActiveChat: (chatId) => set({ activeChatId: chatId }),
      
      // UI 方法
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedContact: (contact) => set({ selectedContact: contact }),
      toggleCharacterPanel: (show) => set(state => ({ 
        showCharacterPanel: show ?? !state.showCharacterPanel 
      })),
      toggleInventory: (show) => set(state => ({ 
        showInventory: show ?? !state.showInventory 
      })),
      toggleQuestPanel: (show) => set(state => ({ 
        showQuestPanel: show ?? !state.showQuestPanel 
      })),
      toggleMap: (show) => set(state => ({ 
        showMap: show ?? !state.showMap 
      })),
      toggleShelterEditor: (show) => set(state => ({ 
        showShelterEditor: show ?? !state.showShelterEditor 
      })),
      
      // 游戏逻辑方法
      nextDay: () => set(state => ({ 
        days: state.days + 1,
        monsterTimer: 60,
        // 每日资源消耗
        resources: {
          ...state.resources,
          food: Math.max(0, state.resources.food - state.contacts.length * 2),
          water: Math.max(0, state.resources.water - state.contacts.length * 1)
        }
      })),
      
      decreaseMonsterTimer: () => set(state => ({ 
        monsterTimer: state.monsterTimer <= 1 ? 60 : state.monsterTimer - 1 
      })),
      
      acceptQuest: (questId) => set(state => ({
        quests: state.quests.map(q => 
          q.id === questId 
            ? { ...q, status: 'in_progress', acceptedAt: Date.now() }
            : q
        )
      })),
      
      completeQuestObjective: (questId, objectiveIndex, count) => set(state => ({
        quests: state.quests.map(q => {
          if (q.id !== questId) return q;
          const objectives = [...q.objectives];
          if (objectives[objectiveIndex]) {
            objectives[objectiveIndex] = {
              ...objectives[objectiveIndex],
              count: Math.min(
                objectives[objectiveIndex].count + count, 
                objectives[objectiveIndex].target
              ),
              completed: objectives[objectiveIndex].count + count >= objectives[objectiveIndex].target
            };
          }
          return { ...q, objectives };
        })
      })),
      
      completeQuest: (questId) => set(state => {
        const quest = state.quests.find(q => q.id === questId);
        if (!quest || quest.status !== 'in_progress') return state;
        
        // 发放奖励
        quest.rewards.forEach(reward => {
          if (reward.type === 'exp') {
            set(s => ({
              player: { 
                ...s.player, 
                exp: s.player.exp + reward.amount 
              }
            }));
          } else if (reward.type === 'resource' && reward.id) {
            set(s => ({
              resources: {
                ...s.resources,
                [reward.id]: s.resources[reward.id as keyof Resources] + reward.amount
              }
            }));
          } else if (reward.type === 'item' && reward.name) {
            set(s => ({
              inventory: [
                ...s.inventory,
                {
                  id: `reward_${questId}`,
                  name: reward.name,
                  type: 'consumable',
                  rarity: 'R',
                  description: '任务奖励',
                  stackable: true,
                  value: reward.amount,
                  count: 1
                }
              ]
            }));
          }
        });
        
        return {
          quests: state.quests.map(q => 
            q.id === questId 
              ? { ...q, status: 'completed', completedAt: Date.now() }
              : q
          )
        };
      }),
      
      // 背包方法
      addItem: (item, count = 1) => set(state => {
        const existingItem = state.inventory.find(i => i.id === item.id);
        if (existingItem && item.stackable) {
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
          set({ 
            inventory: state.inventory.map(i => 
              i.id === itemId ? { ...i, count: i.count - count } : i
            ) 
          });
        }
        return true;
      },
      
      // NPC 方法
      addNpc: (npc) => set(state => {
        if (state.npcs.find(n => n.id === npc.id)) return state;
        return { 
          npcs: [...state.npcs, npc],
          contacts: [...state.contacts, npc]
        };
      }),
      
      updateNpcRelationship: (npcId, amount) => set(state => ({
        npcs: state.npcs.map(n => 
          n.id === npcId 
            ? { ...n, relationship: Math.min(100, n.relationship + amount) }
            : n
        ),
        contacts: state.contacts.map(c => 
          c.id === npcId 
            ? { ...c, relationship: Math.min(100, c.relationship + amount) }
            : c
        )
      })),
      
      // 战斗方法
      startCombat: (enemies) => set({
        isInCombat: true,
        currentCombat: {
          enemies,
          playerHealth: get().player.health,
          turn: 1
        }
      }),
      
      endCombat: (won, rewards) => {
        const state = get();
        if (!state.currentCombat) return;
        
        if (won && rewards) {
          // 发放战斗奖励
          if (rewards.exp) {
            set(s => ({
              player: { ...s.player, exp: s.player.exp + rewards.exp }
            }));
          }
          if (rewards.items) {
            rewards.items.forEach((item: any) => {
              get().addItem(item);
            });
          }
        }
        
        set({
          isInCombat: false,
          currentCombat: null
        });
      },
      
      // 事件方法
      triggerEvent: (event) => set(state => ({
        activeEvents: [...state.activeEvents, event]
      })),
      
      resolveEvent: (eventId, optionId) => {
        const state = get();
        const event = state.activeEvents.find(e => e.id === eventId);
        if (!event) return;
        
        const option = event.options.find(o => o.id === optionId);
        if (!option) return;
        
        // 执行选项结果
        if (option.result.reward?.resources) {
          Object.entries(option.result.reward.resources).forEach(([key, value]) => {
            get().addResource(key as keyof Resources, value);
          });
          get().addMessage('sys_notice', {
            sender: 'system',
            text: `【事件奖励】获得：${Object.entries(option.result.reward.resources)
              .map(([k, v]) => `${k}×${v}`)
              .join(', ')}`
          });
        }
        
        // 标记事件完成
        set({
          activeEvents: state.activeEvents.filter(e => e.id !== eventId)
        });
      }
    }),
    {
      name: 'wechat-survival-phase1-storage',
      partialize: (state) => ({
        resources: state.resources,
        shelter: state.shelter,
        player: state.player,
        inventory: state.inventory,
        quests: state.quests,
        npcs: state.npcs,
        contacts: state.contacts,
        chats: state.chats,
        messages: state.messages,
        days: state.days,
        currentLocation: state.currentLocation
      })
    }
  )
);
