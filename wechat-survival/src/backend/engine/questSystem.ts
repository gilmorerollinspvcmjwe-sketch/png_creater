/**
 * 任务系统 - 管理任务的接受、完成和奖励发放
 */

import { Quest, QuestType, QuestStatus, QuestObjective, QuestReward, ResourceType, GameState } from './types';
import { ResourceSystem } from './resourceSystem';
import { PlayerSystem } from './playerSystem';

/**
 * 任务系统类
 */
export class QuestSystem {
  private quests: Quest[] = [];
  private resourceSystem: ResourceSystem;
  private playerSystem: PlayerSystem;

  constructor(resourceSystem: ResourceSystem, playerSystem: PlayerSystem) {
    this.resourceSystem = resourceSystem;
    this.playerSystem = playerSystem;
  }

  /**
   * 加载任务数据
   */
  loadQuests(questData: Quest[]): void {
    this.quests = questData.map(q => ({ ...q }));
  }

  /**
   * 获取所有任务
   */
  getQuests(): Quest[] {
    return this.quests.map(q => ({ ...q }));
  }

  /**
   * 获取特定类型的任务
   */
  getQuestsByType(type: QuestType): Quest[] {
    return this.quests.filter(q => q.type === type);
  }

  /**
   * 获取特定状态的任务
   */
  getQuestsByStatus(status: QuestStatus): Quest[] {
    return this.quests.filter(q => q.status === status);
  }

  /**
   * 获取任务 by ID
   */
  getQuest(questId: string): Quest | undefined {
    return this.quests.find(q => q.id === questId);
  }

  /**
   * 检查任务是否可接受
   */
  canAcceptQuest(questId: string): { canAccept: boolean; reason?: string } {
    const quest = this.quests.find(q => q.id === questId);
    
    if (!quest) {
      return { canAccept: false, reason: '任务不存在' };
    }
    
    if (quest.status !== 'available') {
      return { canAccept: false, reason: '任务状态不可接受' };
    }
    
    // 检查前置任务
    if (quest.prerequisites) {
      for (const prereqId of quest.prerequisites) {
        const prereq = this.quests.find(q => q.id === prereqId);
        if (!prereq || prereq.status !== 'completed') {
          return { canAccept: false, reason: `需要完成任务：${prereq?.title || prereqId}` };
        }
      }
    }
    
    return { canAccept: true };
  }

  /**
   * 接受任务
   */
  acceptQuest(questId: string): { success: boolean; message: string } {
    const { canAccept, reason } = this.canAcceptQuest(questId);
    
    if (!canAccept) {
      return { success: false, message: reason! };
    }
    
    const quest = this.quests.find(q => q.id === questId);
    if (quest) {
      quest.status = 'accepted';
      return { success: true, message: `已接受任务：${quest.title}` };
    }
    
    return { success: false, message: '任务不存在' };
  }

  /**
   * 更新任务进度
   */
  updateQuestProgress(questId: string, objectiveType: QuestObjective['type'], target: string, amount: number): void {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest || quest.status !== 'accepted') return;
    
    for (const objective of quest.objectives) {
      if (objective.type === objectiveType && objective.target === target && !objective.isCompleted) {
        objective.current += amount;
        
        if (objective.current >= objective.required) {
          objective.current = objective.required;
          objective.isCompleted = true;
        }
      }
    }
    
    // 检查任务是否完成
    this.checkQuestCompletion(quest);
  }

  /**
   * 检查任务完成
   */
  private checkQuestCompletion(quest: Quest): void {
    const allCompleted = quest.objectives.every(obj => obj.isCompleted);
    
    if (allCompleted) {
      quest.status = 'completed';
    }
  }

  /**
   * 领取任务奖励
   */
  claimQuestReward(questId: string): { success: boolean; message: string; rewards?: QuestReward[] } {
    const quest = this.quests.find(q => q.id === questId);
    
    if (!quest) {
      return { success: false, message: '任务不存在' };
    }
    
    if (quest.status !== 'completed') {
      return { success: false, message: '任务未完成' };
    }
    
    // 发放奖励
    quest.rewards.forEach(reward => {
      this.giveReward(reward);
    });
    
    return { success: true, message: `领取了任务奖励：${quest.title}`, rewards: quest.rewards };
  }

  /**
   * 发放单个奖励
   */
  private giveReward(reward: QuestReward): void {
    switch (reward.type) {
      case 'resource':
        if (reward.resourceType && reward.amount) {
          this.resourceSystem.addResource(reward.resourceType, reward.amount);
        }
        break;
        
      case 'exp':
        if (reward.amount) {
          this.playerSystem.addExp(reward.amount);
        }
        break;
        
      case 'unlock':
        // 解锁功能（由游戏主系统处理）
        break;
        
      case 'item':
        // 发放物品（由物品系统处理）
        break;
    }
  }

  /**
   * 获取任务进度文本
   */
  getQuestProgressText(questId: string): string {
    const quest = this.quests.find(q => q.id === questId);
    
    if (!quest) {
      return '任务不存在';
    }
    
    const completed = quest.objectives.filter(obj => obj.isCompleted).length;
    const total = quest.objectives.length;
    
    return `${completed}/${total}`;
  }

  /**
   * 获取任务详情
   */
  getQuestDetail(questId: string): Quest | null {
    const quest = this.quests.find(q => q.id === questId);
    return quest ? { ...quest } : null;
  }

  /**
   * 重置任务（用于日常任务）
   */
  resetDailyQuests(): void {
    const dailyQuests = this.quests.filter(q => q.type === 'daily');
    
    dailyQuests.forEach(quest => {
      quest.status = 'available';
      quest.objectives.forEach(obj => {
        obj.current = 0;
        obj.isCompleted = false;
      });
    });
  }

  /**
   * 添加任务
   */
  addQuest(quest: Quest): void {
    this.quests.push({ ...quest });
  }

  /**
   * 移除任务
   */
  removeQuest(questId: string): boolean {
    const index = this.quests.findIndex(q => q.id === questId);
    
    if (index !== -1) {
      this.quests.splice(index, 1);
      return true;
    }
    
    return false;
  }

  /**
   * 序列化任务数据
   */
  serialize(): Quest[] {
    return this.quests.map(q => ({ ...q }));
  }

  /**
   * 反序列化任务数据
   */
  deserialize(data: Quest[]): void {
    this.quests = data.map(q => ({ ...q }));
  }
}

/**
 * 创建主线任务
 */
export function createMainQuests(): Quest[] {
  return [
    {
      id: 'MAIN_01',
      type: 'main',
      title: '第一天：基础生存',
      description: '末世爆发已经 30 天了，你的避难所刚刚建立，物资极度匮乏。今天是你作为避难所管理者的第一天，你需要收集足够的生存物资。',
      objectives: [
        {
          id: 'obj_1',
          description: '收集食物',
          type: 'collect',
          target: 'food',
          current: 0,
          required: 10,
          isCompleted: false,
        },
        {
          id: 'obj_2',
          description: '收集水',
          type: 'collect',
          target: 'water',
          current: 0,
          required: 10,
          isCompleted: false,
        },
      ],
      rewards: [
        {
          type: 'exp',
          amount: 100,
          description: '100 经验值',
        },
        {
          type: 'unlock',
          unlockId: 'shelter_build',
          description: '解锁避难所建设功能',
        },
      ],
      difficulty: 1,
      status: 'available',
      prerequisites: [],
    },
    {
      id: 'MAIN_02',
      type: 'main',
      title: '第三天：清理周边',
      description: '避难所周边的丧尸越来越多，已经开始威胁到你们的安全。是时候主动出击，清除这些威胁了。',
      objectives: [
        {
          id: 'obj_1',
          description: '击杀普通丧尸',
          type: 'kill',
          target: 'zombie',
          current: 0,
          required: 5,
          isCompleted: false,
        },
      ],
      rewards: [
        {
          type: 'exp',
          amount: 200,
          description: '200 经验值',
        },
        {
          type: 'item',
          itemId: 'iron_knife',
          description: '获得铁刀×1',
        },
      ],
      difficulty: 2,
      status: 'available',
      prerequisites: ['MAIN_01'],
    },
    {
      id: 'MAIN_03',
      type: 'main',
      title: '第五天：寻找幸存者',
      description: '在废土上还有其他幸存者，找到他们并招募到你的避难所，可以增强你们的生存能力。',
      objectives: [
        {
          id: 'obj_1',
          description: '招募幸存者',
          type: 'talk',
          target: 'survivor',
          current: 0,
          required: 1,
          isCompleted: false,
        },
      ],
      rewards: [
        {
          type: 'exp',
          amount: 300,
          description: '300 经验值',
        },
        {
          type: 'unlock',
          unlockId: 'npc_system',
          description: '开启幸存者系统',
        },
      ],
      difficulty: 3,
      status: 'available',
      prerequisites: ['MAIN_02'],
    },
    {
      id: 'MAIN_04',
      type: 'main',
      title: '第十天：医疗设施',
      description: '随着幸存者增加，医疗需求也越来越大。建设医疗室可以治疗伤员并生产药品。',
      objectives: [
        {
          id: 'obj_1',
          description: '建设医疗室',
          type: 'build',
          target: 'medical',
          current: 0,
          required: 1,
          isCompleted: false,
        },
      ],
      rewards: [
        {
          type: 'exp',
          amount: 500,
          description: '500 经验值',
        },
        {
          type: 'resource',
          resourceType: 'medicine',
          amount: 10,
          description: '药品产出 +1/天',
        },
      ],
      difficulty: 5,
      status: 'available',
      prerequisites: ['MAIN_03'],
    },
    {
      id: 'MAIN_05',
      type: 'main',
      title: '第三十天：解药线索',
      description: '经过一个月的生存，你终于找到了关于病毒解药的重要线索。这可能是结束末世的关键。',
      objectives: [
        {
          id: 'obj_1',
          description: '探索医院',
          type: 'explore',
          target: 'hospital',
          current: 0,
          required: 1,
          isCompleted: false,
        },
        {
          id: 'obj_2',
          description: '找到解药线索',
          type: 'collect',
          target: 'cure_clue',
          current: 0,
          required: 1,
          isCompleted: false,
        },
      ],
      rewards: [
        {
          type: 'exp',
          amount: 2000,
          description: '2000 经验值',
        },
        {
          type: 'unlock',
          unlockId: 'ending_1',
          description: '通关结局',
        },
      ],
      difficulty: 10,
      status: 'available',
      prerequisites: ['MAIN_04'],
    },
  ];
}

/**
 * 创建支线任务
 */
export function createSideQuests(): Quest[] {
  const quests: Quest[] = [];
  
  // 资源收集类（5 个）
  quests.push(
    {
      id: 'SIDE_01',
      type: 'side',
      title: '寻找干净水源',
      description: '干净的水源在末世非常珍贵，收集足够的水可以确保避难所的生存。',
      objectives: [{
        id: 'obj_1',
        description: '收集水',
        type: 'collect',
        target: 'water',
        current: 0,
        required: 30,
        isCompleted: false,
      }],
      rewards: [{
        type: 'item',
        itemId: 'water_purifier',
        description: '获得净水器图纸',
      }],
      difficulty: 2,
      status: 'available',
    },
    {
      id: 'SIDE_02',
      type: 'side',
      title: '囤积粮食',
      description: '粮食是生存的基础，尽可能多地收集食物。',
      objectives: [{
        id: 'obj_1',
        description: '收集食物',
        type: 'collect',
        target: 'food',
        current: 0,
        required: 50,
        isCompleted: false,
      }],
      rewards: [{
        type: 'resource',
        resourceType: 'caps',
        amount: 500,
        description: '获得 500 瓶盖',
      }],
      difficulty: 3,
      status: 'available',
    },
    {
      id: 'SIDE_03',
      type: 'side',
      title: '收集废铁',
      description: '废铁可以用来强化装备和建设设施。',
      objectives: [{
        id: 'obj_1',
        description: '收集废铁',
        type: 'collect',
        target: 'scrap',
        current: 0,
        required: 20,
        isCompleted: false,
      }],
      rewards: [{
        type: 'unlock',
        unlockId: 'equipment_upgrade',
        description: '开启装备强化',
      }],
      difficulty: 3,
      status: 'available',
    },
    {
      id: 'SIDE_04',
      type: 'side',
      title: '寻找发电机',
      description: '电力可以让避难所更加舒适和安全。',
      objectives: [{
        id: 'obj_1',
        description: '找到发电机',
        type: 'collect',
        target: 'generator',
        current: 0,
        required: 1,
        isCompleted: false,
      }],
      rewards: [{
        type: 'unlock',
        unlockId: 'power_upgrade',
        description: '电力等级 +1',
      }],
      difficulty: 4,
      status: 'available',
    },
    {
      id: 'SIDE_05',
      type: 'side',
      title: '药品储备',
      description: '在末世，药品比黄金更珍贵。',
      objectives: [{
        id: 'obj_1',
        description: '收集药品',
        type: 'collect',
        target: 'medicine',
        current: 0,
        required: 10,
        isCompleted: false,
      }],
      rewards: [{
        type: 'item',
        itemId: 'first_aid_kit',
        description: '获得急救箱×1',
      }],
      difficulty: 4,
      status: 'available',
    },
  );
  
  // 战斗挑战类（5 个）
  quests.push(
    {
      id: 'SIDE_06',
      type: 'side',
      title: '清除变异体',
      description: '变异体比普通丧尸更危险，但也更有价值。',
      objectives: [{
        id: 'obj_1',
        description: '击杀变异丧尸',
        type: 'kill',
        target: 'mutant',
        current: 0,
        required: 1,
        isCompleted: false,
      }],
      rewards: [{
        type: 'item',
        itemId: 'railgun_blueprint',
        description: '获得电磁枪图纸',
      }],
      difficulty: 6,
      status: 'available',
      prerequisites: ['MAIN_02'],
    },
    {
      id: 'SIDE_07',
      type: 'side',
      title: '守卫避难所',
      description: '抵御丧尸潮的进攻，保护你的避难所。',
      objectives: [{
        id: 'obj_1',
        description: '抵御攻击波次',
        type: 'survive',
        target: 'wave',
        current: 0,
        required: 3,
        isCompleted: false,
      }],
      rewards: [{
        type: 'unlock',
        unlockId: 'defense_upgrade',
        description: '防御等级 +1',
      }],
      difficulty: 5,
      status: 'available',
    },
    {
      id: 'SIDE_08',
      type: 'side',
      title: '突袭匪帮',
      description: '主动出击，清除附近的匪徒据点。',
      objectives: [{
        id: 'obj_1',
        description: '击杀匪徒',
        type: 'kill',
        target: 'raider',
        current: 0,
        required: 10,
        isCompleted: false,
      }],
      rewards: [{
        type: 'item',
        itemId: 'power_armor_blueprint',
        description: '获得动力装甲图纸',
      }],
      difficulty: 7,
      status: 'available',
    },
    {
      id: 'SIDE_09',
      type: 'side',
      title: '猎杀时刻',
      description: '证明你是废土上最强的猎手。',
      objectives: [{
        id: 'obj_1',
        description: '击杀丧尸',
        type: 'kill',
        target: 'zombie',
        current: 0,
        required: 30,
        isCompleted: false,
      }],
      rewards: [{
        type: 'unlock',
        unlockId: 'hunter_title',
        description: '获得猎杀者称号',
      }],
      difficulty: 5,
      status: 'available',
    },
    {
      id: 'SIDE_10',
      type: 'side',
      title: '巢穴探索',
      description: '深入丧尸巢穴，找到有价值的东西。',
      objectives: [{
        id: 'obj_1',
        description: '探索丧尸巢穴并生还',
        type: 'explore',
        target: 'nest',
        current: 0,
        required: 1,
        isCompleted: false,
      }],
      rewards: [{
        type: 'item',
        itemId: 'nest_map',
        description: '获得巢穴地图',
      }],
      difficulty: 8,
      status: 'available',
    },
  );
  
  // 探索发现类（3 个）
  quests.push(
    {
      id: 'SIDE_11',
      type: 'side',
      title: '废弃工厂',
      description: '城市边缘有一座废弃工厂，可能藏有物资。',
      objectives: [{
        id: 'obj_1',
        description: '探索废弃工厂',
        type: 'explore',
        target: 'factory',
        current: 0,
        required: 1,
        isCompleted: false,
      }],
      rewards: [{
        type: 'unlock',
        unlockId: 'area_factory',
        description: '解锁新区域：废弃工厂',
      }],
      difficulty: 4,
      status: 'available',
    },
    {
      id: 'SIDE_12',
      type: 'side',
      title: '城市废墟',
      description: '市中心是一片废墟，危险但可能有大发现。',
      objectives: [{
        id: 'obj_1',
        description: '探索城市废墟',
        type: 'explore',
        target: 'city_ruins',
        current: 0,
        required: 1,
        isCompleted: false,
      }],
      rewards: [{
        type: 'unlock',
        unlockId: 'area_city',
        description: '解锁新区域：城市废墟',
      }],
      difficulty: 6,
      status: 'available',
    },
    {
      id: 'SIDE_13',
      type: 'side',
      title: '医院秘密',
      description: '市立医院可能藏有关于病毒的重要信息。',
      objectives: [{
        id: 'obj_1',
        description: '探索医院',
        type: 'explore',
        target: 'hospital',
        current: 0,
        required: 1,
        isCompleted: false,
      }],
      rewards: [{
        type: 'item',
        itemId: 'cure_clue',
        description: '获得解药线索×1',
      }],
      difficulty: 7,
      status: 'available',
    },
  );
  
  // NPC 关系类（2 个）
  quests.push(
    {
      id: 'SIDE_14',
      type: 'side',
      title: '医生好感',
      description: '与老医生建立良好关系，可以获得更好的医疗服务。',
      objectives: [{
        id: 'obj_1',
        description: '与老医生对话',
        type: 'talk',
        target: 'npc_doctor',
        current: 0,
        required: 5,
        isCompleted: false,
      }],
      rewards: [{
        type: 'unlock',
        unlockId: 'doctor_treatment',
        description: '获得专属治疗',
      }],
      difficulty: 2,
      status: 'available',
    },
    {
      id: 'SIDE_15',
      type: 'side',
      title: '商人信任',
      description: '经常与流浪商人交易，可以获得特殊商品。',
      objectives: [{
        id: 'obj_1',
        description: '与流浪商人交易',
        type: 'talk',
        target: 'npc_merchant',
        current: 0,
        required: 10,
        isCompleted: false,
      }],
      rewards: [{
        type: 'unlock',
        unlockId: 'mystery_goods',
        description: '解锁神秘商品',
      }],
      difficulty: 3,
      status: 'available',
    },
  );
  
  return quests;
}

export default QuestSystem;
