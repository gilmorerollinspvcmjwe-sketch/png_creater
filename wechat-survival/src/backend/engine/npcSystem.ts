/**
 * NPC 系统 - 管理 NPC 对话、交易和好感度
 */

import { NPC, NPCType, Dialogue, TradeItem, GameState, Resources } from './types';

/**
 * NPC 系统类
 */
export class NPCSystem {
  private npcs: Map<string, NPC> = new Map();
  private recruitedNpcs: string[] = [];

  /**
   * 加载 NPC 数据
   */
  loadNpcs(npcData: NPC[]): void {
    npcData.forEach(npc => {
      this.npcs.set(npc.id, { ...npc });
    });
  }

  /**
   * 获取所有 NPC
   */
  getAllNpcs(): NPC[] {
    return Array.from(this.npcs.values()).map(n => ({ ...n }));
  }

  /**
   * 获取特定类型的 NPC
   */
  getNpcsByType(type: NPCType): NPC[] {
    return Array.from(this.npcs.values()).filter(n => n.type === type);
  }

  /**
   * 获取 NPC by ID
   */
  getNpc(npcId: string): NPC | undefined {
    return this.npcs.get(npcId);
  }

  /**
   * 获取已招募的 NPC
   */
  getRecruitedNpcs(): NPC[] {
    return this.recruitedNpcs
      .map(id => this.npcs.get(id))
      .filter((n): n is NPC => n !== undefined)
      .map(n => ({ ...n }));
  }

  /**
   * 与 NPC 对话
   */
  talkToNpc(npcId: string, timeOfDay?: 'morning' | 'afternoon' | 'night'): { 
    success: boolean; 
    dialogue?: Dialogue; 
    message: string 
  } {
    const npc = this.npcs.get(npcId);
    
    if (!npc) {
      return { success: false, message: 'NPC 不存在' };
    }
    
    if (!npc.dialogue || npc.dialogue.length === 0) {
      return { success: false, message: `${npc.name} 没有什么要说的` };
    }
    
    // 根据条件和好感度选择合适的对话
    const availableDialogue = npc.dialogue.find(d => {
      if (!d.condition) return true;
      
      if (d.condition.minRelationship && npc.relationship < d.condition.minRelationship) {
        return false;
      }
      
      if (d.condition.timeOfDay && timeOfDay && d.condition.timeOfDay !== timeOfDay) {
        return false;
      }
      
      return true;
    });
    
    if (availableDialogue) {
      return { success: true, dialogue: { ...availableDialogue }, message: `${npc.name}: ${availableDialogue.text}` };
    }
    
    // 默认对话
    return { success: true, dialogue: { ...npc.dialogue[0] }, message: `${npc.name}: ${npc.dialogue[0].text}` };
  }

  /**
   * 回应 NPC 对话
   */
  respondToNpc(npcId: string, dialogueId: string, responseIndex: number): { 
    success: boolean; 
    message: string;
    relationshipChange?: number;
    nextDialogue?: string;
    triggerQuest?: string;
  } {
    const npc = this.npcs.get(npcId);
    
    if (!npc || !npc.dialogue) {
      return { success: false, message: 'NPC 不存在' };
    }
    
    const dialogue = npc.dialogue.find(d => d.id === dialogueId);
    
    if (!dialogue || !dialogue.responses || !dialogue.responses[responseIndex]) {
      return { success: false, message: '无效的回应' };
    }
    
    const response = dialogue.responses[responseIndex];
    const effect = response.effect;
    
    // 应用效果
    if (effect?.relationshipChange) {
      this.modifyRelationship(npcId, effect.relationshipChange);
    }
    
    return {
      success: true,
      message: response.text,
      relationshipChange: effect?.relationshipChange,
      nextDialogue: effect?.nextDialogue,
      triggerQuest: effect?.triggerQuest,
    };
  }

  /**
   * 修改好感度
   */
  modifyRelationship(npcId: string, amount: number): { success: boolean; newRelationship: number } {
    const npc = this.npcs.get(npcId);
    
    if (!npc) {
      return { success: false, newRelationship: 0 };
    }
    
    npc.relationship = Math.max(0, Math.min(100, npc.relationship + amount));
    
    return { success: true, newRelationship: npc.relationship };
  }

  /**
   * 获取好感度
   */
  getRelationship(npcId: string): number {
    return this.npcs.get(npcId)?.relationship || 0;
  }

  /**
   * 与 NPC 交易
   */
  tradeWithNpc(npcId: string, itemId: string, quantity: number = 1): { 
    success: boolean; 
    message: string;
    cost?: { type: string; amount: number };
    receivedItem?: string;
  } {
    const npc = this.npcs.get(npcId);
    
    if (!npc) {
      return { success: false, message: 'NPC 不存在' };
    }
    
    if (npc.type !== 'merchant') {
      return { success: false, message: `${npc.name} 不是商人` };
    }
    
    if (!npc.tradeItems) {
      return { success: false, message: `${npc.name} 没有可交易的物品` };
    }
    
    const tradeItem = npc.tradeItems.find(t => t.itemId === itemId);
    
    if (!tradeItem) {
      return { success: false, message: '物品不存在' };
    }
    
    // 检查库存
    if (tradeItem.stock !== undefined && tradeItem.stock !== -1) {
      if (tradeItem.stock < quantity) {
        return { success: false, message: '库存不足' };
      }
      tradeItem.stock -= quantity;
    }
    
    return {
      success: true,
      message: `成功购买了 ${quantity}x ${tradeItem.name}`,
      cost: { type: tradeItem.currency, amount: tradeItem.price * quantity },
      receivedItem: tradeItem.name,
    };
  }

  /**
   * 获取 NPC 的交易物品
   */
  getTradeItems(npcId: string): TradeItem[] {
    const npc = this.npcs.get(npcId);
    
    if (!npc || !npc.tradeItems) {
      return [];
    }
    
    return [...npc.tradeItems];
  }

  /**
   * 招募 NPC
   */
  recruitNpc(npcId: string): { success: boolean; message: string } {
    const npc = this.npcs.get(npcId);
    
    if (!npc) {
      return { success: false, message: 'NPC 不存在' };
    }
    
    if (npc.type !== 'survivor' && npc.type !== 'special') {
      return { success: false, message: `${npc.name} 无法被招募` };
    }
    
    if (npc.isRecruited) {
      return { success: false, message: `${npc.name} 已经加入了` };
    }
    
    npc.isRecruited = true;
    this.recruitedNpcs.push(npcId);
    
    return { success: true, message: `${npc.name} 加入了你的避难所！` };
  }

  /**
   * 检查 NPC 是否可招募
   */
  canRecruit(npcId: string): { canRecruit: boolean; reason?: string } {
    const npc = this.npcs.get(npcId);
    
    if (!npc) {
      return { canRecruit: false, reason: 'NPC 不存在' };
    }
    
    if (npc.type !== 'survivor' && npc.type !== 'special') {
      return { canRecruit: false, reason: '该 NPC 无法被招募' };
    }
    
    if (npc.isRecruited) {
      return { canRecruit: false, reason: '已经招募' };
    }
    
    if (npc.relationship < 30) {
      return { canRecruit: false, reason: '好感度不足（需要 30）' };
    }
    
    return { canRecruit: true };
  }

  /**
   * 获取 NPC 的特殊能力
   */
  getNpcAbility(npcId: string): string | undefined {
    return this.npcs.get(npcId)?.specialAbility;
  }

  /**
   * 应用 NPC 能力加成
   */
  applyNpcBonus(type: string): number {
    let bonus = 0;
    
    this.recruitedNpcs.forEach(id => {
      const npc = this.npcs.get(id);
      if (npc && npc.specialAbility) {
        // 根据能力类型应用加成
        if (npc.specialAbility.includes(type)) {
          bonus += 10; // 每个相关 NPC +10%
        }
      }
    });
    
    return bonus;
  }

  /**
   * 添加 NPC
   */
  addNpc(npc: NPC): void {
    this.npcs.set(npc.id, { ...npc });
  }

  /**
   * 移除 NPC
   */
  removeNpc(npcId: string): boolean {
    const result = this.npcs.delete(npcId);
    this.recruitedNpcs = this.recruitedNpcs.filter(id => id !== npcId);
    return result;
  }

  /**
   * 序列化 NPC 数据
   */
  serialize(): { npcs: NPC[]; recruitedNpcs: string[] } {
    return {
      npcs: Array.from(this.npcs.values()).map(n => ({ ...n })),
      recruitedNpcs: [...this.recruitedNpcs],
    };
  }

  /**
   * 反序列化 NPC 数据
   */
  deserialize(data: { npcs: NPC[]; recruitedNpcs: string[] }): void {
    this.npcs.clear();
    data.npcs.forEach(npc => {
      this.npcs.set(npc.id, { ...npc });
    });
    this.recruitedNpcs = [...data.recruitedNpcs];
  }
}

/**
 * 创建商人 NPC（2 个）
 */
export function createMerchantNpcs(): NPC[] {
  return [
    {
      id: 'NPC_MERCHANT_01',
      name: '流浪商人汤姆',
      type: 'merchant',
      rarity: 'R',
      level: 5,
      hp: 50,
      attack: 8,
      defense: 5,
      personality: '幽默、奸诈',
      relationship: 0,
      isRecruited: false,
      specialAbility: '交易折扣',
      dialogue: [
        {
          id: 'd1',
          text: '嘿，幸存者！我叫汤姆，这片废土上最精明的商人！要不要看看我的货？',
          responses: [
            { text: '看看有什么', effect: { nextDialogue: 'trade' } },
            { text: '不需要，谢谢', effect: {} },
          ],
        },
        {
          id: 'trade',
          text: '好嘞，看看这些好东西！',
          responses: [
            { text: '开始交易', effect: { nextDialogue: 'trade' } },
            { text: '下次吧', effect: {} },
          ],
        },
        {
          id: 'high_rep',
          text: '老朋友！汤姆我最近搞到了一批好货，第一个想到的就是你！',
          condition: { minRelationship: 50 },
          responses: [
            { text: '看看', effect: { nextDialogue: 'trade' } },
          ],
        },
      ],
      tradeItems: [
        { itemId: 'food_pack', name: '食物包×10', price: 5, currency: 'ammo' },
        { itemId: 'water_pack', name: '水×10', price: 2, currency: 'medicine' },
        { itemId: 'medicine_pack', name: '药品×5', price: 15, currency: 'food' },
        { itemId: 'bandage', name: '绷带×3', price: 10, currency: 'water' },
      ],
    },
    {
      id: 'NPC_MERCHANT_02',
      name: '军火商铁拳',
      type: 'merchant',
      rarity: 'SR',
      level: 10,
      hp: 100,
      attack: 20,
      defense: 10,
      personality: '冷漠、简短',
      relationship: 0,
      isRecruited: false,
      specialAbility: '武器折扣',
      dialogue: [
        {
          id: 'd1',
          text: '要买什么？',
          responses: [
            { text: '看看武器', effect: { nextDialogue: 'trade' } },
            { text: '离开', effect: {} },
          ],
        },
        {
          id: 'trade',
          text: '自己挑。',
          responses: [
            { text: '购买', effect: {} },
            { text: '算了', effect: {} },
          ],
        },
      ],
      tradeItems: [
        { itemId: 'pistol', name: '手枪', price: 50, currency: 'scrap', stock: 1 },
        { itemId: 'shotgun', name: '霰弹枪', price: 100, currency: 'scrap', stock: 1 },
        { itemId: 'ammo_box', name: '子弹×10', price: 30, currency: 'caps' },
        { itemId: 'mine', name: '地雷×3', price: 100, currency: 'caps', stock: 5 },
      ],
    },
  ];
}

/**
 * 创建任务 giver NPC（3 个）
 */
export function createQuestGiverNpcs(): NPC[] {
  return [
    {
      id: 'NPC_QUEST_01',
      name: '老兵约翰',
      type: 'quest_giver',
      rarity: 'R',
      level: 15,
      hp: 120,
      attack: 18,
      defense: 12,
      personality: '严肃、经验丰富',
      relationship: 0,
      isRecruited: false,
      specialAbility: '战斗指导',
      dialogue: [
        {
          id: 'd1',
          text: '年轻人，末世生存不容易。有什么需要帮忙的吗？',
          responses: [
            { text: '有什么任务吗？', effect: { triggerQuest: 'SIDE_06' } },
            { text: '请教战斗技巧', effect: { relationshipChange: 2 } },
            { text: '再见', effect: {} },
          ],
        },
        {
          id: 'high_rep',
          text: '你进步很快。我这里有个重要任务...',
          condition: { minRelationship: 50 },
          responses: [
            { text: '请说', effect: { triggerQuest: 'SIDE_07' } },
          ],
        },
      ],
      quests: ['SIDE_06', 'SIDE_07'],
    },
    {
      id: 'NPC_QUEST_02',
      name: '工程师老马',
      type: 'quest_giver',
      rarity: 'R',
      level: 12,
      hp: 80,
      attack: 10,
      defense: 8,
      personality: '温和、技术宅',
      relationship: 0,
      isRecruited: false,
      specialAbility: '装备维修',
      dialogue: [
        {
          id: 'd1',
          text: '哦，你好。我在研究怎么修复这些旧设备。',
          responses: [
            { text: '需要帮忙吗？', effect: { triggerQuest: 'SIDE_04' } },
            { text: '能修装备吗？', effect: { relationshipChange: 1 } },
            { text: '打扰了', effect: {} },
          ],
        },
      ],
      quests: ['SIDE_04', 'SIDE_08'],
    },
    {
      id: 'NPC_QUEST_03',
      name: '女记者小雨',
      type: 'quest_giver',
      rarity: 'SR',
      level: 8,
      hp: 60,
      attack: 8,
      defense: 6,
      personality: '聪明、好奇心强',
      relationship: 0,
      isRecruited: false,
      specialAbility: '情报收集',
      dialogue: [
        {
          id: 'd1',
          text: '你好！我在调查这场灾难的真相，有什么线索吗？',
          responses: [
            { text: '我知道一些地方', effect: { triggerQuest: 'SIDE_12' } },
            { text: '你在调查什么？', effect: { relationshipChange: 3 } },
            { text: '不清楚', effect: {} },
          ],
        },
        {
          id: 'high_rep',
          text: '我发现了医院的一些秘密文件...',
          condition: { minRelationship: 40 },
          responses: [
            { text: '一起去看看', effect: { triggerQuest: 'SIDE_13' } },
          ],
        },
      ],
      quests: ['SIDE_12', 'SIDE_13'],
    },
  ];
}

/**
 * 创建可招募幸存者（3 个）
 */
export function createSurvivorNpcs(): NPC[] {
  return [
    {
      id: 'NPC_SURVIVOR_01',
      name: '退役医生林姐',
      type: 'survivor',
      rarity: 'SR',
      level: 10,
      hp: 70,
      attack: 6,
      defense: 8,
      personality: '温柔、责任感强',
      relationship: 0,
      isRecruited: false,
      specialAbility: '医疗（免费治疗，药品产出 +50%）',
      dialogue: [
        {
          id: 'd1',
          text: '我是医生，有什么受伤的地方吗？',
          responses: [
            { text: '请帮我治疗', effect: { relationshipChange: 5 } },
            { text: '加入我们吧', effect: { relationshipChange: 10 } },
            { text: '谢谢', effect: {} },
          ],
        },
        {
          id: 'recruit',
          text: '我会尽我所能帮助大家。这是我作为医生的职责。',
          condition: { minRelationship: 30 },
          responses: [
            { text: '欢迎加入', effect: {} },
          ],
        },
      ],
    },
    {
      id: 'NPC_SURVIVOR_02',
      name: '大学生阿杰',
      type: 'survivor',
      rarity: 'R',
      level: 5,
      hp: 50,
      attack: 5,
      defense: 4,
      personality: '乐观、技术控',
      relationship: 0,
      isRecruited: false,
      specialAbility: '电磁设备维修',
      dialogue: [
        {
          id: 'd1',
          text: '嘿！你也对电子设备感兴趣吗？',
          responses: [
            { text: '你会修什么？', effect: { relationshipChange: 2 } },
            { text: '一起走吧', effect: { relationshipChange: 5 } },
            { text: '还好', effect: {} },
          ],
        },
      ],
    },
    {
      id: 'NPC_SURVIVOR_03',
      name: '前警察老张',
      type: 'survivor',
      rarity: 'R',
      level: 12,
      hp: 100,
      attack: 15,
      defense: 10,
      personality: '正直、保护欲强',
      relationship: 0,
      isRecruited: false,
      specialAbility: '守卫（夜间安保，队友伤害 +10%）',
      dialogue: [
        {
          id: 'd1',
          text: '这附近不安全，你一个人吗？',
          responses: [
            { text: '我有避难所', effect: { relationshipChange: 3 } },
            { text: '需要保护吗？', effect: { relationshipChange: 5 } },
            { text: '还好', effect: {} },
          ],
        },
      ],
    },
  ];
}

/**
 * 创建敌对 NPC（2 个）
 */
export function createHostileNpcs(): NPC[] {
  return [
    {
      id: 'NPC_HOSTILE_01',
      name: '匪徒首领',
      type: 'hostile',
      rarity: 'SR',
      level: 15,
      hp: 150,
      attack: 20,
      defense: 10,
      personality: '凶残、狡猾',
      relationship: -100,
      isRecruited: false,
      dialogue: [
        {
          id: 'd1',
          text: '哼，又一个不知死活的家伙！',
          responses: [],
        },
      ],
    },
    {
      id: 'NPC_HOSTILE_02',
      name: '变异体 Boss',
      type: 'hostile',
      rarity: 'UR',
      level: 25,
      hp: 500,
      attack: 40,
      defense: 20,
      personality: '狂暴、无理智',
      relationship: -100,
      isRecruited: false,
      dialogue: [
        {
          id: 'd1',
          text: '吼！！！',
          responses: [],
        },
      ],
    },
  ];
}

/**
 * 创建所有 NPC
 */
export function createAllNpcs(): NPC[] {
  return [
    ...createMerchantNpcs(),
    ...createQuestGiverNpcs(),
    ...createSurvivorNpcs(),
    ...createHostileNpcs(),
  ];
}

export default NPCSystem;
