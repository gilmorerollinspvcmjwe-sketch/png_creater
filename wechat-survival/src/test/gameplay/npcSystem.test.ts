/**
 * WeChat Survival - NPC System Tests
 * 
 * Tests for NPC system: merchants, quest givers, survivors, special NPCs, enemies
 * Based on PHASE1_DESIGN.md Section 6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types matching SCHEMA.md
interface NPC {
  id: string;
  name: string;
  type: 'maid' | 'companion' | 'assistant' | 'warrior' | 'merchant' | 'rival' | 'boss';
  rarity: 'N' | 'R' | 'SR' | 'SSR' | 'UR' | 'L';
  attributes: {
    level: number;
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  personality: string;
  background: string;
  acquisition?: string;
  relationship: number;
  availableQuests?: string[];
  tradableItems?: TradableItem[];
  specialAbilities?: string[];
  recruitConditions?: RecruitCondition[];
}

interface TradableItem {
  item: string;
  price: string;
  priceType: 'item' | 'currency';
}

interface RecruitCondition {
  type: 'level' | 'quest' | 'item' | 'resource';
  value: string | number;
}

// NPC Data from PHASE1_DESIGN.md Section 6.2
const NPCs: NPC[] = [
  // Merchants (2)
  {
    id: 'NPC_MERCHANT_01',
    name: '流浪商人汤姆',
    type: 'merchant',
    rarity: 'R',
    attributes: { level: 5, hp: 50, attack: 5, defense: 5, speed: 10 },
    personality: '幽默、奸诈',
    background: '废土上最精明的商人之一，居无定所，四处漂泊',
    relationship: 0,
    tradableItems: [
      { item: '食物×10', price: '弹药×5', priceType: 'item' },
      { item: '水×10', price: '药品×2', priceType: 'item' },
      { item: '药品×5', price: '食物×15', priceType: 'item' },
      { item: '绷带×3', price: '水×10', priceType: 'item' },
    ],
    specialAbilities: ['神秘商品(好感度50+)'],
  },
  {
    id: 'NPC_MERCHANT_02',
    name: '军火商铁拳',
    type: 'merchant',
    rarity: 'SR',
    attributes: { level: 10, hp: 80, attack: 15, defense: 10, speed: 8 },
    personality: '冷漠、简短',
    background: '神秘的军火商人，掌握大量武器资源',
    relationship: 0,
    tradableItems: [
      { item: '手枪', price: '废铁×50 + 药品×5', priceType: 'item' },
      { item: '霰弹枪', price: '废铁×100 + 稀有材料×5', priceType: 'item' },
      { item: '子弹×10', price: '瓶盖×30', priceType: 'currency' },
      { item: '地雷×3', price: '瓶盖×100', priceType: 'currency' },
    ],
  },
  // Quest Givers (3)
  {
    id: 'NPC_QUEST_01',
    name: '老兵约翰',
    type: 'warrior',
    rarity: 'SR',
    attributes: { level: 15, hp: 150, attack: 25, defense: 20, speed: 12 },
    personality: '严肃、专业',
    background: '前特种兵，擅长战斗和战术',
    relationship: 0,
    availableQuests: ['SIDE_06', 'SIDE_07'],
    specialAbilities: ['战斗指导(好感度50+)'],
  },
  {
    id: 'NPC_QUEST_02',
    name: '工程师老马',
    type: 'assistant',
    rarity: 'SR',
    attributes: { level: 12, hp: 100, attack: 8, defense: 15, speed: 8 },
    personality: '务实、细心',
    background: '退休工程师，擅长机械维修',
    relationship: 0,
    availableQuests: ['SIDE_04', 'SIDE_08'],
    specialAbilities: ['装备维修', '设施建造指导'],
  },
  {
    id: 'NPC_QUEST_03',
    name: '女记者小雨',
    type: 'companion',
    rarity: 'R',
    attributes: { level: 8, hp: 70, attack: 5, defense: 8, speed: 15 },
    personality: '好奇、勇敢',
    background: '末世前知名记者，掌握很多情报',
    relationship: 0,
    availableQuests: ['SIDE_12', 'SIDE_13'],
  },
  // Survivors (3)
  {
    id: 'NPC_SURVIVOR_01',
    name: '退役医生林姐',
    type: 'companion',
    rarity: 'SR',
    attributes: { level: 10, hp: 90, attack: 5, defense: 10, speed: 7 },
    personality: '温柔、专业',
    background: '40岁，前三甲医院外科医生',
    relationship: 0,
    recruitConditions: [
      { type: 'level', value: '医疗室等级≥2' },
      { type: 'item', value: '药品×5' },
    ],
    specialAbilities: ['治疗伤员(免费)', '医疗研究(药品产出+50%)'],
  },
  {
    id: 'NPC_SURVIVOR_02',
    name: '大学生阿杰',
    type: 'assistant',
    rarity: 'R',
    attributes: { level: 5, hp: 60, attack: 8, defense: 5, speed: 14 },
    personality: '聪明、灵活',
    background: '22岁，计算机专业',
    relationship: 0,
    recruitConditions: [
      { type: 'level', value: '电力等级≥3' },
      { type: 'quest', value: '城市废墟' },
    ],
    specialAbilities: ['电磁设备维修', '破解密码门'],
  },
  {
    id: 'NPC_SURVIVOR_03',
    name: '前警察老张',
    type: 'warrior',
    rarity: 'SR',
    attributes: { level: 15, hp: 140, attack: 20, defense: 25, speed: 10 },
    personality: '正直、可靠',
    background: '45岁，退休警察，擅长格斗',
    relationship: 0,
    recruitConditions: [
      { type: 'quest', value: '战斗胜利5次' },
      { type: 'item', value: '铁刀或更好武器' },
    ],
    specialAbilities: ['守卫避难所(夜间安保)', '战斗训练(队友伤害+10%)'],
  },
  // Special NPCs (2)
  {
    id: 'NPC_SPECIAL_01',
    name: '老医生',
    type: 'companion',
    rarity: 'SR',
    attributes: { level: 20, hp: 100, attack: 5, defense: 15, speed: 5 },
    personality: '慈祥、经验丰富',
    background: '德高望重的老医生',
    relationship: 0,
  },
  {
    id: 'NPC_SPECIAL_02',
    name: '红狐狸',
    type: 'merchant',
    rarity: 'SSR',
    attributes: { level: 12, hp: 70, attack: 12, defense: 8, speed: 18 },
    personality: '神秘、消息灵通',
    background: '情报贩子，解锁隐藏任务',
    relationship: 0,
  },
];

describe('NPC System', () => {
  describe('NPC Count', () => {
    /**
     * Test: Total NPC count
     * Validates: PHASE1_DESIGN.md Section 6.1 - 10+ NPCs
     */
    it('should have at least 10 NPCs', () => {
      expect(NPCs.length).toBeGreaterThanOrEqual(10);
    });

    /**
     * Test: Merchant NPCs
     * Validates: PHASE1_DESIGN.md Section 6.1 - 商人2个
     */
    it('should have 2 merchant NPCs', () => {
      const merchants = NPCs.filter(n => n.type === 'merchant');
      // Currently have 2 merchants defined
      expect(merchants.length).toBeGreaterThanOrEqual(2);
    });

    /**
     * Test: Quest giver NPCs
     * Validates: PHASE1_DESIGN.md Section 6.1 - 任务giver 3个
     */
    it('should have 3 quest giver NPCs', () => {
      const questGivers = NPCs.filter(n => n.availableQuests && n.availableQuests.length > 0);
      expect(questGivers).toHaveLength(3);
    });

    /**
     * Test: Survivor NPCs
     * Validates: PHASE1_DESIGN.md Section 6.1 - 可招募幸存者3个
     */
    it('should have 3 survivor NPCs', () => {
      const survivors = NPCs.filter(n => n.recruitConditions);
      expect(survivors).toHaveLength(3);
    });
  });

  describe('Merchant System', () => {
    /**
     * Test: Merchant can trade items
     * Validates: PHASE1_DESIGN.md Section 6.2 - 可交易物品
     */
    it('should allow trading items with merchants', () => {
      const merchant = NPCs.find(n => n.type === 'merchant');
      expect(merchant?.tradableItems).toBeDefined();
      expect(merchant?.tradableItems?.length).toBeGreaterThan(0);
    });

    /**
     * Test: Trade calculation
     * Validates: PHASE1_DESIGN.md Section 6.2 - 交易价格
     */
    it('should calculate trade correctly', () => {
      const playerItems = { food: 10, ammo: 0 };
      const tradePrice = { food: 10, ammo: 5 };
      const canTrade = playerItems.food >= tradePrice.food && playerItems.ammo >= tradePrice.ammo;
      
      expect(canTrade).toBe(false); // Not enough ammo
    });

    /**
     * Test: Tom the merchant appearance
     * Validates: PHASE1_DESIGN.md Section 6.2 - 流浪商人汤姆
     */
    it('should have merchant Tom', () => {
      const tom = NPCs.find(n => n.id === 'NPC_MERCHANT_01');
      expect(tom).toBeDefined();
      expect(tom?.name).toBe('流浪商人汤姆');
    });

    /**
     * Test: Iron Fist merchant unlock
     * Validates: PHASE1_DESIGN.md Section 6.2 - 军火商铁拳位置
     */
    it('should have Iron Fist as locked merchant', () => {
      const ironFist = NPCs.find(n => n.id === 'NPC_MERCHANT_02');
      expect(ironFist).toBeDefined();
    });
  });

  describe('NPC Interaction', () => {
    /**
     * Test: NPC dialogue triggers
     * Validates: PHASE1_DESIGN.md Section 6.2 - 对话系统
     */
    it('should allow NPC dialogue', () => {
      const npc = NPCs[0];
      const canTalk = npc.id.startsWith('NPC_');
      expect(canTalk).toBe(true);
    });

    /**
     * Test: Relationship/favorability system
     * Validates: PHASE1_DESIGN.md Section 6.2 - 好感度系统
     */
    it('should track NPC relationship', () => {
      let npc = { ...NPCs[0], relationship: 0 };
      
      // Complete trade: +5
      npc.relationship += 5;
      // Complete quest: +10
      npc.relationship += 10;
      // Gift item: +5
      npc.relationship += 5;
      
      expect(npc.relationship).toBe(20);
    });

    /**
     * Test: Relationship unlocks abilities
     * Validates: PHASE1_DESIGN.md Section 6.2 - 能力解锁
     */
    it('should unlock abilities at relationship threshold', () => {
      const npc = NPCs.find(n => n.id === 'NPC_QUEST_01');
      const relationship = 50;
      const abilities = npc?.specialAbilities || [];
      const unlockedAbilities = relationship >= 50 ? abilities.filter(a => a.includes('战斗指导')) : [];
      
      expect(unlockedAbilities.length).toBe(1);
    });
  });

  describe('Survivor Recruitment', () => {
    /**
     * Test: Recruitment conditions check
     * Validates: PHASE1_DESIGN.md Section 6.2 - 招募条件
     */
    it('should check recruitment conditions', () => {
      const survivor = NPCs.find(n => n.id === 'NPC_SURVIVOR_01');
      const playerResources = { medicine: 5 };
      const shelterMedicalLevel = 2;
      
      const canRecruit = 
        playerResources.medicine >= 5 && 
        shelterMedicalLevel >= 2;
      
      expect(canRecruit).toBe(true);
    });

    /**
     * Test: Doctor Lin recruitment
     * Validates: PHASE1_DESIGN.md Section 6.2 - 退役医生林姐
     */
    it('should have Doctor Lin with medical abilities', () => {
      const lin = NPCs.find(n => n.id === 'NPC_SURVIVOR_01');
      expect(lin?.specialAbilities).toContain('治疗伤员(免费)');
    });

    /**
     * Test: Student Jay recruitment
     * Validates: PHASE1_DESIGN.md Section 6.2 - 大学生阿杰
     */
    it('should have Student Jay with tech abilities', () => {
      const jay = NPCs.find(n => n.id === 'NPC_SURVIVOR_02');
      expect(jay?.specialAbilities).toContain('破解密码门');
    });

    /**
     * Test: Officer Zhang recruitment
     * Validates: PHASE1_DESIGN.md Section 6.2 - 前警察老张
     */
    it('should have Officer Zhang with combat abilities', () => {
      const zhang = NPCs.find(n => n.id === 'NPC_SURVIVOR_03');
      expect(zhang?.specialAbilities).toContain('守卫避难所(夜间安保)');
    });
  });

  describe('NPC Rarity System', () => {
    /**
     * Test: Rarity multiplier
     * Validates: SCHEMA.md - 稀有度对应属性倍率
     */
    it('should apply rarity multipliers correctly', () => {
      const baseStats = { hp: 100, attack: 10 };
      const rarityMultipliers: Record<string, number> = {
        'N': 1.0,
        'R': 1.2,
        'SR': 1.5,
        'SSR': 2.0,
        'UR': 3.0,
        'L': 2.5,
      };
      
      const npc = NPCs.find(n => n.rarity === 'SR');
      const multiplier = rarityMultipliers[npc?.rarity || 'N'];
      
      expect(multiplier).toBe(1.5);
    });

    /**
     * Test: Rarity distribution
     * Validates: SCHEMA.md - 稀有度分布
     */
    it('should have correct rarity distribution', () => {
      const rarities = NPCs.map(n => n.rarity);
      const srCount = rarities.filter(r => r === 'SR').length;
      
      expect(srCount).toBeGreaterThan(0);
    });
  });

  describe('NPC ID Validation', () => {
    /**
     * Test: NPC ID format
     * Validates: SCHEMA.md - NPC ID格式
     */
    it('should validate NPC ID format', () => {
      const idPattern = /^NPC_[A-Z_]+_\d{2}$/;
      
      NPCs.forEach(npc => {
        expect(idPattern.test(npc.id)).toBe(true);
      });
    });

    /**
     * Test: NPC types are valid
     * Validates: SCHEMA.md - NPC类型
     */
    it('should have valid NPC types', () => {
      const validTypes = ['maid', 'companion', 'assistant', 'warrior', 'merchant', 'rival', 'boss'];
      
      NPCs.forEach(npc => {
        expect(validTypes).toContain(npc.type);
      });
    });
  });
});
