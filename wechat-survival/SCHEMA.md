# WeChat Survival 数据 Schema 定义

> 文档版本: v1.0  
> 用途: AI 内容生成的结构化数据标准  
> 核心原则: 100% 可程序化生成

---

## 1. 任务 Schema

### 1.1 任务数据结构

`json
{
  title: Quest,
  type: object,
  required: [id, type, title, objectives, rewards, difficulty],
  properties: {
    id: { type: string },
    type: { type: string, enum: [main, side, daily, event] },
    title: { type: string, minLength: 2, maxLength: 50 },
    objectives: { type: array },
    rewards: { type: array },
    difficulty: { type: integer, minimum: 1, maximum: 10 }
  }
}
`

### 1.2 任务类型定义

| 类型 | 代码 | 说明 |
|------|------|------|
| 主线任务 | main | 推进剧情，解锁核心功能 |
| 支线任务 | side | 丰富内容，获得额外奖励 |
| 日常任务 | daily | 每日重复，稳定收益 |
| 事件任务 | event | 限时活动，特殊奖励 |

---

## 2. NPC Schema

### 2.1 NPC 数据结构

`json
{
  title: NPC,
  type: object,
  required: [id, name, type, rarity, attributes, personality, acquisition],
  properties: {
    id: { type: string },
    name: { type: string },
    type: { type: string, enum: [maid, companion, assistant, warrior, merchant, rival, boss] },
    rarity: { type: string, enum: [N, R, SR, SSR, UR, L] },
    attributes: { type: object, properties: { level: {type: integer}, hp: {type: integer}, attack: {type: integer}, defense: {type: integer}, speed: {type: integer} } },
    personality: { type: string },
    acquisition: { type: string },
    relationship: { type: integer }
  }
}
`

### 2.2 NPC 稀有度

| 稀有度 | 代码 | 属性倍率 |
|--------|------|---------|
| 普通 | N | x1.0 |
| 稀有 | R | x1.2 |
| 超稀有 | SR | x1.5 |
| 超超稀有 | SSR | x2.0 |
| 传说 | UR | x3.0 |
| 限定 | L | x2.5 |

### 2.3 NPC 类型

| 类型 | 代码 | 功能 |
|------|------|------|
| 女仆 | maid | 家务、采集 |
| 伴侣 | companion | 陪伴、buff |
| 战士 | warrior | 战斗输出 |
| 商人 | merchant | 交易 |
| 竞争对手 | rival | 对抗 |

---

## 3. 事件 Schema

### 3.1 事件类型

| 类型 | 代码 | 描述 |
|------|------|------|
| 探索事件 | explore | 发现资源 |
| 战斗事件 | combat | 遭遇敌人 |
| 突袭事件 | raid | 怪物进攻 |
| 交易事件 | trade | 商人交易 |
| 社交事件 | social | NPC互动 |
| 随机事件 | random | 随机触发 |

---

## 4. 房间 Schema

### 4.1 房间数据结构

`json
{
  title: Room,
  type: object,
  properties: {
    id: { type: string },
    level: { type: integer },
    area: { type: integer },
    npcSlots: { type: integer },
    resources: { properties: { food: {}, water: {}, material: {} } },
    defense: { properties: { wall: {}, trap: {}, guard: {} } }
  }
}
`

### 4.2 房间等级

| 等级 | 面积 | NPC栏位 | 升级材料 |
|------|------|---------|---------|
| 1 | 10 | 2 | - |
| 2 | 15 | 3 | 50 |
| 3 | 20 | 4 | 100 |
| 4 | 25 | 5 | 200 |
| 5 | 30 | 6 | 400 |

---

## 5. 物品 Schema

`json
{
  title: Item,
  properties: {
    id: {}, name: {}, type: { enum: [weapon, armor, consumable, material, key, treasure] },
    rarity: { enum: [N, R, SR, SSR, UR] },
    stackable: {}, value: {}
  }
}
`

---

## 6. 敌人 Schema

`json
{
  title: Enemy,
  properties: {
    id: {}, name: {}, type: { enum: [undead, beast, human, mutant, machine, boss] },
    attributes: { level: {}, hp: {}, attack: {}, defense: {} },
    rewards: {}
  }
}
`

---

## 7. 验证规则

| 验证项 | 规则 |
|--------|------|
| ID格式 | 正则表达式匹配 |
| 数值范围 | 最小/最大值 |
| 枚举值 | 允许的列表中 |
| 必填字段 | 非空 |

---

*Schema 完成*
