# AI 原生游戏方案设计文档

## 项目概述

**项目名称**：AI 原生游戏引擎 (AI-Native Game Engine)
**核心理念**：不依赖静态游戏内容，让大模型根据规则动态生成 JSON，程序解析 JSON 为游戏内容
**技术栈**：TypeScript + React + OpenClaw + LLM (MiniMax/OpenAI)

---

## 1. 技术可行性分析

### 1.1 JSON Schema 设计

#### 核心设计原则
1. **程序验证优先**：所有数值字段必须设定明确范围
2. **类型安全**：使用 TypeScript 严格类型定义
3. **可扩展性**：支持自定义字段和扩展模块
4. **LLM 友好**：Schema 描述清晰，便于大模型理解

#### 1.1.1 任务 Schema

```typescript
// 任务定义
interface Quest {
  id: string;                          // 唯一标识符 (UUID)
  title: string;                       // 任务标题 (程序不验证)
  description: string;                 // 任务描述 (程序不验证)
  type: QuestType;                     // 任务类型
  difficulty: number;                  // 难度 1-10 (程序验证)
  objectives: QuestObjective[];        // 任务目标数组
  rewards: QuestReward[];              // 奖励数组
  prerequisites: string[];             // 前置任务ID (程序验证存在性)
  timeLimit?: number;                  // 可选：时间限制(分钟)
  repeatable?: boolean;                // 是否可重复
  category: QuestCategory;             // 任务分类
}

type QuestType = 'main' | 'side' | 'daily' | 'random' | 'event';
type QuestCategory = 'story' | 'combat' | 'exploration' | 'crafting' | 'social';

interface QuestObjective {
  id: string;
  type: ObjectiveType;                // 目标类型
  target: string;                      // 目标描述 (程序不验证)
  count: number;                       // 数量 (程序验证: 1-100)
  optional?: boolean;                 // 是否可选
}

type ObjectiveType = 'kill' | 'collect' | 'explore' | 'talk' | 'craft' | 'deliver' | 'protect';

interface QuestReward {
  type: RewardType;
  id?: string;                         // 物品ID (item类型必需)
  amount: number;                      // 数量 (程序验证范围)
  weight?: number;                     // 权重 (随机奖励时使用)
}

type RewardType = 'item' | 'resource' | 'exp' | 'currency' | 'skill_point' | 'reputation';
```

**数值验证规则**：
- `difficulty`: 1-10 整数
- `objectives[].count`: 1-100 整数
- `rewards[].amount`: 根据类型设定范围
  - exp: 10-10000
  - currency: 1-10000
  - item: 1-100
  - resource: 1-500

#### 1.1.2 NPC Schema

```typescript
interface NPC {
  id: string;
  name: string;                        // NPC名称
  title?: string;                       // 称号/头衔
  appearance: NPCAppearance;           // 外观描述
  personality: string[];               // 性格特点 (程序不验证)
  backstory: string;                   // 背景故事 (程序不验证)
  role: NPCRole;                       // 职责类型
  location: LocationRef;               // 位置引用
  faction?: string;                    // 所属派系
  relationships: NPCRelationship[];    // 关系网
  dialogueTree?: DialogueNode;         // 对话树根节点
  questOffers?: string[];              // 可提供任务ID
  shop?: string;                       // 商店ID
  services?: NPCService[];             // 服务类型
}

type NPCRole = 'quest_giver' | 'merchant' | 'trainer' | 'story' | 'guard' | 'civilian' | 'boss';

interface NPCAppearance {
  race: string;
  gender: 'male' | 'female' | 'other';
  age?: string;
  distinctiveFeatures: string[];      // 显著特征描述
}

interface LocationRef {
  areaId: string;
  x?: number;
  y?: number;
  description?: string;
}

interface NPCRelationship {
  targetId: string;
  type: 'ally' | 'enemy' | 'rival' | 'family' | 'friend';
  standing: number;                    // -100 到 100
}

type NPCService = 'shop' | 'train' | 'heal' | 'teleport' | 'craft';
```

#### 1.1.3 物品 Schema

```typescript
interface Item {
  id: string;
  name: string;
  description: string;                 // 描述 (程序不验证)
  type: ItemType;
  rarity: ItemRarity;                  // 稀有度
  stackable: boolean;                  // 是否可堆叠
  maxStack?: number;                   // 堆叠上限 (程序验证: 1-9999)
  value: number;                       // 基础价值 (程序验证: 0-99999)
  stats?: ItemStats;                   // 属性加成
  effects?: ItemEffect[];              // 特殊效果
  requirements?: ItemRequirements;     // 使用需求
  source?: ItemSource;                 // 来源描述
}

type ItemType = 'weapon' | 'armor' | 'consumable' | 'material' | 'quest_item' | 'key_item';
type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

interface ItemStats {
  health?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  crit?: number;
}

interface ItemEffect {
  trigger: 'on_use' | 'on_equip' | 'on_hit' | 'passive';
  type: string;
  value: number;
  duration?: number;
}

interface ItemRequirements {
  level?: number;                      // 1-100
  strength?: number;
  intelligence?: number;
  faction?: string;
}

interface ItemSource {
  droppedBy?: string[];                // 掉落来源
  craftable?: boolean;
  purchasable?: boolean;
  foundIn?: string[];                  // 可发现地点
}
```

#### 1.1.4 事件 Schema

```typescript
interface GameEvent {
  id: string;
  title: string;
  description: string;                 // 场景描述
  type: EventType;
  severity: number;                    // 1-10
  triggers: EventTrigger[];            // 触发条件
  choices: EventChoice[];              // 玩家选择
  effects: EventEffect[];              // 事件结果
  cooldown?: number;                   // 冷却时间(小时)
  exclusiveWith?: string[];            // 互斥事件
}

type EventType = 'random' | 'story' | 'world' | 'seasonal' | 'combat';

interface EventTrigger {
  type: TriggerType;
  condition: string;
  value?: number;
}

type TriggerType = 'location' | 'time' | 'level' | 'quest_complete' | 'item_possess' | 'random';

interface EventChoice {
  id: string;
  text: string;
  requirements?: EventRequirement[];
  outcomes: EventOutcome[];
}

interface EventRequirement {
  type: string;
  item?: string;
  level?: number;
  quest?: string;
  resource?: { type: string; amount: number };
}

interface EventOutcome {
  type: OutcomeType;
  target: string;
  value: number | string;
  weight?: number;
}

type OutcomeType = 'give_item' | 'take_item' | 'gain_exp' | 'lose_health' | 
                   'start_quest' | 'end_quest' | 'change_reputation' | 'teleport';
```

#### 1.1.5 敌人/怪物 Schema

```typescript
interface Enemy {
  id: string;
  name: string;
  description: string;
  type: EnemyType;
  level: number;                       // 1-100 (程序验证)
  stats: EnemyStats;
  abilities: EnemyAbility[];
  drops: EnemyDrop[];
  behaviors?: EnemyBehavior[];
  resistance?: ElementalResistance[];
  weakness?: string[];
}

type EnemyType = 'humanoid' | 'beast' | 'undead' | 'demon' | 'elemental' | 'dragon' | 'boss';

interface EnemyStats {
  health: number;                       // 10-999999
  attack: number;                       // 1-9999
  defense: number;                     // 0-9999
  speed: number;                        // 1-999
  critRate: number;                     // 0-100 (百分比)
  critDamage: number;                   // 100-500 (百分比)
}

interface EnemyAbility {
  id: string;
  name: string;
  description: string;
  type: 'attack' | 'defense' | 'buff' | 'debuff' | 'special';
  damage?: number;
  effect?: string;
  cooldown?: number;
  manaCost?: number;
}

interface EnemyDrop {
  itemId: string;
  rate: number;                         // 0-100
  minAmount: number;
  maxAmount: number;
  guaranteed?: boolean;
}
```

### 1.2 提示词工程

#### 1.2.1 任务生成 Prompt 模板

```
## 角色：游戏任务设计师

你是一位资深游戏设计师，负责根据玩家当前状态动态生成有趣的任务。

## 玩家当前状态
- 玩家等级: {player_level}
- 当前区域: {current_area}
- 已完成任务: {completed_quests}
- 正在进行的任务: {active_quests}
- 派系声望: {faction_standings}
- 玩家职业: {player_class}

## 游戏规则约束

### 数值范围（必须严格遵守）
- 任务难度: 1-10（根据玩家等级调整，建议 {suggested_difficulty}）
- 目标数量: 1-5个
- 经验奖励: {level_based_exp_range} 点
- 金币奖励: 10-1000
- 物品奖励: 1-3件

### 任务类型要求
- main: 主线任务，影响剧情走向
- side: 支线任务，丰富世界观
- daily: 日常任务，可重复
- random: 随机事件任务

### 禁止事项
- 不要生成需要 {player_level} 级以上的内容
- 不要生成与已完成任务重复的目标
- 不要生成需要不存在物品的任务
- 禁止生成暴力/色情/政治敏感内容

## 输出格式（JSON）
请生成符合以下 Schema 的任务JSON：

```json
{
  "id": "quest_unique_id",
  "title": "任务标题",
  "description": "任务描述（100-300字）",
  "type": "main|side|daily|random",
  "difficulty": 5,
  "objectives": [
    {
      "id": "obj_1",
      "type": "kill|collect|explore|talk|craft|deliver|protect",
      "target": "目标描述",
      "count": 3,
      "optional": false
    }
  ],
  "rewards": [
    {
      "type": "exp|currency|item",
      "id": "item_id_if_needed",
      "amount": 100
    }
  ],
  "prerequisites": ["quest_id_if_needed"]
}
```

请只输出JSON，不要其他内容。
```

#### 1.2.2 NPC 生成 Prompt 模板

```
## 角色：NPC 创作者

你是一位世界构建专家，负责根据游戏世界观创建鲜活的 NPC。

## 当前世界设定
- 地区: {current_area}
- 派系: {factions}
- 时代背景: {setting}
- 现有NPC: {existing_npcs}

## 规则约束

### 数值范围
- 好感度: -100 到 100
- NPC等级(战斗型): 与该区域怪物等级相当

### NPC类型
- quest_giver: 任务发布者
- merchant: 商人
- trainer: 训练师
- story: 剧情关键人物
- guard: 守卫/士兵
- civilian: 平民
- boss: Boss级

### 命名规范
- 使用符合世界观的命名风格
- 避免过于现代的名字
- 名字长度 2-8 个字符

## 输出格式
生成符合以下 Schema 的 NPC JSON：

```json
{
  "id": "npc_unique_id",
  "name": "NPC名字",
  "title": "称号（如有）",
  "appearance": {
    "race": "种族",
    "gender": "male|female|other",
    "age": "年龄描述",
    "distinctiveFeatures": ["特征1", "特征2"]
  },
  "personality": ["性格特点1", "特点2"],
  "backstory": "背景故事（50-150字）",
  "role": "npc_role",
  "location": {
    "areaId": "区域ID"
  },
  "faction": "派系（可选）",
  "relationships": [
    {
      "targetId": "npc_id",
      "type": "ally|enemy|rival|family|friend",
      "standing": 50
    }
  ],
  "questOffers": ["quest_id_if_any"],
  "services": ["shop|train|heal|teleport|craft"]
}
```

请只输出JSON。
```

### 1.3 内容验证系统

#### 1.3.1 三层验证架构

```
┌─────────────────────────────────────────────┐
│            LLM 自检层（第一层）               │
│  - Prompt 内置规则检查                       │
│  - 输出格式自验证                            │
│  - 简单数值范围预检查                        │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│           Schema 验证层（第二层）             │
│  - JSON Schema 结构验证                      │
│  - TypeScript 类型检查                       │
│  - 必填字段检查                              │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│           业务逻辑验证层（第三层）             │
│  - 引用完整性（任务ID存在性）                 │
│  - 数值合理性（等级与奖励匹配）               │
│  - 依赖关系验证（前置任务）                   │
│  - 冲突检测（互斥事件）                       │
└─────────────────────────────────────────────┘
```

#### 1.3.2 验证示例代码

```typescript
// 任务验证器
class QuestValidator {
  private playerState: PlayerState;
  private existingQuests: Map<string, Quest>;
  
  validate(quest: Quest): ValidationResult {
    const errors: ValidationError[] = [];
    
    // 1. Schema 验证
    if (!this.validateSchema(quest)) {
      errors.push({ field: 'schema', message: 'JSON Schema 验证失败' });
    }
    
    // 2. 难度与等级匹配
    const minDifficulty = Math.floor(this.playerState.level / 5);
    const maxDifficulty = Math.floor(this.playerState.level / 3) + 3;
    if (quest.difficulty < minDifficulty || quest.difficulty > maxDifficulty) {
      errors.push({ 
        field: 'difficulty', 
        message: `难度 ${quest.difficulty} 不适合 ${this.playerState.level} 级玩家` 
      });
    }
    
    // 3. 前置任务存在性
    for (const prereqId of quest.prerequisites) {
      if (!this.existingQuests.has(prereqId)) {
        errors.push({
          field: 'prerequisites',
          message: `前置任务 ${prereqId} 不存在`
        });
      }
    }
    
    // 4. 奖励合理性
    const expectedExp = quest.difficulty * 50 * quest.objectives.length;
    const rewardExp = quest.rewards.find(r => r.type === 'exp')?.amount || 0;
    if (rewardExp < expectedExp * 0.5 || rewardExp > expectedExp * 2) {
      errors.push({
        field: 'rewards',
        message: `奖励经验 ${rewardExp} 与难度不匹配（期望 ${expectedExp}）`
      });
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

### 1.4 上下文管理策略

#### 1.4.1 分层记忆架构

```
┌────────────────────────────────────────────────────────────┐
│                      长期记忆（向量数据库）                   │
│  - 玩家历史行为向量                                        │
│  - 重要事件记录                                            │
│  - NPC 交互历史                                            │
│  - 世界状态快照                                            │
└────────────────────────────────────────────────────────────┘
                              ▲
                              │ 向量检索
                              ▼
┌────────────────────────────────────────────────────────────┐
│                      中期记忆（Redis）                       │
│  - 当前会话上下文                                          │
│  - 活跃任务状态                                            │
│  - 玩家实时状态                                            │
│  - 冷却时间管理                                            │
└────────────────────────────────────────────────────────────┘
                              ▲
                              │ 定期压缩
                              ▼
┌────────────────────────────────────────────────────────────┐
│                      短期记忆（内存）                        │
│  - 最近 N 条交互                                           │
│  - 当前对话上下文                                          │
│  - 即时计算缓存                                            │
└────────────────────────────────────────────────────────────┘
```

#### 1.4.2 上下文压缩策略

```typescript
interface ConversationContext {
  recentMessages: Message[];          // 最近 20 条
  summary: string;                     // 历史摘要
  relevantMemories: Memory[];         // 相关记忆（向量检索）
  playerState: PlayerStateSnapshot;   // 玩家状态快照
}

// 摘要压缩触发条件
const COMPRESSION_TRIGGERS = {
  messageCount: 50,                    // 50 条消息后压缩
  tokenCount: 8000,                   // 8000 tokens 后压缩
  sessionHours: 2,                    // 2 小时后压缩
};
```

---

## 2. 最新 AI 技术应用调研报告

### 2.1 行业现状分析

#### 2.1.1 AI 游戏发展态势 (2025-2026)

**核心技术趋势**：

1. **Procedural Content Generation (PCG) + LLM**
   - 传统 PCG：基于规则和算法的随机生成
   - LLM 增强：语义理解 + 上下文感知 + 个性化生成
   - 2025 年代表性项目：Inworld AI, Convai, Dungeon AI

2. **NPC 智能化演进**
   - 1.0 时代：静态对话树
   - 2.0 时代：基于状态的有限状态机
   - 3.0 时代：LLM 驱动的自主对话
   - 4.0 时代：多模态 + 长期记忆 + 情感模拟

3. **RAG + 游戏知识库**
   - 传统：硬编码的游戏规则和文本
   - 现代：向量检索 + 动态生成 + 个性化

#### 2.1.2 典型案例分析

| 项目 | 技术特点 | 适用场景 | 局限 |
|------|----------|----------|------|
| **Inworld AI** | NPC 微服务 + LLM | 对话密集型游戏 | 成本较高 |
| **Convai** | 语音 + LLM 集成 | VR/AR 游戏 | 延迟敏感 |
| **AI Dungeon** | 纯 LLM 叙事 | 文字冒险 | 缺乏结构 |
| **Lost Island** | RAG + 动态生成 | 开放世界 | 技术复杂 |
| **我们的方案** | Schema 约束 + 程序验证 | 商业游戏 | 新方案 |

### 2.2 RAG 技术应用

#### 2.2.1 游戏知识库架构

```
┌─────────────────────────────────────────────────────────┐
│                    内容知识库                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ 世界观设定  │ │  地理信息   │ │  派系关系   │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ 人物关系图  │ │  历史事件   │ │  物品背景   │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼ 向量嵌入
┌─────────────────────────────────────────────────────────┐
│                  向量数据库 (Milvus/Qdrant)              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼ 语义检索
┌─────────────────────────────────────────────────────────┐
│                    RAG 检索层                            │
│  - 混合检索 (关键词 + 语义)                               │
│  - 重排序 (Cross-Encoder)                               │
│  - 缓存优化                                              │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Agent 架构设计

#### 2.3.1 多 Agent 协作系统

```
┌─────────────────────────────────────────────────────────────┐
│                     游戏 Director Agent                      │
│  - 全局状态管理                                             │
│  - Agent 协调                                               │
│  - 冲突仲裁                                                 │
└─────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   任务 Agent   │ │   NPC Agent     │ │   事件 Agent    │ 叙事 Agent
│  - 任务生成    │ │  - 对话生成     │ │  - 随机事件     │ - 剧情生成
│  - 难度平衡    │ │  - 记忆管理     │ │  - 世界变化     │ - 文本润色
│  - 奖励计算    │ │  - 行为决策     │ │  - 季节事件     │ - 描述生成
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 2.4 记忆系统设计

#### 2.4.1 记忆类型与存储

| 记忆类型 | 存储方式 | 检索方式 | 生命周期 |
|----------|----------|----------|----------|
| **短期记忆** | 内存 (Redis) | FIFO | 会话期间 |
| **中期记忆** | PostgreSQL | 时间戳索引 | 7-30 天 |
| **长期记忆** | 向量数据库 | 语义检索 | 永久 |
| **世界记忆** | 图数据库 | 关系查询 | 永久 |

### 2.5 OpenClaw 集成方案

#### 2.5.1 定时任务场景

```typescript
// 使用 OpenClaw cron 定时任务
{
  name: "daily-world-events",
  schedule: "0 6 * * *",  // 每天早上6点
  handler: async (context) => {
    const agent = await spawnAgent('event-agent');
    const events = await agent.generateDailyEvents({
      region: 'global',
      count: 3
    });
    // 保存事件并通知玩家
  }
}
```

---

## 3. 详细架构设计

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         游戏客户端 (React)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 战斗界面 │  │ 地图界面 │  │ 任务面板 │  │ NPC 对话 │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │ WebSocket / REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 网关 (Express/Koa)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  认证中间件  │  │  限流中间件  │  │  缓存中间件  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   游戏逻辑层    │ │  AI 内容生成层   │ │   数据存储层    │
│                 │ │                 │ │                 │
│  - 数值验证    │ │  - Quest Agent │ │  - PostgreSQL  │
│  - 战斗引擎    │ │  - NPC Agent   │ │  - Redis       │
│  - 状态管理    │ │  - Event Agent │ │  - Milvus      │
│  - 规则引擎    │ │  - RAG 检索    │ │  - S3/文件存储 │
│  - 事件解析    │ │  - 记忆系统    │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     LLM 服务 (MiniMax / OpenAI)               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心模块设计

#### 3.2.1 项目结构

```
src/
├── core/
│   ├── validator/           # 验证器
│   │   ├── QuestValidator.ts
│   │   ├── NPCValidator.ts
│   │   ├── ItemValidator.ts
│   │   └── EventValidator.ts
│   ├── engine/              # 引擎
│   │   ├── BattleEngine.ts
│   │   ├── QuestEngine.ts
│   │   ├── InventoryEngine.ts
│   │   └── EconomyEngine.ts
│   └── rules/               # 规则
│       ├── GrowthRules.ts
│       ├── LootRules.ts
│       └── BalanceRules.ts
├── ai/
│   ├── agents/
│   │   ├── QuestAgent.ts
│   │   ├── NPCAgent.ts
│   │   ├── EventAgent.ts
│   │   └── StoryAgent.ts
│   ├── rag/
│   │   ├── Retriever.ts
│   │   ├── Embedder.ts
│   │   └── KnowledgeBase.ts
│   ├── memory/
│   │   ├── MemoryManager.ts
│   │   ├── PlayerMemory.ts
│   │   └── WorldMemory.ts
│   └── prompts/
│       ├── QuestPrompt.ts
│       ├── NPCPrompt.ts
│       └── EventPrompt.ts
└── api/
    ├── routes/
    ├── middleware/
    └── services/
```

#### 3.2.2 数值平衡规则

```typescript
export const GAME_RULES = {
  // 玩家成长
  player: {
    levelExpCurve: (level: number) => Math.floor(100 * Math.pow(1.5, level)),
    maxLevel: 100,
    baseStats: { health: 100, attack: 10, defense: 5, speed: 10 },
    statGrowthPerLevel: { health: 10, attack: 2, defense: 1, speed: 1 }
  },
  
  // 任务难度
  quest: {
    difficultyRange: [1, 10],
    objectivesPerQuest: [1, 5],
    expMultiplier: 50,
    currencyRange: [10, 1000],
    itemRewardChance: 0.3,
    maxItemRewards: 3
  },
  
  // 战斗
  combat: {
    baseEnemyHealth: (level: number) => level * 50,
    baseEnemyAttack: (level: number) => level * 3,
    baseEnemyDefense: (level: number) => level * 2,
    critRateCap: 0.5,
    critDamageMultiplier: 1.5,
    dodgeRateCap: 0.3
  },
  
  // 物品
  item: {
    rarityChance: {
      common: 0.6,
      uncommon: 0.25,
      rare: 0.1,
      epic: 0.04,
      legendary: 0.009,
      mythic: 0.001
    },
    stackLimits: {
      material: 999,
      consumable: 99,
      quest_item: 1
    }
  }
};
```

---

## 4. JSON Schema 完整代码

### 4.1 统一 Schema 导出

```typescript
// schemas/index.ts
export * from './quest';
export * from './npc';
export * from './item';
export * from './enemy';
export * from './event';
export * from './player';

export type GameContent = Quest | NPC | Item | Enemy | GameEvent;

export const Validators = {
  quest: new QuestValidator(),
  npc: new NPCValidator(),
  item: new ItemValidator(),
  enemy: new EnemyValidator(),
  event: new EventValidator()
};
```

### 4.2 基础类型定义

```typescript
// schemas/base.ts

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Location {
  areaId: string;
  x?: number;
  y?: number;
  name?: string;
}

export interface Price {
  currency: string;
  amount: number;
}

export interface Duration {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}
```

---

## 5. 提示词示例

### 5.1 完整任务生成 Prompt

```typescript
export const questGenerationPrompt = `
## 角色：游戏任务设计师

你是一位资深游戏设计师，负责根据玩家当前状态动态生成有趣的任务。

## 玩家当前状态
- 玩家等级: {{player_level}}
- 当前区域: {{current_area}}
- 已完成任务: {{completed_quests}}
- 正在进行的任务: {{active_quests}}
- 派系声望: {{faction_standings}}
- 玩家职业: {{player_class}}

## 游戏世界观背景
{{world_lore}}

## 当前区域特色
{{area_description}}

## 游戏规则约束

### 数值范围（必须严格遵守）
- 任务难度: 1-10
- 目标数量: 1-5个
- 经验奖励: {{min_exp}} - {{max_exp}} 点
- 金币奖励: 10-1000
- 物品奖励: 1-3件

### 禁止事项
- 不要生成需要 {{player_level}} 级以上的内容
- 不要生成与已完成任务重复的目标
- 禁止生成暴力/色情/政治敏感内容

## 输出格式
请生成符合以下 JSON Schema 的任务：
\`\`\`json
{
  "id": "quest_uuid",
  "title": "任务标题",
  "description": "任务描述（100-300字）",
  "type": "main|side|daily|random",
  "difficulty": 5,
  "objectives": [...],
  "rewards": [...],
  "prerequisites": []
}
\`\`\`

请只输出JSON，不要其他内容。
`;
```

### 5.2 NPC 对话生成 Prompt

```typescript
export const npcDialoguePrompt = `
## 角色：NPC 对话生成器

基于 NPC 设定和当前情境，生成 NPC 的对话内容。

## NPC 设定
- 名字: {{npc_name}}
- 性格: {{npc_personality}}
- 与玩家关系: {{relationship}}
- 当前心情: {{mood}}

## 当前情境
- 玩家正在: {{player_action}}
- 地点: {{location}}
- 时间: {{time_of_day}}

## 游戏规则
- 对话长度: 20-100 字
- 符合 NPC 性格特点
- 推进任务或剧情

## 输出格式
\`\`\`json
{
  "npcId": "{{npc_id}}",
  "dialogue": "NPC说的话",
  "emotion": "happy|neutral|angry|sad|surprised",
  "options": [
    {"id": "opt1", "text": "玩家选项1"},
    {"id": "opt2", "text": "玩家选项2"}
  ]
}
\`\`\`
`;
```

---

## 6. 实现路线图

### Phase 1: 基础架构（2-3 周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 第1周 | JSON Schema 设计与验证器 | 完整 Schema 定义、验证器代码 |
| 第2周 | 提示词工程与测试 | Prompt 模板库、测试用例 |
| 第3周 | 基础 RAG 检索 | 知识库架构、检索服务 |

### Phase 2: Agent 系统（3-4 周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 第4周 | 任务 Agent 实现 | QuestAgent、任务生成逻辑 |
| 第5周 | NPC Agent 实现 | NPCAgent、对话生成逻辑 |
| 第6周 | 事件 Agent 实现 | EventAgent、随机事件系统 |
| 第7周 | 记忆系统实现 | MemoryManager、上下文管理 |

### Phase 3: 集成与优化（2-3 周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 第8周 | 前端集成 | React 组件、游戏界面 |
| 第9周 | 性能优化 | 缓存策略、批量生成 |
| 第10周 | 内容质量评估 | 评估系统、上线准备 |

---

## 7. 技术选型建议

### 7.1 技术栈

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 前端 | React + TypeScript | 成熟稳定、生态丰富 |
| 后端 | Node.js + Express | 与前端统一语言、开发效率高 |
| 数据库 | PostgreSQL + Redis | 结构化存储 + 缓存 |
| 向量库 | Milvus / Qdrant | 高性能向量检索 |
| LLM | MiniMax / OpenAI | 成本可控、效果好 |
| 部署 | Docker + K8s | 容器化、可扩展 |

### 7.2 成本估算

| 项目 | 预估成本 | 说明 |
|------|----------|------|
| LLM API 调用 | ¥10,000-50,000/月 | 根据日活和生成量 |
| 服务器 | ¥5,000-20,000/月 | 根据规模 |
| 向量数据库 | ¥2,000-10,000/月 | 存储量决定 |
| 其他 | ¥3,000/月 | CDN、监控等 |

---

*文档版本: v1.0*
*创建时间: 2026-03-13*
