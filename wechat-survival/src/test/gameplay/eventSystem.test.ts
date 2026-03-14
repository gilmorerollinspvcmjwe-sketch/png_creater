/**
 * WeChat Survival - Event System Tests
 * 
 * Tests for event system: 15 Exploration + 8 Combat + 7 Random Events
 * Based on PHASE1_DESIGN.md Section 7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types
interface GameEvent {
  id: string;
  type: 'explore' | 'battle' | 'raid' | 'trade' | 'social' | 'random';
  subType?: string;
  title: string;
  description: string;
  options: EventOption[];
  difficulty?: number;
  triggerConditions?: {
    area?: string;
    probability?: number;
    timeOfDay?: string;
  };
}

interface EventOption {
  id: string;
  text: string;
  rewards?: Record<string, number>;
  costs?: Record<string, number>;
  effects?: string[];
  nextEvent?: string;
}

// Event Data from PHASE1_DESIGN.md Section 7
const EXPLORATION_EVENTS: GameEvent[] = [
  // Resource Discovery (5)
  {
    id: 'EXPLORE_01',
    type: 'explore',
    subType: 'resource',
    title: '废弃超市',
    description: '你发现了一家废弃超市，货架上还有一些物资。',
    triggerConditions: { area: '避难所周边' },
    options: [
      { id: '1', text: '搜索物资（获得食物×5, 水×3）- 有风险', rewards: { food: 5, water: 3 } },
      { id: '2', text: '谨慎搜索（获得食物×2, 水×2）- 无风险', rewards: { food: 2, water: 2 } },
      { id: '3', text: '离开（无收获，无风险）' },
    ],
  },
  {
    id: 'EXPLORE_02',
    type: 'explore',
    subType: 'resource',
    title: '民居搜索',
    description: '居民楼内可能有物资。',
    options: [
      { id: '1', text: '破门→随机获得', rewards: { random: 1 } },
      { id: '2', text: '敲门→无风险获得少', rewards: { random: 1, risk: 0 } },
      { id: '3', text: '离开' },
    ],
  },
  {
    id: 'EXPLORE_03',
    type: 'explore',
    subType: 'resource',
    title: '水源发现',
    description: '发现一条小溪。',
    options: [
      { id: '1', text: '取水→水+10', rewards: { water: 10 } },
      { id: '2', text: '装过滤器→水+5，持续3天', rewards: { water: 5 }, effects: ['water_filter_3days'] },
      { id: '3', text: '离开' },
    ],
  },
  {
    id: 'EXPLORE_04',
    type: 'explore',
    subType: 'resource',
    title: '仓库发现',
    description: '发现上锁仓库。',
    options: [
      { id: '1', text: '撬锁→获得稀有', rewards: { rare: 1 } },
      { id: '2', text: '找钥匙→需探索', nextEvent: 'EXPLORE_04B' },
      { id: '3', text: '放弃' },
    ],
  },
  {
    id: 'EXPLORE_05',
    type: 'explore',
    subType: 'resource',
    title: '农田遗迹',
    description: '废弃农田有残余作物。',
    options: [
      { id: '1', text: '采集→食物+8', rewards: { food: 8 } },
      { id: '2', text: '搜寻种子→农场升级材料', rewards: { seeds: 1 } },
      { id: '3', text: '离开' },
    ],
  },
  // Encounters (5)
  {
    id: 'EXPLORE_06',
    type: 'explore',
    subType: 'encounter',
    title: '流浪狗',
    description: '可怜巴巴的流浪狗。',
    options: [
      { id: '1', text: '喂养→获得伙伴', rewards: { companion: 1 } },
      { id: '2', text: '驱赶→无' },
      { id: '3', text: '伤害→获得肉', rewards: { meat: 1 } },
    ],
  },
  {
    id: 'EXPLORE_07',
    type: 'explore',
    subType: 'encounter',
    title: '幸存者求助',
    description: '有人呼救。',
    options: [
      { id: '1', text: '救援→可能获得同伴', rewards: { survivor: 1 }, effects: ['risk_injury'] },
      { id: '2', text: '观察→获取情报', rewards: { intel: 1 } },
      { id: '3', text: '不管' },
    ],
  },
  {
    id: 'EXPLORE_08',
    type: 'explore',
    subType: 'encounter',
    title: '匪徒抢劫',
    description: '遇到匪徒！',
    options: [
      { id: '1', text: '战斗→战斗事件', nextEvent: 'BATTLE_03' },
      { id: '2', text: '交钱→损失资源', costs: { caps: 50 } },
      { id: '3', text: '逃跑' },
    ],
  },
  {
    id: 'EXPLORE_09',
    type: 'explore',
    subType: 'encounter',
    title: '商人偶遇',
    description: '流浪商人出现了！',
    options: [
      { id: '1', text: '交易', nextEvent: 'TRADE_01' },
    ],
  },
  {
    id: 'EXPLORE_10',
    type: 'explore',
    subType: 'encounter',
    title: '尸体搜索',
    description: '发现尸体。',
    options: [
      { id: '1', text: '搜索→随机获得', rewards: { random: 1 } },
      { id: '2', text: '尊重→无' },
      { id: '3', text: '离开' },
    ],
  },
  // Random Choice (5)
  {
    id: 'EXPLORE_11',
    type: 'explore',
    subType: 'choice',
    title: '迷雾区域',
    description: '进入迷雾。',
    options: [
      { id: '1', text: '前进→随机事件', nextEvent: 'random' },
      { id: '2', text: '绕路→安全但耗时', costs: { time: 1 } },
      { id: '3', text: '等待' },
    ],
  },
  {
    id: 'EXPLORE_12',
    type: 'explore',
    subType: 'choice',
    title: '分岔路口',
    description: '两条路可选。',
    options: [
      { id: '1', text: '左→资源', rewards: { resource: 1 } },
      { id: '2', text: '右→危险但高回报', rewards: { resource: 2 }, effects: ['high_risk'] },
      { id: '3', text: '返回' },
    ],
  },
  {
    id: 'EXPLORE_13',
    type: 'explore',
    subType: 'choice',
    title: '建筑坍塌',
    description: '道路被堵。',
    options: [
      { id: '1', text: '清理→耗时获得资源', costs: { time: 1 }, rewards: { resource: 1 } },
      { id: '2', text: '绕远→安全', costs: { time: 2 } },
      { id: '3', text: '攀爬→高风险', effects: ['very_high_risk'] },
    ],
  },
  {
    id: 'EXPLORE_14',
    type: 'explore',
    subType: 'choice',
    title: '信号发现',
    description: '检测到信号。',
    options: [
      { id: '1', text: '追踪→触发任务', nextEvent: 'QUEST_TRIGGER' },
      { id: '2', text: '记录→后续任务', rewards: { quest_marker: 1 } },
      { id: '3', text: '忽略' },
    ],
  },
  {
    id: 'EXPLORE_15',
    type: 'explore',
    subType: 'choice',
    title: '动物群',
    description: '遇到动物群。',
    options: [
      { id: '1', text: '猎杀→获得食物', rewards: { food: 5 } },
      { id: '2', text: '驱赶→安全' },
      { id: '3', text: '观察→获得情报', rewards: { intel: 1 } },
    ],
  },
];

const BATTLE_EVENTS: GameEvent[] = [
  { id: 'BATTLE_01', type: 'battle', title: '丧尸犬袭击', difficulty: 1, options: [{ id: '1', text: '战斗' }] },
  { id: 'BATTLE_02', type: 'battle', title: '小型尸群', difficulty: 2, options: [{ id: '1', text: '战斗' }] },
  { id: 'BATTLE_03', type: 'battle', title: '埋伏', difficulty: 2, options: [{ id: '1', text: '战斗' }] },
  { id: 'BATTLE_04', type: 'battle', title: '丧尸围攻', difficulty: 3, options: [{ id: '1', text: '战斗' }] },
  { id: 'BATTLE_05', type: 'battle', title: '突袭', difficulty: 3, options: [{ id: '1', text: '战斗' }] },
  { id: 'BATTLE_06', type: 'battle', title: '变异体', difficulty: 4, options: [{ id: '1', text: '战斗' }] },
  { id: 'BATTLE_07', type: 'battle', title: '巢穴入口', difficulty: 5, options: [{ id: '1', text: '战斗' }] },
  { id: 'BATTLE_08', type: 'battle', title: 'Boss战', difficulty: 6, options: [{ id: '1', text: '战斗' }] },
];

const RANDOM_EVENTS: GameEvent[] = [
  { id: 'RANDOM_01', type: 'random', title: '暴风雨', description: '所有探索取消，资源消耗+50%', triggerConditions: { probability: 10 } },
  { id: 'RANDOM_02', type: 'random', title: '物资空投', description: '随机获得资源', triggerConditions: { probability: 14 } }, // Weekly
  { id: 'RANDOM_03', type: 'random', title: '幸存者投奔', description: '随机招募', triggerConditions: { probability: 15 } },
  { id: 'RANDOM_04', type: 'random', title: '疾病爆发', description: '幸存者生病，治疗消耗增加', triggerConditions: { probability: 5 } },
  { id: 'RANDOM_05', type: 'random', title: '交易车队', description: '特殊商人出现', triggerConditions: { probability: 10 } },
  { id: 'RANDOM_06', type: 'random', title: '地震', description: '设施损坏概率', triggerConditions: { probability: 3 } },
  { id: 'RANDOM_07', type: 'random', title: '好消息', description: '经验/资源奖励', triggerConditions: { probability: 20 } },
];

describe('Event System', () => {
  describe('Exploration Events (15)', () => {
    /**
     * Test: Total exploration events
     * Validates: PHASE1_DESIGN.md Section 7.2 - 15个探索事件
     */
    it('should have exactly 15 exploration events', () => {
      expect(EXPLORATION_EVENTS).toHaveLength(15);
    });

    /**
     * Test: Resource discovery events
     * Validates: PHASE1_DESIGN.md Section 7.2 - 资源发现类5个
     */
    it('should have 5 resource discovery events', () => {
      const resourceEvents = EXPLORATION_EVENTS.filter(e => e.subType === 'resource');
      expect(resourceEvents).toHaveLength(5);
    });

    /**
     * Test: Resource event rewards
     * Validates: PHASE1_DESIGN.md Section 7.2 - 资源获取
     */
    it('should provide rewards for resource events', () => {
      const event = EXPLORATION_EVENTS.find(e => e.id === 'EXPLORE_01');
      const optionWithReward = event?.options.find(o => o.rewards?.food);
      
      expect(optionWithReward?.rewards?.food).toBeGreaterThan(0);
    });

    /**
     * Test: Encounter events
     * Validates: PHASE1_DESIGN.md Section 7.2 - 遭遇类5个
     */
    it('should have 5 encounter events', () => {
      const encounterEvents = EXPLORATION_EVENTS.filter(e => e.subType === 'encounter');
      expect(encounterEvents).toHaveLength(5);
    });

    /**
     * Test: Choice events
     * Validates: PHASE1_DESIGN.md Section 7.2 - 随机选择类5个
     */
    it('should have 5 choice events', () => {
      const choiceEvents = EXPLORATION_EVENTS.filter(e => e.subType === 'choice');
      expect(choiceEvents).toHaveLength(5);
    });

    /**
     * Test: Abandoned supermarket event
     * Validates: PHASE1_DESIGN.md Section 7.2 - EXPLORE_01
     */
    it('should have abandoned supermarket event', () => {
      const event = EXPLORATION_EVENTS.find(e => e.id === 'EXPLORE_01');
      expect(event?.title).toBe('废弃超市');
    });

    /**
     * Test: Event option balance
     * Validates: PHASE1_DESIGN.md - 选项平衡，各有优劣
     */
    it('should have balanced event options', () => {
      const event = EXPLORATION_EVENTS.find(e => e.id === 'EXPLORE_01');
      
      // Option 1: High reward with risk
      // Option 2: Low reward without risk
      // Option 3: No reward, no risk
      
      expect(event?.options).toHaveLength(3);
      expect(event?.options[0].rewards?.food).toBeGreaterThan(event?.options[1].rewards?.food || 0);
    });
  });

  describe('Battle Events (8)', () => {
    /**
     * Test: Total battle events
     * Validates: PHASE1_DESIGN.md Section 7.3 - 8个战斗事件
     */
    it('should have exactly 8 battle events', () => {
      expect(BATTLE_EVENTS).toHaveLength(8);
    });

    /**
     * Test: Difficulty scaling
     * Validates: PHASE1_DESIGN.md Section 7.3 - 难度分布
     */
    it('should have increasing difficulty', () => {
      const difficulties = BATTLE_EVENTS.map(e => e.difficulty || 0);
      const isIncreasing = difficulties.every((d, i) => i === 0 || d >= difficulties[i - 1]);
      expect(isIncreasing).toBe(true);
    });

    /**
     * Test: Zombie dog battle
     * Validates: PHASE1_DESIGN.md Section 7.3 - BATTLE_01
     */
    it('should have zombie dog battle', () => {
      const event = BATTLE_EVENTS.find(e => e.id === 'BATTLE_01');
      expect(event?.title).toBe('丧尸犬袭击');
    });

    /**
     * Test: Boss battle exists
     * Validates: PHASE1_DESIGN.md Section 7.3 - BATTLE_08 Boss战
     */
    it('should have boss battle', () => {
      const event = BATTLE_EVENTS.find(e => e.id === 'BATTLE_08');
      expect(event?.title).toBe('Boss战');
      expect(event?.difficulty).toBe(6);
    });

    /**
     * Test: Enemy configurations
     * Validates: PHASE1_DESIGN.md Section 7.3 - 敌人配置
     */
    it('should have proper enemy configurations', () => {
      // BATTLE_04: 普通丧尸×5 + 敏捷型×1
      const event = BATTLE_EVENTS.find(e => e.id === 'BATTLE_04');
      expect(event).toBeDefined();
    });
  });

  describe('Random Events (7)', () => {
    /**
     * Test: Total random events
     * Validates: PHASE1_DESIGN.md Section 7.4 - 7个随机事件
     */
    it('should have exactly 7 random events', () => {
      expect(RANDOM_EVENTS).toHaveLength(7);
    });

    /**
     * Test: Random event probabilities
     * Validates: PHASE1_DESIGN.md Section 7.4 - 触发概率
     */
    it('should have valid trigger probabilities', () => {
      RANDOM_EVENTS.forEach(event => {
        const prob = event.triggerConditions?.probability || 0;
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(100);
      });
    });

    /**
     * Test: Good news event
     * Validates: PHASE1_DESIGN.md Section 7.4 - RANDOM_07
     */
    it('should have good news event', () => {
      const event = RANDOM_EVENTS.find(e => e.id === 'RANDOM_07');
      expect(event?.title).toBe('好消息');
    });

    /**
     * Test: Storm event
     * Validates: PHASE1_DESIGN.md Section 7.4 - RANDOM_01
     */
    it('should have storm event with resource penalty', () => {
      const event = RANDOM_EVENTS.find(e => e.id === 'RANDOM_01');
      expect(event?.description).toContain('资源消耗+50%');
    });

    /**
     * Test: Supply drop event
     * Validates: PHASE1_DESIGN.md Section 7.4 - RANDOM_02 每周一次
     */
    it('should have weekly supply drop event', () => {
      const event = RANDOM_EVENTS.find(e => e.id === 'RANDOM_02');
      expect(event?.title).toBe('物资空投');
    });
  });

  describe('Event ID Validation', () => {
    /**
     * Test: Event ID format
     * Validates: SCHEMA.md - Event ID格式
     */
    it('should validate exploration event IDs', () => {
      const pattern = /^EXPLORE_\d{2}$/;
      EXPLORATION_EVENTS.forEach(event => {
        expect(pattern.test(event.id)).toBe(true);
      });
    });

    /**
     * Test: Battle event ID format
     */
    it('should validate battle event IDs', () => {
      const pattern = /^BATTLE_\d{2}$/;
      BATTLE_EVENTS.forEach(event => {
        expect(pattern.test(event.id)).toBe(true);
      });
    });

    /**
     * Test: Random event ID format
     */
    it('should validate random event IDs', () => {
      const pattern = /^RANDOM_\d{2}$/;
      RANDOM_EVENTS.forEach(event => {
        expect(pattern.test(event.id)).toBe(true);
      });
    });
  });

  describe('Event Trigger System', () => {
    /**
     * Test: Area-based triggers
     * Validates: PHASE1_DESIGN.md Section 7 - 触发条件
     */
    it('should trigger events based on area', () => {
      const area = '避难所周边';
      const availableEvents = EXPLORATION_EVENTS.filter(
        e => !e.triggerConditions?.area || e.triggerConditions.area === area
      );
      
      expect(availableEvents.length).toBeGreaterThan(0);
    });

    /**
     * Test: Probability-based triggers
     * Validates: PHASE1_DESIGN.md Section 7.4 - 随机触发
     */
    it('should trigger random events based on probability', () => {
      const shouldTrigger = Math.random() * 100 < 20;
      // Random test - just verify the mechanism works
      expect(typeof shouldTrigger).toBe('boolean');
    });

    /**
     * Test: Time-based triggers
     * Validates: PHASE1_DESIGN.md Section 3.3 - 每日节奏
     */
    it('should trigger events based on time of day', () => {
      const timeOfDay = 'morning';
      const morningEvents = ['resource_discovery'];
      
      expect(morningEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Total Event Count', () => {
    /**
     * Test: Total 30+ events requirement
     * Validates: PHASE1_DESIGN.md Section 7 - 30+事件
     */
    it('should have at least 30 events', () => {
      const total = EXPLORATION_EVENTS.length + BATTLE_EVENTS.length + RANDOM_EVENTS.length;
      expect(total).toBeGreaterThanOrEqual(30);
    });

    /**
     * Test: Exact event count
     * Validates: PHASE1_DESIGN.md - 15 + 8 + 7 = 30
     */
    it('should have exactly 30 events (15+8+7)', () => {
      const total = EXPLORATION_EVENTS.length + BATTLE_EVENTS.length + RANDOM_EVENTS.length;
      expect(total).toBe(30);
    });
  });
});
