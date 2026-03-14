/**
 * 事件系统 - 管理探索事件、战斗事件和随机事件
 */

import { GameEvent, EventType, EventOption, EventResult, GameState, Resources } from './types';

/**
 * 事件系统类
 */
export class EventSystem {
  private events: Map<string, GameEvent> = new Map();
  private activeEvents: string[] = [];
  private completedEvents: string[] = [];

  /**
   * 加载事件数据
   */
  loadEvents(eventData: GameEvent[]): void {
    eventData.forEach(event => {
      this.events.set(event.id, { ...event });
    });
  }

  /**
   * 获取所有事件
   */
  getAllEvents(): GameEvent[] {
    return Array.from(this.events.values()).map(e => ({ ...e }));
  }

  /**
   * 获取特定类型的事件
   */
  getEventsByType(type: EventType): GameEvent[] {
    return Array.from(this.events.values()).filter(e => e.type === type);
  }

  /**
   * 获取事件 by ID
   */
  getEvent(eventId: string): GameEvent | undefined {
    return this.events.get(eventId);
  }

  /**
   * 触发事件
   */
  triggerEvent(eventId: string): { success: boolean; event?: GameEvent; message: string } {
    const event = this.events.get(eventId);
    
    if (!event) {
      return { success: false, message: '事件不存在' };
    }
    
    if (this.completedEvents.includes(eventId)) {
      return { success: false, message: '事件已完成' };
    }
    
    if (this.activeEvents.includes(eventId)) {
      return { success: false, message: '事件已在进行中' };
    }
    
    this.activeEvents.push(eventId);
    return { success: true, event: { ...event }, message: `触发了事件：${event.title}` };
  }

  /**
   * 选择事件选项
   */
  selectEventOption(eventId: string, optionId: string): EventResult | null {
    const event = this.events.get(eventId);
    
    if (!event || !this.activeEvents.includes(eventId)) {
      return null;
    }
    
    const option = event.options.find(o => o.id === optionId);
    if (!option) {
      return null;
    }
    
    const result = event.results.find(r => r.optionId === optionId);
    if (!result) {
      return null;
    }
    
    // 标记事件完成
    this.activeEvents = this.activeEvents.filter(id => id !== eventId);
    this.completedEvents.push(eventId);
    
    return { ...result };
  }

  /**
   * 检查选项是否可用
   */
  canSelectOption(option: EventOption, resources: Resources): boolean {
    if (!option.requirements) {
      return true;
    }
    
    if (option.requirements.resource) {
      const reqResources = option.requirements.resource;
      for (const [type, amount] of Object.entries(reqResources)) {
        if (amount && resources[type as keyof Resources] < amount) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * 获取活跃事件
   */
  getActiveEvents(): GameEvent[] {
    return this.activeEvents
      .map(id => this.events.get(id))
      .filter((e): e is GameEvent => e !== undefined)
      .map(e => ({ ...e }));
  }

  /**
   * 获取已完成事件
   */
  getCompletedEvents(): string[] {
    return [...this.completedEvents];
  }

  /**
   * 重置事件（用于测试）
   */
  resetEvent(eventId: string): void {
    this.activeEvents = this.activeEvents.filter(id => id !== eventId);
    this.completedEvents = this.completedEvents.filter(id => id !== eventId);
  }

  /**
   * 随机选择事件
   */
  selectRandomEvent(type?: EventType): GameEvent | null {
    const events = type ? this.getEventsByType(type) : this.getAllEvents();
    const available = events.filter(e => 
      !this.activeEvents.includes(e.id) && 
      !this.completedEvents.includes(e.id)
    );
    
    if (available.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * available.length);
    return { ...available[randomIndex] };
  }

  /**
   * 序列化事件数据
   */
  serialize(): { activeEvents: string[]; completedEvents: string[] } {
    return {
      activeEvents: [...this.activeEvents],
      completedEvents: [...this.completedEvents],
    };
  }

  /**
   * 反序列化事件数据
   */
  deserialize(data: { activeEvents: string[]; completedEvents: string[] }): void {
    this.activeEvents = [...data.activeEvents];
    this.completedEvents = [...data.completedEvents];
  }
}

/**
 * 创建探索事件（15 个）
 */
export function createExploreEvents(): GameEvent[] {
  return [
    // 资源发现类（5 个）
    {
      id: 'EXPLORE_01',
      type: 'explore',
      title: '废弃超市',
      description: '你发现了一家废弃超市，货架上还有一些物资。超市内部似乎有人活动的痕迹...',
      triggerType: 'random',
      triggerCondition: { probability: 0.15 },
      options: [
        { id: 'opt_1', text: '搜索物资（获得食物×5, 水×3）- 有风险', riskLevel: 'medium' },
        { id: 'opt_2', text: '谨慎搜索（获得食物×2, 水×2）- 无风险', riskLevel: 'none' },
        { id: 'opt_3', text: '离开（无收获，无风险）', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { food: 5, water: 3 },
          message: '你快速搜索了超市，获得了食物×5, 水×3，但惊动了里面的丧尸！',
          triggerBattle: true,
        },
        {
          optionId: 'opt_2',
          resourceChange: { food: 2, water: 2 },
          message: '你小心翼翼地搜索，获得了食物×2, 水×2，安全撤离。',
        },
        {
          optionId: 'opt_3',
          message: '你决定不冒险，离开了超市。',
        },
      ],
    },
    {
      id: 'EXPLORE_02',
      type: 'explore',
      title: '民居搜索',
      description: '这栋居民楼看起来没有被洗劫过，可能还有物资。',
      triggerType: 'random',
      triggerCondition: { probability: 0.15 },
      options: [
        { id: 'opt_1', text: '破门而入（随机获得物资）', riskLevel: 'low' },
        { id: 'opt_2', text: '敲门试探（无风险但获得较少）', riskLevel: 'none' },
        { id: 'opt_3', text: '离开', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { food: 3, water: 2, scrap: 2 },
          message: '你破门而入，找到了一些物资：食物×3, 水×2, 废铁×2。',
        },
        {
          optionId: 'opt_2',
          resourceChange: { food: 1, water: 1 },
          message: '你敲门试探，一个幸存者给了你一些物资：食物×1, 水×1。',
        },
        {
          optionId: 'opt_3',
          message: '你离开了这栋楼。',
        },
      ],
    },
    {
      id: 'EXPLORE_03',
      type: 'explore',
      title: '水源发现',
      description: '你发现了一条小溪，水质看起来还算干净。',
      triggerType: 'random',
      triggerCondition: { probability: 0.1 },
      options: [
        { id: 'opt_1', text: '直接取水（水 +10）', riskLevel: 'low' },
        { id: 'opt_2', text: '安装过滤器（水 +5，持续 3 天）', riskLevel: 'none' },
        { id: 'opt_3', text: '离开', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { water: 10 },
          message: '你装了满满一壶水：水 +10。',
        },
        {
          optionId: 'opt_2',
          resourceChange: { water: 5 },
          message: '你安装了简易过滤器，获得了水×5，接下来 3 天每天可以额外获得水×2。',
        },
        {
          optionId: 'opt_3',
          message: '你离开了小溪。',
        },
      ],
    },
    {
      id: 'EXPLORE_04',
      type: 'explore',
      title: '仓库发现',
      description: '一个上锁的仓库，里面可能有好东西。',
      triggerType: 'random',
      triggerCondition: { probability: 0.08 },
      options: [
        { id: 'opt_1', text: '撬锁（需要工具）', riskLevel: 'medium' },
        { id: 'opt_2', text: '找钥匙（需要探索）', riskLevel: 'none' },
        { id: 'opt_3', text: '放弃', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { ammo: 10, scrap: 5 },
          message: '你撬开了锁，发现了弹药×10, 废铁×5。',
        },
        {
          optionId: 'opt_2',
          message: '你需要先找到钥匙。触发了寻找钥匙的任务。',
        },
        {
          optionId: 'opt_3',
          message: '你放弃了这个仓库。',
        },
      ],
    },
    {
      id: 'EXPLORE_05',
      type: 'explore',
      title: '农田遗迹',
      description: '一片废弃的农田，还有一些残余的作物。',
      triggerType: 'random',
      triggerCondition: { probability: 0.12 },
      options: [
        { id: 'opt_1', text: '采集作物（食物 +8）', riskLevel: 'low' },
        { id: 'opt_2', text: '搜寻种子（获得农场升级材料）', riskLevel: 'none' },
        { id: 'opt_3', text: '离开', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { food: 8 },
          message: '你采集了残余的作物：食物×8。',
        },
        {
          optionId: 'opt_2',
          resourceChange: { wood: 5 },
          message: '你找到了一些种子和工具：木材×5（可用于农场升级）。',
        },
        {
          optionId: 'opt_3',
          message: '你离开了农田。',
        },
      ],
    },
    // 遭遇类（5 个）
    {
      id: 'EXPLORE_06',
      type: 'explore',
      title: '流浪狗',
      description: '一只可怜的流浪狗看着你，似乎在乞求食物。',
      triggerType: 'random',
      triggerCondition: { probability: 0.1 },
      options: [
        { id: 'opt_1', text: '喂养它（消耗食物×2）', riskLevel: 'none' },
        { id: 'opt_2', text: '驱赶它', riskLevel: 'none' },
        { id: 'opt_3', text: '伤害它（获得肉）', riskLevel: 'low' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { food: -2 },
          message: '你喂了狗一些食物。它成为了你的伙伴！',
        },
        {
          optionId: 'opt_2',
          message: '你驱赶了狗，它跑开了。',
        },
        {
          optionId: 'opt_3',
          resourceChange: { food: 3 },
          message: '你获得了肉×3，但心情变得糟糕。',
        },
      ],
    },
    {
      id: 'EXPLORE_07',
      type: 'explore',
      title: '幸存者求助',
      description: '你听到了呼救声，有人被困住了。',
      triggerType: 'random',
      triggerCondition: { probability: 0.1 },
      options: [
        { id: 'opt_1', text: '救援（可能获得同伴）', riskLevel: 'medium' },
        { id: 'opt_2', text: '观察（获取情报）', riskLevel: 'none' },
        { id: 'opt_3', text: '不管', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          message: '你救出了幸存者！他/她决定加入你的避难所。',
        },
        {
          optionId: 'opt_2',
          message: '你观察到附近有丧尸，但幸存者成功逃脱了。你获得了一些情报。',
        },
        {
          optionId: 'opt_3',
          message: '你选择不管，继续前进。',
        },
      ],
    },
    {
      id: 'EXPLORE_08',
      type: 'explore',
      title: '匪徒抢劫',
      description: '一群匪徒拦住了你的去路。',
      triggerType: 'random',
      triggerCondition: { probability: 0.08 },
      options: [
        { id: 'opt_1', text: '战斗', riskLevel: 'high' },
        { id: 'opt_2', text: '交出资源（损失食物×5, 水×5）', riskLevel: 'none' },
        { id: 'opt_3', text: '逃跑', riskLevel: 'medium' },
      ],
      results: [
        {
          optionId: 'opt_1',
          message: '你决定战斗！',
          triggerBattle: true,
          battleId: 'BATTLE_03',
        },
        {
          optionId: 'opt_2',
          resourceChange: { food: -5, water: -5 },
          message: '你交出了资源，匪徒放你走了。',
        },
        {
          optionId: 'opt_3',
          message: '你成功逃脱了！',
        },
      ],
    },
    {
      id: 'EXPLORE_09',
      type: 'explore',
      title: '商人偶遇',
      description: '你遇到了流浪商人汤姆。',
      triggerType: 'random',
      triggerCondition: { probability: 0.05 },
      options: [
        { id: 'opt_1', text: '交易', riskLevel: 'none' },
        { id: 'opt_2', text: '离开', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          message: '汤姆打开了他的货箱...（进入交易界面）',
        },
        {
          optionId: 'opt_2',
          message: '你继续前进。',
        },
      ],
    },
    {
      id: 'EXPLORE_10',
      type: 'explore',
      title: '尸体搜索',
      description: '地上有一具尸体，身上可能有有用的东西。',
      triggerType: 'random',
      triggerCondition: { probability: 0.15 },
      options: [
        { id: 'opt_1', text: '搜索（随机获得）', riskLevel: 'low' },
        { id: 'opt_2', text: '尊重死者（无收获）', riskLevel: 'none' },
        { id: 'opt_3', text: '离开', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { caps: 20, ammo: 5 },
          message: '你搜索了尸体，获得了瓶盖×20, 子弹×5。',
        },
        {
          optionId: 'opt_2',
          message: '你选择尊重死者，继续前进。',
        },
        {
          optionId: 'opt_3',
          message: '你离开了。',
        },
      ],
    },
    // 随机选择类（5 个）
    {
      id: 'EXPLORE_11',
      type: 'explore',
      title: '迷雾区域',
      description: '前方被浓雾笼罩，看不清道路。',
      triggerType: 'random',
      triggerCondition: { probability: 0.08 },
      options: [
        { id: 'opt_1', text: '前进（随机事件）', riskLevel: 'high' },
        { id: 'opt_2', text: '绕路（安全但耗时）', riskLevel: 'none' },
        { id: 'opt_3', text: '等待雾散', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          message: '你走进了迷雾...（触发随机事件）',
        },
        {
          optionId: 'opt_2',
          message: '你绕了远路，安全通过了区域。',
        },
        {
          optionId: 'opt_3',
          message: '你等待雾散，浪费了一些时间。',
        },
      ],
    },
    {
      id: 'EXPLORE_12',
      type: 'explore',
      title: '分岔路口',
      description: '面前有两条路，左边看起来安全，右边可能有危险但也有高回报。',
      triggerType: 'random',
      triggerCondition: { probability: 0.1 },
      options: [
        { id: 'opt_1', text: '走左边（安全）', riskLevel: 'low' },
        { id: 'opt_2', text: '走右边（危险但高回报）', riskLevel: 'high' },
        { id: 'opt_3', text: '返回', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { food: 5, water: 3 },
          message: '左边的路很安全，你找到了一些物资：食物×5, 水×3。',
        },
        {
          optionId: 'opt_2',
          resourceChange: { caps: 100, ammo: 20 },
          message: '右边的路很危险，但你发现了一个军火库：瓶盖×100, 弹药×20！',
          triggerBattle: true,
        },
        {
          optionId: 'opt_3',
          message: '你选择了返回。',
        },
      ],
    },
    {
      id: 'EXPLORE_13',
      type: 'explore',
      title: '建筑坍塌',
      description: '前方的道路被坍塌的建筑堵住了。',
      triggerType: 'random',
      triggerCondition: { probability: 0.08 },
      options: [
        { id: 'opt_1', text: '清理道路（耗时但获得资源）', riskLevel: 'medium' },
        { id: 'opt_2', text: '绕远路（安全）', riskLevel: 'none' },
        { id: 'opt_3', text: '攀爬（高风险）', riskLevel: 'high' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { scrap: 10, wood: 5 },
          message: '你清理了道路，获得了废铁×10, 木材×5。',
        },
        {
          optionId: 'opt_2',
          message: '你绕了远路，安全通过了。',
        },
        {
          optionId: 'opt_3',
          resourceChange: { food: 10 },
          message: '你成功攀爬过去，还发现了一些食物×10！',
        },
      ],
    },
    {
      id: 'EXPLORE_14',
      type: 'explore',
      title: '信号发现',
      description: '你的设备检测到了一个无线电信号。',
      triggerType: 'random',
      triggerCondition: { probability: 0.05 },
      options: [
        { id: 'opt_1', text: '追踪信号', riskLevel: 'medium' },
        { id: 'opt_2', text: '记录位置（后续任务）', riskLevel: 'none' },
        { id: 'opt_3', text: '忽略', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          message: '你开始追踪信号...（触发新任务）',
        },
        {
          optionId: 'opt_2',
          message: '你记录了信号的位置，以后可以再来调查。',
        },
        {
          optionId: 'opt_3',
          message: '你忽略了信号，继续前进。',
        },
      ],
    },
    {
      id: 'EXPLORE_15',
      type: 'explore',
      title: '动物群',
      description: '你遇到了一群野生动物。',
      triggerType: 'random',
      triggerCondition: { probability: 0.08 },
      options: [
        { id: 'opt_1', text: '猎杀（获得食物）', riskLevel: 'medium' },
        { id: 'opt_2', text: '驱赶（安全）', riskLevel: 'none' },
        { id: 'opt_3', text: '观察（获得情报）', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { food: 15 },
          message: '你成功猎杀了一只动物：食物×15。',
        },
        {
          optionId: 'opt_2',
          message: '你驱赶了动物群，安全通过。',
        },
        {
          optionId: 'opt_3',
          message: '你观察了动物群，了解了这片区域的生态。',
        },
      ],
    },
  ];
}

/**
 * 创建战斗事件（8 个）
 */
export function createBattleEvents(): GameEvent[] {
  return [
    {
      id: 'BATTLE_01',
      type: 'combat',
      title: '丧尸犬袭击',
      description: '两只丧尸犬发现了你，它们流着口水冲了过来！',
      triggerType: 'condition',
      triggerCondition: { prerequisites: ['EXPLORE_01'] },
      options: [
        { id: 'opt_1', text: '战斗', riskLevel: 'low' },
        { id: 'opt_2', text: '逃跑', riskLevel: 'medium' },
      ],
      results: [
        { optionId: 'opt_1', message: '战斗开始！', triggerBattle: true },
        { optionId: 'opt_2', message: '你尝试逃跑...' },
      ],
    },
    {
      id: 'BATTLE_02',
      type: 'combat',
      title: '小型尸群',
      description: '三只普通丧尸注意到了你，蹒跚着走来。',
      triggerType: 'random',
      triggerCondition: { probability: 0.2 },
      options: [
        { id: 'opt_1', text: '正面战斗', riskLevel: 'low' },
        { id: 'opt_2', text: '边打边撤', riskLevel: 'low' },
      ],
      results: [
        { optionId: 'opt_1', message: '你准备战斗！', triggerBattle: true },
        { optionId: 'opt_2', message: '你边打边撤，损失了一些资源但安全撤离。', resourceChange: { food: -2 } },
      ],
    },
    {
      id: 'BATTLE_03',
      type: 'combat',
      title: '埋伏',
      description: '你遭到了匪徒和丧尸的联合埋伏！',
      triggerType: 'condition',
      triggerCondition: { prerequisites: ['EXPLORE_08'] },
      options: [
        { id: 'opt_1', text: '应战', riskLevel: 'medium' },
        { id: 'opt_2', text: '寻找掩体', riskLevel: 'low' },
      ],
      results: [
        { optionId: 'opt_1', message: '战斗开始！', triggerBattle: true },
        { optionId: 'opt_2', message: '你找到了掩体，减少了受到的伤害。', attributeChange: { defense: 5 } },
      ],
    },
    {
      id: 'BATTLE_04',
      type: 'combat',
      title: '丧尸围攻',
      description: '五只普通丧尸和一只敏捷型丧尸包围了你！',
      triggerType: 'random',
      triggerCondition: { probability: 0.08 },
      options: [
        { id: 'opt_1', text: '突围', riskLevel: 'high' },
        { id: 'opt_2', text: '逐个击破', riskLevel: 'medium' },
      ],
      results: [
        { optionId: 'opt_1', message: '你尝试突围！', triggerBattle: true },
        { optionId: 'opt_2', message: '你决定逐个击破敌人。', triggerBattle: true },
      ],
    },
    {
      id: 'BATTLE_05',
      type: 'combat',
      title: '突袭',
      description: '四名武装匪徒突然出现在你面前。',
      triggerType: 'random',
      triggerCondition: { probability: 0.06 },
      options: [
        { id: 'opt_1', text: '先发制人', riskLevel: 'medium' },
        { id: 'opt_2', text: '谈判', riskLevel: 'low' },
      ],
      results: [
        { optionId: 'opt_1', message: '你先发制人发起攻击！', triggerBattle: true },
        { optionId: 'opt_2', message: '你尝试谈判，但匪徒只想抢劫。', triggerBattle: true },
      ],
    },
    {
      id: 'BATTLE_06',
      type: 'combat',
      title: '变异体',
      description: '一只巨大的变异丧尸挡住了你的去路！',
      triggerType: 'random',
      triggerCondition: { probability: 0.03 },
      options: [
        { id: 'opt_1', text: '挑战', riskLevel: 'high' },
        { id: 'opt_2', text: '避开', riskLevel: 'medium' },
      ],
      results: [
        { optionId: 'opt_1', message: '你决定挑战变异体！', triggerBattle: true },
        { optionId: 'opt_2', message: '你小心翼翼地绕开了变异体。', resourceChange: { stamina: -10 } },
      ],
    },
    {
      id: 'BATTLE_07',
      type: 'combat',
      title: '巢穴入口',
      description: '你来到了丧尸巢穴的入口，这里有很多敌人。',
      triggerType: 'condition',
      triggerCondition: { prerequisites: ['SIDE_10'] },
      options: [
        { id: 'opt_1', text: '强攻', riskLevel: 'high' },
        { id: 'opt_2', text: '潜行', riskLevel: 'medium' },
      ],
      results: [
        { optionId: 'opt_1', message: '你决定强攻巢穴！', triggerBattle: true },
        { optionId: 'opt_2', message: '你尝试潜行进入...' },
      ],
    },
    {
      id: 'BATTLE_08',
      type: 'combat',
      title: 'Boss 战：丧尸首领',
      description: '丧尸首领带着三名护卫出现在你面前！',
      triggerType: 'condition',
      triggerCondition: { day: 30 },
      options: [
        { id: 'opt_1', text: '决战', riskLevel: 'high' },
        { id: 'opt_2', text: '撤退（任务失败）', riskLevel: 'none' },
      ],
      results: [
        { optionId: 'opt_1', message: '最终决战开始！', triggerBattle: true },
        { optionId: 'opt_2', message: '你选择了撤退，任务失败。' },
      ],
    },
  ];
}

/**
 * 创建随机事件（7 个）
 */
export function createRandomEvents(): GameEvent[] {
  return [
    {
      id: 'RANDOM_01',
      type: 'random',
      title: '暴风雨',
      description: '突如其来的暴风雨让你无法外出探索。',
      triggerType: 'random',
      triggerCondition: { probability: 0.1 },
      options: [
        { id: 'opt_1', text: '在避难所休息', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          message: '你在避难所休息了一天，资源消耗增加。',
          resourceChange: { food: -5, water: -3 },
        },
      ],
    },
    {
      id: 'RANDOM_02',
      type: 'random',
      title: '物资空投',
      description: '一架飞机飞过，空投了一些物资！',
      triggerType: 'random',
      triggerCondition: { probability: 0.05 },
      options: [
        { id: 'opt_1', text: '收集物资', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { food: 20, water: 15, medicine: 5 },
          message: '你收集了空投物资：食物×20, 水×15, 药品×5！',
        },
      ],
    },
    {
      id: 'RANDOM_03',
      type: 'random',
      title: '幸存者投奔',
      description: '一名幸存者听说了你的避难所，前来投奔。',
      triggerType: 'random',
      triggerCondition: { probability: 0.08 },
      options: [
        { id: 'opt_1', text: '接纳', riskLevel: 'none' },
        { id: 'opt_2', text: '拒绝', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          message: '新幸存者加入了你的避难所！',
        },
        {
          optionId: 'opt_2',
          message: '你拒绝了幸存者，他失望地离开了。',
        },
      ],
    },
    {
      id: 'RANDOM_04',
      type: 'random',
      title: '疾病爆发',
      description: '避难所内爆发了疾病，需要药品治疗。',
      triggerType: 'random',
      triggerCondition: { probability: 0.05 },
      options: [
        { id: 'opt_1', text: '使用药品（消耗药品×3）', riskLevel: 'none' },
        { id: 'opt_2', text: '自然恢复（耗时）', riskLevel: 'low' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { medicine: -3 },
          message: '你使用了药品，疾病得到了控制。',
        },
        {
          optionId: 'opt_2',
          message: '你选择自然恢复，浪费了几天时间。',
        },
      ],
    },
    {
      id: 'RANDOM_05',
      type: 'random',
      title: '交易车队',
      description: '一个大型交易车队经过这里，提供特殊商品。',
      triggerType: 'random',
      triggerCondition: { probability: 0.05 },
      options: [
        { id: 'opt_1', text: '交易', riskLevel: 'none' },
        { id: 'opt_2', text: '离开', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          message: '你进入了交易界面。',
        },
        {
          optionId: 'opt_2',
          message: '你继续前进。',
        },
      ],
    },
    {
      id: 'RANDOM_06',
      type: 'random',
      title: '地震',
      description: '突然发生的地震对避难所造成了损害。',
      triggerType: 'random',
      triggerCondition: { probability: 0.03 },
      options: [
        { id: 'opt_1', text: '修复（消耗木材×5, 废铁×5）', riskLevel: 'none' },
        { id: 'opt_2', text: '暂时不管', riskLevel: 'medium' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { wood: -5, scrap: -5 },
          message: '你修复了避难所的损伤。',
        },
        {
          optionId: 'opt_2',
          message: '你暂时不管，但防御力下降了。',
          attributeChange: { defense: -5 },
        },
      ],
    },
    {
      id: 'RANDOM_07',
      type: 'random',
      title: '好消息',
      description: '今天是个好日子，你发现了一些额外资源。',
      triggerType: 'random',
      triggerCondition: { probability: 0.15 },
      options: [
        { id: 'opt_1', text: '收集', riskLevel: 'none' },
      ],
      results: [
        {
          optionId: 'opt_1',
          resourceChange: { caps: 50, exp: 50 },
          message: '你获得了瓶盖×50, 经验×50！',
        },
      ],
    },
  ];
}

export default EventSystem;
