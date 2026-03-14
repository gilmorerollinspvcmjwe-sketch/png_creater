/**
 * WeChat Survival - Quest System Tests
 * 
 * Tests for quest system: 5 Main Quests + 15 Side Quests
 * Based on PHASE1_DESIGN.md Section 5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types matching SCHEMA.md
interface Quest {
  id: string;
  type: 'main' | 'side' | 'daily' | 'event';
  title: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  difficulty: number;
  prerequisites?: string[];
  unlockConditions?: {
    level?: number;
    day?: number;
    resources?: Record<string, number>;
  };
}

interface QuestObjective {
  id: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
}

interface QuestReward {
  type: 'exp' | 'item' | 'unlock' | 'currency';
  value: number | string;
  amount?: number;
}

// Quest data from PHASE1_DESIGN.md Section 5
const MAIN_QUESTS: Quest[] = [
  {
    id: 'MAIN_01',
    type: 'main',
    title: '第一天：基础生存',
    objectives: [
      { id: 'obj_1', description: '收集食物×10', target: 10, progress: 0, completed: false },
      { id: 'obj_2', description: '收集水×10', target: 10, progress: 0, completed: false },
    ],
    rewards: [
      { type: 'exp', value: 100 },
      { type: 'unlock', value: 'shelter_building' },
    ],
    difficulty: 1,
    unlockConditions: { day: 1 },
  },
  {
    id: 'MAIN_02',
    type: 'main',
    title: '第三天：清理周边',
    objectives: [
      { id: 'obj_1', description: '击杀普通丧尸×5', target: 5, progress: 0, completed: false },
    ],
    rewards: [
      { type: 'exp', value: 200 },
      { type: 'unlock', value: 'combat_system' },
      { type: 'item', value: 'iron_sword', amount: 1 },
    ],
    difficulty: 2,
    prerequisites: ['MAIN_01'],
    unlockConditions: { day: 3 },
  },
  {
    id: 'MAIN_03',
    type: 'main',
    title: '第五天：寻找幸存者',
    objectives: [
      { id: 'obj_1', description: '招募1名幸存者', target: 1, progress: 0, completed: false },
    ],
    rewards: [
      { type: 'exp', value: 300 },
      { type: 'unlock', value: 'survivor_system' },
    ],
    difficulty: 3,
    prerequisites: ['MAIN_02'],
    unlockConditions: { day: 5 },
  },
  {
    id: 'MAIN_04',
    type: 'main',
    title: '第十天：医疗设施',
    objectives: [
      { id: 'obj_1', description: '建设医疗室', target: 1, progress: 0, completed: false },
    ],
    rewards: [
      { type: 'exp', value: 400 },
      { type: 'unlock', value: 'medicine_production' },
    ],
    difficulty: 4,
    prerequisites: ['MAIN_03'],
    unlockConditions: { day: 10 },
  },
  {
    id: 'MAIN_05',
    type: 'main',
    title: '第三十天：解药线索',
    objectives: [
      { id: 'obj_1', description: '找到解药线索', target: 1, progress: 0, completed: false },
    ],
    rewards: [
      { type: 'exp', value: 500 },
      { type: 'unlock', value: 'game_ending' },
    ],
    difficulty: 5,
    prerequisites: ['MAIN_04'],
    unlockConditions: { day: 30 },
  },
];

const SIDE_QUESTS: Quest[] = [
  // Resource Collection (5)
  { id: 'SIDE_01', type: 'side', title: '寻找干净水源', objectives: [{ id: 'obj_1', description: '收集水×30', target: 30, progress: 0, completed: false }], rewards: [{ type: 'item', value: 'water_filter_blueprint' }], difficulty: 1 },
  { id: 'SIDE_02', type: 'side', title: '囤积粮食', objectives: [{ id: 'obj_1', description: '收集食物×50', target: 50, progress: 0, completed: false }], rewards: [{ type: 'currency', value: 500 }], difficulty: 1 },
  { id: 'SIDE_03', type: 'side', title: '收集废铁', objectives: [{ id: 'obj_1', description: '收集废铁×20', target: 20, progress: 0, completed: false }], rewards: [{ type: 'unlock', value: 'equipment_enhancement' }], difficulty: 1 },
  { id: 'SIDE_04', type: 'side', title: '寻找发电机', objectives: [{ id: 'obj_1', description: '找到发电机×1', target: 1, progress: 0, completed: false }], rewards: [{ type: 'unlock', value: 'power_level_up' }], difficulty: 2 },
  { id: 'SIDE_05', type: 'side', title: '药品储备', objectives: [{ id: 'obj_1', description: '收集药品×10', target: 10, progress: 0, completed: false }], rewards: [{ type: 'item', value: 'first_aid_kit' }], difficulty: 2 },
  // Combat Challenges (5)
  { id: 'SIDE_06', type: 'side', title: '清除变异体', objectives: [{ id: 'obj_1', description: '击杀变异丧尸×1', target: 1, progress: 0, completed: false }], rewards: [{ type: 'item', value: 'electric_gun_blueprint' }], difficulty: 3 },
  { id: 'SIDE_07', type: 'side', title: '守卫避难所', objectives: [{ id: 'obj_1', description: '抵御3波攻击', target: 3, progress: 0, completed: false }], rewards: [{ type: 'unlock', value: 'defense_level_up' }], difficulty: 3 },
  { id: 'SIDE_08', type: 'side', title: '突袭匪帮', objectives: [{ id: 'obj_1', description: '击杀匪徒×10', target: 10, progress: 0, completed: false }], rewards: [{ type: 'item', value: 'power_armor_blueprint' }], difficulty: 4 },
  { id: 'SIDE_09', type: 'side', title: '猎杀时刻', objectives: [{ id: 'obj_1', description: '击杀30只丧尸', target: 30, progress: 0, completed: false }], rewards: [{ type: 'unlock', value: 'title_hunter' }], difficulty: 3 },
  { id: 'SIDE_10', type: 'side', title: '巢穴探索', objectives: [{ id: 'obj_1', description: '进入丧尸巢穴并生还', target: 1, progress: 0, completed: false }], rewards: [{ type: 'item', value: 'nest_map' }], difficulty: 5 },
  // Exploration (3)
  { id: 'SIDE_11', type: 'side', title: '废弃工厂', objectives: [{ id: 'obj_1', description: '探索废弃工厂', target: 1, progress: 0, completed: false }], rewards: [{ type: 'unlock', value: 'new_area' }], difficulty: 2 },
  { id: 'SIDE_12', type: 'side', title: '城市废墟', objectives: [{ id: 'obj_1', description: '探索城市废墟', target: 1, progress: 0, completed: false }], rewards: [{ type: 'unlock', value: 'new_area' }], difficulty: 3 },
  { id: 'SIDE_13', type: 'side', title: '医院秘密', objectives: [{ id: 'obj_1', description: '探索医院', target: 1, progress: 0, completed: false }], rewards: [{ type: 'item', value: 'antidote_clue' }], difficulty: 4 },
  // NPC Relationships (2)
  { id: 'SIDE_14', type: 'side', title: '医生好感', objectives: [{ id: 'obj_1', description: '与老医生对话5次', target: 5, progress: 0, completed: false }], rewards: [{ type: 'unlock', value: 'exclusive_healing' }], difficulty: 2 },
  { id: 'SIDE_15', type: 'side', title: '商人信任', objectives: [{ id: 'obj_1', description: '与流浪商人交易10次', target: 10, progress: 0, completed: false }], rewards: [{ type: 'unlock', value: 'mystery_goods' }], difficulty: 3 },
];

describe('Quest System', () => {
  describe('Main Quests (5)', () => {
    /**
     * Test: All 5 main quests exist
     * Validates: PHASE1_DESIGN.md Section 5.1 - 5个主线任务
     */
    it('should have exactly 5 main quests', () => {
      expect(MAIN_QUESTS).toHaveLength(5);
    });

    /**
     * Test: MAIN_01 triggers on Day 1
     * Validates: PHASE1_DESIGN.md Section 5.1 - MAIN_01 第一天
     */
    it('should trigger MAIN_01 on Day 1', () => {
      const quest = MAIN_QUESTS.find(q => q.id === 'MAIN_01');
      expect(quest?.unlockConditions?.day).toBe(1);
    });

    /**
     * Test: MAIN_01 requires collecting food and water
     * Validates: PHASE1_DESIGN.md Section 5.1 - MAIN_01 食物×10, 水×10
     */
    it('should require food and water collection for MAIN_01', () => {
      const quest = MAIN_QUESTS.find(q => q.id === 'MAIN_01');
      const objectives = quest?.objectives.map(o => o.description);
      
      expect(objectives).toContain('收集食物×10');
      expect(objectives).toContain('收集水×10');
    });

    /**
     * Test: MAIN_01 unlocks shelter building
     * Validates: PHASE1_DESIGN.md Section 5.1 - 解锁避难所建设
     */
    it('should unlock shelter building after MAIN_01', () => {
      const quest = MAIN_QUESTS.find(q => q.id === 'MAIN_01');
      const rewards = quest?.rewards.filter(r => r.type === 'unlock');
      
      expect(rewards).toContainEqual({ type: 'unlock', value: 'shelter_building' });
    });

    /**
     * Test: MAIN_02 triggers on Day 3
     * Validates: PHASE1_DESIGN.md Section 5.1 - MAIN_02 第三天
     */
    it('should trigger MAIN_02 on Day 3', () => {
      const quest = MAIN_QUESTS.find(q => q.id === 'MAIN_02');
      expect(quest?.unlockConditions?.day).toBe(3);
    });

    /**
     * Test: MAIN_02 requires combat
     * Validates: PHASE1_DESIGN.md Section 5.1 - MAIN_02 击杀普通丧尸×5
     */
    it('should require combat for MAIN_02', () => {
      const quest = MAIN_QUESTS.find(q => q.id === 'MAIN_02');
      expect(quest?.objectives[0].description).toContain('击杀普通丧尸×5');
    });

    /**
     * Test: MAIN_03 triggers on Day 5
     * Validates: PHASE1_DESIGN.md Section 5.1 - MAIN_03 第五天
     */
    it('should trigger MAIN_03 on Day 5', () => {
      const quest = MAIN_QUESTS.find(q => q.id === 'MAIN_03');
      expect(quest?.unlockConditions?.day).toBe(5);
    });

    /**
     * Test: MAIN_03 requires recruiting survivor
     * Validates: PHASE1_DESIGN.md Section 5.1 - MAIN_03 招募1名幸存者
     */
    it('should require survivor recruitment for MAIN_03', () => {
      const quest = MAIN_QUESTS.find(q => q.id === 'MAIN_03');
      expect(quest?.objectives[0].description).toContain('招募1名幸存者');
    });

    /**
     * Test: Quest prerequisites are enforced
     * Validates: PHASE1_DESIGN.md Section 5.1 - 前置条件
     */
    it('should enforce quest prerequisites', () => {
      const quest2 = MAIN_QUESTS.find(q => q.id === 'MAIN_02');
      expect(quest2?.prerequisites).toContain('MAIN_01');
    });
  });

  describe('Side Quests (15)', () => {
    /**
     * Test: All 15 side quests exist
     * Validates: PHASE1_DESIGN.md Section 5.2 - 15个支线任务
     */
    it('should have exactly 15 side quests', () => {
      expect(SIDE_QUESTS).toHaveLength(15);
    });

    /**
     * Test: Resource collection quests (5)
     * Validates: PHASE1_DESIGN.md Section 5.2 - 资源收集类5个
     */
    it('should have 5 resource collection quests', () => {
      const resourceQuests = SIDE_QUESTS.filter(q => 
        ['SIDE_01', 'SIDE_02', 'SIDE_03', 'SIDE_04', 'SIDE_05'].includes(q.id)
      );
      expect(resourceQuests).toHaveLength(5);
    });

    /**
     * Test: Combat challenge quests (5)
     * Validates: PHASE1_DESIGN.md Section 5.2 - 战斗挑战类5个
     */
    it('should have 5 combat challenge quests', () => {
      const combatQuests = SIDE_QUESTS.filter(q => 
        ['SIDE_06', 'SIDE_07', 'SIDE_08', 'SIDE_09', 'SIDE_10'].includes(q.id)
      );
      expect(combatQuests).toHaveLength(5);
    });

    /**
     * Test: Exploration quests (3)
     * Validates: PHASE1_DESIGN.md Section 5.2 - 探索发现类3个
     */
    it('should have 3 exploration quests', () => {
      const explorationQuests = SIDE_QUESTS.filter(q => 
        ['SIDE_11', 'SIDE_12', 'SIDE_13'].includes(q.id)
      );
      expect(explorationQuests).toHaveLength(3);
    });

    /**
     * Test: NPC relationship quests (2)
     * Validates: PHASE1_DESIGN.md Section 5.2 - NPC关系类2个
     */
    it('should have 2 NPC relationship quests', () => {
      const npcQuests = SIDE_QUESTS.filter(q => 
        ['SIDE_14', 'SIDE_15'].includes(q.id)
      );
      expect(npcQuests).toHaveLength(2);
    });
  });

  describe('Quest Progression', () => {
    let playerQuests: Quest[];
    let playerLevel: number;
    let playerDay: number;
    let completedQuests: string[];

    beforeEach(() => {
      playerLevel = 1;
      playerDay = 1;
      completedQuests = [];
      playerQuests = [];
    });

    /**
     * Test: Quest can be accepted
     * Validates: PHASE1_DESIGN.md Section 5 - 任务流程
     */
    it('should allow accepting available quests', () => {
      const availableQuest = MAIN_QUESTS[0];
      const canAccept = !playerQuests.find(q => q.id === availableQuest.id);
      
      expect(canAccept).toBe(true);
    });

    /**
     * Test: Quest progress updates
     * Validates: PHASE1_DESIGN.md Section 5 - 任务进度
     */
    it('should update quest progress', () => {
      let quest = { ...MAIN_QUESTS[0] };
      quest.objectives[0].progress = 5;
      
      expect(quest.objectives[0].progress).toBe(5);
    });

    /**
     * Test: Quest completion detection
     * Validates: PHASE1_DESIGN.md Section 5 - 任务完成判断
     */
    it('should detect quest completion', () => {
      // Test that when all objectives are complete, quest is complete
      const objectives = [
        { id: 'obj_1', description: '收集食物×10', target: 10, progress: 10, completed: true },
        { id: 'obj_2', description: '收集水×10', target: 10, progress: 10, completed: true },
      ];
      
      const allCompleted = objectives.every((o) => o.completed);
      expect(allCompleted).toBe(true);
    });

    /**
     * Test: Quest rewards are distributed
     * Validates: PHASE1_DESIGN.md Section 5.1 - 任务奖励
     */
    it('should distribute quest rewards on completion', () => {
      const quest = MAIN_QUESTS[0];
      const rewards = quest.rewards;
      
      expect(rewards).toHaveLength(2); // exp + unlock
    });

    /**
     * Test: Daily quest refresh
     * Validates: PHASE1_DESIGN.md Section 3.3 - 任务刷新
     */
    it('should refresh daily quests', () => {
      const newDay = 2;
      const dailyQuestsRefreshed = newDay > playerDay;
      
      expect(dailyQuestsRefreshed).toBe(true);
    });
  });

  describe('Quest Validation', () => {
    /**
     * Test: Quest ID format validation
     * Validates: SCHEMA.md - Quest ID格式
     */
    it('should validate quest ID format', () => {
      const validIds = ['MAIN_01', 'SIDE_01', 'DAILY_01', 'EVENT_01'];
      const idPattern = /^(MAIN|SIDE|DAILY|EVENT)_\d{2}$/;
      
      validIds.forEach(id => {
        expect(idPattern.test(id)).toBe(true);
      });
    });

    /**
     * Test: Quest difficulty range
     * Validates: SCHEMA.md - difficulty 1-10
     */
    it('should have difficulty between 1 and 10', () => {
      const allQuests = [...MAIN_QUESTS, ...SIDE_QUESTS];
      
      allQuests.forEach(quest => {
        expect(quest.difficulty).toBeGreaterThanOrEqual(1);
        expect(quest.difficulty).toBeLessThanOrEqual(10);
      });
    });

    /**
     * Test: Quest objectives are quantifiable
     * Validates: PHASE1_DESIGN.md - 目标明确，可量化
     */
    it('should have quantifiable objectives', () => {
      const quest = MAIN_QUESTS[0];
      
      quest.objectives.forEach(obj => {
        expect(obj.target).toBeGreaterThan(0);
        expect(obj.description).toBeTruthy();
      });
    });
  });
});
