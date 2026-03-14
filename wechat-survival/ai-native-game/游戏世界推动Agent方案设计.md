# 游戏世界推动 Agent 方案设计文档

## 1. 概述

### 1.1 设计目标

游戏世界推动 Agent（World Director Agent）是 AI 原生游戏引擎的核心组件，负责模拟游戏世界的"自主意志"——让游戏世界像一个有生命的有机系统一样动态演进，而不是依赖静态脚本和预设事件。本方案旨在设计一个能够自主决策的 AI Agent，使其具备"DM（地下城主）+ 导演 + 世界模拟器"的三重角色。

### 1.2 核心职责

| 职责领域 | 具体内容 | 优先级 |
|----------|----------|--------|
| 事件调度 | 何时触发随机事件、世界事件、突发事件 | 高 |
| NPC 行为 | 不在玩家视野时 NPC 的自主行动 | 高 |
| 世界演化 | 派系关系变化、资源分布、局势演变 | 高 |
| 节奏控制 | 紧张/放松节奏、高潮/低谷安排 | 中 |
| 叙事推进 | 主线剧情推进时机、支线触发条件 | 中 |

### 1.3 与现有 AI 游戏方案的关系

本文档是《AI 原生游戏方案设计文档》的核心扩展。在现有方案中，Agent 主要负责被动响应玩家请求（生成任务、NPC 对话、物品等），而 World Director Agent 则承担起"主动推动游戏世界"的职责，使游戏从"玩家驱动"进化为"世界驱动 + 玩家驱动"的双核模式。

---

## 2. 架构设计

### 2.1 整体架构图

`
┌─────────────────────────────────────────────────────────────────────────┐
│                        游戏世界推动 Agent (World Director)              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   事件调度器     │  │   NPC 调度器     │  │   世界状态机    │        │
│  │  Event          │  │  NPC            │  │  World          │        │
│  │  Scheduler      │  │  Scheduler      │  │  State Machine │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   节奏控制器     │  │   叙事导演      │  │   记忆管理      │        │
│  │  Pacing         │  │  Narrative      │  │  Memory         │        │
│  │  Controller     │  │  Director       │  │  Manager        │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
├─────────────────────────────────────────────────────────────────────────┤
│                              决策引擎                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   效用计算器    │  │   行为树引擎    │  │   LLM 决策器    │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          子 Agent 集群                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   事件 Agent    │  │   NPC Agent     │  │   叙事 Agent    │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         OpenClaw 基础设施                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   定时任务      │  │   多 Agent 协作 │  │   记忆系统      │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
`

### 2.2 模块职责说明

#### 2.2.1 事件调度器（Event Scheduler）

事件调度器是 World Director 的"脉冲器"，负责监测和触发各类游戏事件。

**核心功能：**

- **触发条件检测**：时间触发器、玩家行为触发器、世界状态触发器、随机触发器、事件链触发器、位置触发器
- **事件优先级管理**：根据世界状态和玩家状态动态调整事件优先级
- **冲突检测**：避免同时触发互斥或冲突的事件
- **事件冷却管理**：防止同一类型事件频繁触发

#### 2.2.2 NPC 调度器（NPC Scheduler）

NPC 调度器负责管理所有 NPC 的自主行为，使游戏世界在玩家不关注的地方依然充满活力。

**核心功能：**

- **行为生成**：根据 NPC 性格、状态和环境生成自主行为
- **日程管理**：维护 NPC 的日常作息和活动规律
- **目标驱动**：支持 NPC 追求长期目标
- **交互管理**：处理 NPC 与玩家、NPC 与 NPC 之间的交互

#### 2.2.3 世界状态机（World State Machine）

世界状态机是游戏世界的"心跳"，追踪并管理整个游戏世界的宏观状态。

**核心功能：**

- **状态追踪**：时代、威胁等级、资源丰富度、派系平衡、天气、时间
- **状态转换**：管理状态之间的转换逻辑和触发条件
- **历史记录**：保存世界状态演变历史
- **事件池管理**：根据当前状态提供可用事件列表

#### 2.2.4 节奏控制器（Pacing Controller）

节奏控制器是游戏的"指挥家"，负责调控游戏体验的节奏。

**核心功能：**

- **节奏分析**：平静期、构建期、紧张期、高潮期、解决期
- **紧张度管理**：动态调整世界的"紧张度"指标
- **高潮安排**：策划和触发重大事件
- **多样化保证**：确保事件类型的多样性

#### 2.2.5 叙事导演（Narrative Director）

叙事导演负责游戏的叙事 flow，确保主线剧情和支线故事有机融合。

**核心功能：**

- **剧情追踪**：维护主线和支线剧情的进度状态
- **推进决策**：决定何时推进主线剧情、触发支线任务
- **叙事生成**：生成叙事文本、事件描述、对话内容
- **伏笔管理**：埋设和回收剧情伏笔

#### 2.2.6 记忆管理（Memory Manager）

记忆管理系统为 World Director 提供"记忆力"，实现游戏的连贯性。

**核心功能：**

- **短期记忆**：保存最近的游戏事件和决策（内存级别）
- **中期记忆**：保存会话期间的重要信息（Redis 级别）
- **长期记忆**：保存需要永久保留的世界历史（数据库级别）
- **遗忘机制**：自动清理不重要的记忆

---

## 3. 核心模块详细设计

### 3.1 事件调度器

`	ypescript
// 事件调度器接口
interface IEventScheduler {
  checkTriggers(): Promise<GameEvent[]>;
  generateEvent(context: WorldContext): Promise<GameEvent>;
  scheduleEvent(event: GameEvent, priority: number): void;
  checkConflict(event: GameEvent): boolean;
  getAvailableEvents(): GameEvent[];
  updateCooldowns(): void;
}

// 触发条件类型
type TriggerCondition = 
  | { type: 'time_based'; cron?: string; interval?: number }
  | { type: 'player_action'; action: PlayerActionType }
  | { type: 'world_state'; condition: WorldStateCondition }
  | { type: 'random'; probability: number }
  | { type: 'chain'; previousEventId: string }
  | { type: 'proximity'; location: Location; radius: number };

// 游戏事件
interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: GameEventType;
  severity: number;
  triggers: TriggerCondition[];
  choices: EventChoice[];
  effects: EventEffect[];
  cooldown?: number;
  exclusiveWith?: string[];
  location?: Location;
  duration?: number;
  priority?: number;
}
`

### 3.2 NPC 调度器

`	ypescript
interface INPCScheduler {
  generateAutonomousAction(npc: NPC, context: WorldContext): Promise<NPCAction>;
  getDailySchedule(npc: NPC, date: string): NPCSchedule[];
  pursueGoal(npc: NPC, goal: NPCGoal): Promise<NPCAction[]>;
  handleInteraction(npc: NPC, target: Player | NPC): Promise<Dialogue>;
  tickAllNPCs(context: WorldContext): Promise<NPCStateUpdate[]>;
}

type NPCActionType = 
  | 'patrol' | 'work' | 'rest' | 'socialize' | 'trade' 
  | 'fight' | 'flee' | 'sleep' | 'eat' | 'travel' | 'quest' | 'special';

interface NPCAction {
  id: string;
  npcId: string;
  type: NPCActionType;
  target?: string;
  location?: Location;
  duration: number;
  description: string;
  priority: number;
}

interface NPCState {
  npcId: string;
  currentAction: NPCAction | null;
  location: Location;
  health: number;
  mood: 'happy' | 'neutral' | 'sad' | 'angry' | 'fearful';
  energy: number;
  socialNeeds: number;
}
`

### 3.3 世界状态机

`	ypescript
interface IWorldStateMachine {
  getCurrentState(): WorldState;
  transition(newState: Partial<WorldState>, trigger: string): void;
  getHistory(limit?: number): WorldStateHistory[];
  getAvailableEvents(): GameEvent[];
  evolve(context: WorldContext): Promise<WorldStateDelta>;
}

interface WorldState {
  era: 'early' | 'mid' | 'late' | 'end';
  threatLevel: number;
  resourceAbundance: number;
  factionBalance: Record<string, number>;
  weather: WeatherType;
  timeOfDay: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  eventCounts: Record<GameEventType, number>;
  economyLevel: number;
  stability: number;
}
`

---

## 4. 决策机制设计

### 4.1 基于效用的决策

`	ypescript
function calculateUtility(action: Action, context: Context): number {
  let score = 0;
  
  // 叙事价值（是否推动剧情）
  score += narrativeValue(action) * 0.3;
  
  // 玩家体验（是否有趣）
  score += playerExperience(action) * 0.3;
  
  // 世界一致性（是否符合设定）
  score += worldConsistency(action) * 0.2;
  
  // 多样性（避免重复）
  score += diversity(action) * 0.1;
  
  // 资源成本（LLM 调用成本）
  score -= cost(action) * 0.1;
  
  return score;
}

function selectBestAction(actions: Action[]): Action {
  return actions.reduce((best, current) => 
    calculateUtility(current) > calculateUtility(best) ? current : best
  );
}
`

### 4.2 基于行为树的决策

`	ypescript
// 行为树节点类型
type BehaviorNode = 
  | Selector      // 选择一个子节点执行
  | Sequence      // 按顺序执行所有子节点
  | Parallel      // 并行执行所有子节点
  | Condition     // 条件检查
  | Action;       // 执行行动

// 示例：事件生成行为树
const eventGenerationTree = Selector([
  Sequence([
    Condition('isClimaxTime'),
    Action('generateClimaxEvent')
  ]),
  Sequence([
    Condition('hasPendingQuest'),
    Action('generateQuestRelatedEvent')
  ]),
  Sequence([
    Condition('playerIdleTooLong'),
    Action('generateMotivationEvent')
  ]),
  Action('generateRandomEvent')  // 默认
]);
`

### 4.3 基于 LLM 的决策

`	ypescript
const worldDirectorPrompt = 
你是一名游戏世界导演，负责决定接下来发生什么事件。

【当前世界状态】


【玩家状态】


【最近事件历史】


【决策要求】
1. 分析当前游戏节奏（紧张/放松）
2. 决定下一个事件类型
3. 说明决策理由
4. 生成事件参数

【输出格式】
{
  "analysis": "当前节奏分析",
  "decision": "事件类型",
  "reason": "决策理由",
  "parameters": {...}
}
;
`

---

## 5. 与 OpenClaw 集成

### 5.1 使用 OpenClaw 定时任务

`	ypescript
// 定时推动世界演化
cron.schedule('*/5 * * * *', async () => {
  await worldDirector.tick();
});

// 每日事件刷新
cron.schedule('0 0 * * *', async () => {
  await dailyQuestGenerator.refresh();
});

// 每周世界事件
cron.schedule('0 0 * * 1', async () => {
  await worldEventGenerator.generateWeekly();
});
`

### 5.2 使用 OpenClaw 多 Agent 协作

`	ypescript
// World Director 作为主 Agent
const worldDirector = new Agent({
  name: 'World Director',
  role: '统筹游戏世界演化'
});

// 专用子 Agent
const eventAgent = new Agent({
  name: 'Event Agent',
  role: '生成游戏事件'
});

const npcAgent = new Agent({
  name: 'NPC Agent',
  role: '管理 NPC 行为'
});

const narrativeAgent = new Agent({
  name: 'Narrative Agent',
  role: '生成叙事文本'
});

// 协作流程
worldDirector.decideNextAction().then(async (decision) => {
  if (decision.type === 'event') {
    const event = await eventAgent.generate(decision.params);
    await worldDirector.approveEvent(event);
  } else if (decision.type === 'npc_action') {
    const action = await npcAgent.generate(decision.params);
    await worldDirector.approveAction(action);
  }
});
`

---

## 6. 实现路线图

### Phase 1: 基础框架（2-3 周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 1-2 | World Director 核心架构 | 核心类定义、接口设计 |
| 2-3 | 事件调度器基础实现 | 触发器系统、优先级管理 |

### Phase 2: AI 决策（3-4 周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 4-5 | LLM 决策集成 | 决策 Prompt、响应解析 |
| 5-6 | 效用系统设计 | 效用计算器、多样性保证 |
| 6-7 | 行为树实现 | 行为树引擎、决策逻辑 |

### Phase 3: NPC 自主行为（2-3 周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 7-8 | NPC 日程系统 | 日程管理、行为调度 |
| 8-9 | NPC 目标驱动行为 | 目标系统、行为序列生成 |

### Phase 4: 世界演化（2-3 周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 9-10 | 世界状态机 | 状态追踪、状态转换 |
| 10-11 | 派系关系演化 | 派系系统、资源分布 |

**总计约 11-13 周**

---

## 7. 技术要点总结

1. **事件调度**：采用多触发器组合 + 优先级队列 + 冲突检测的方案
2. **NPC 行为**：基于日程 + 需求分析 + LLM 生成的三层架构
3. **世界状态**：使用有限状态机 + LLM 驱动的混合演化机制
4. **决策机制**：效用计算、行为树、LLM 决策的级联组合
5. **OpenClaw 集成**：利用定时任务、多 Agent 协作、记忆系统

本方案为游戏世界推动 Agent 提供了完整的设计蓝图，可作为后续开发的技术指导。
