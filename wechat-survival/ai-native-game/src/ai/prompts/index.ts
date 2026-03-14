// AI 内容生成 Prompt 模板库
// 项目路径: projects/ai-native-game/src/ai/prompts/

import { Player, Location } from '../schemas';

// ============================================
// Prompt 模板引擎
// ============================================

type TemplateVars = Record<string, string | number | string[] | Record<string, unknown>>;

class PromptTemplate {
  private template: string;

  constructor(template: string) {
    this.template = template;
  }

  render(vars: TemplateVars): string {
    let result = this.template;
    for (const [key, value] of Object.entries(vars)) {
      const placeholder = `{{${key}}}`;
      if (result.includes(placeholder)) {
        if (Array.isArray(value)) {
          result = result.replace(placeholder, value.join(', '));
        } else if (typeof value === 'object') {
          result = result.replace(placeholder, JSON.stringify(value));
        } else {
          result = result.replace(placeholder, String(value));
        }
      }
    }
    return result;
  }
}

// ============================================
// 任务生成 Prompt
// ============================================

export const questGenerationPrompt = new PromptTemplate(`
## 角色：游戏任务设计师

你是一位资深游戏设计师，负责根据玩家当前状态动态生成有趣的任务。

## 玩家当前状态
- 玩家等级: {{player_level}}
- 当前区域: {{current_area}}
- 已完成任务: {{completed_quests}}
- 正在进行的任务: {{active_quests}}
- 派系声望: {{faction_standings}}
- 玩家职业: {{player_class}}
- 可用技能: {{player_skills}}

## 游戏世界观背景
{{world_lore}}

## 当前区域特色
{{area_description}}

## 游戏规则约束

### 数值范围（必须严格遵守）
- 任务难度: 1-10（根据玩家等级调整，建议 {{suggested_difficulty}}）
- 目标数量: 1-{{max_objectives}}个
- 经验奖励: {{min_exp}} - {{max_exp}} 点
- 金币奖励: {{min_gold}} - {{max_gold}}
- 物品奖励: {{max_item_rewards}}件

### 任务类型要求
- main: 主线任务，影响剧情走向
- side: 支线任务，丰富世界观
- daily: 日常任务，可重复
- random: 随机事件任务

### 禁止事项
- 不要生成需要 {{player_level}} 级以上的内容
- 不要生成与已完成任务重复的目标
- 不要生成需要不存在物品的任务
- 禁止生成暴力/色情/政治敏感内容

## 输出格式（JSON）
请生成符合以下 Schema 的任务JSON：

\`\`\`json
{
  "id": "quest_unique_id",
  "title": "任务标题（简洁有吸引力）",
  "description": "任务描述（100-300字，富含剧情）",
  "type": "main|side|daily|random",
  "difficulty": {{suggested_difficulty}},
  "objectives": [
    {
      "id": "obj_1",
      "type": "kill|collect|explore|talk|craft|deliver|protect",
      "target": "具体目标描述",
      "count": 3,
      "optional": false
    }
  ],
  "rewards": [
    {
      "type": "exp|currency|item|resource",
      "id": "物品ID（如需要）",
      "amount": 100
    }
  ],
  "prerequisites": ["前置任务ID（如有）"],
  "category": "story|combat|exploration|crafting|social"
}
\`\`\`

请只输出JSON，不要其他内容。
`);

// ============================================
// NPC 生成 Prompt
// ============================================

export const npcGenerationPrompt = new PromptTemplate(`
## 角色：NPC 创作者

你是一位世界构建专家，负责根据游戏世界观创建鲜活的 NPC。

## 当前世界设定
- 地区: {{current_area}}
- 派系: {{factions}}
- 时代背景: {{setting}}
- 现有NPC: {{existing_npcs}}

## 区域信息
{{area_info}}

## 规则约束

### 数值范围
- 好感度: -100 到 100
- NPC等级(战斗型): {{suggested_level}}

### NPC类型（选择一个）
- quest_giver: 任务发布者
- merchant: 商人
- trainer: 训练师
- story: 剧情关键人物
- guard: 守卫/士兵
- civilian: 平民
- boss: Boss级

### 命名规范
- 使用符合 {{setting}} 风格的命名
- 避免过于现代的名字
- 名字长度 2-12 个字符
- 西方奇幻推荐：英语名字
- 东方仙侠推荐：中文名字

## 输出格式
生成符合以下 Schema 的 NPC JSON：

\`\`\`json
{
  "id": "npc_unique_id",
  "name": "NPC名字",
  "title": "称号/头衔（如有）",
  "appearance": {
    "race": "种族",
    "gender": "male|female|other",
    "age": "年龄描述",
    "distinctiveFeatures": ["显著特征1", "特征2"]
  },
  "personality": ["性格特点1", "特点2"],
  "backstory": "背景故事（50-150字）",
  "role": "quest_giver|merchant|trainer|story|guard|civilian|boss",
  "location": {
    "areaId": "{{current_area}}"
  },
  "faction": "所属派系（可选）",
  "relationships": [
    {
      "targetId": "npc_id",
      "type": "ally|enemy|rival|family|friend",
      "standing": 50
    }
  ],
  "questOffers": ["quest_id_if_any"],
  "services": ["shop|train|heal|teleport|craft（根据role选择）"]
}
\`\`\`

请只输出JSON。
`);

// ============================================
// NPC 对话生成 Prompt
// ============================================

export const npcDialoguePrompt = new PromptTemplate(`
## 角色：NPC 对话生成器

基于 NPC 设定和当前情境，生成 NPC 的对话内容。

## NPC 设定
- 名字: {{npc_name}}
- 性格: {{npc_personality}}
- 与玩家关系: {{relationship}}
- 当前心情: {{mood}}
- 职业: {{npc_role}}

## 当前情境
- 玩家正在: {{player_action}}
- 地点: {{location}}
- 时间: {{time_of_day}}
- 玩家等级: {{player_level}}

## 上下文
- 玩家正在进行的任务: {{active_quests}}
- 最近对话: {{recent_dialogue}}

## 游戏规则
- 对话长度: 20-100 字
- 符合 NPC 性格特点
- 根据任务状态调整内容

## 输出格式
\`\`\`json
{
  "npcId": "{{npc_id}}",
  "dialogue": "NPC说的话",
  "emotion": "happy|neutral|angry|sad|surprised|worried|excited",
  "options": [
    {"id": "opt1", "text": "玩家选项1"},
    {"id": "opt2", "text": "玩家选项2"}
  ]
}
\`\`\`
`);

// ============================================
// 物品生成 Prompt
// ============================================

export const itemGenerationPrompt = new PromptTemplate(`
## 角色：物品设计师

你是一位游戏物品设计师，负责创建符合游戏世界的物品。

## 生成参数
- 物品类型: {{item_type}}
- 稀有度: {{rarity}}
- 适用等级: {{level}}
- 背景设定: {{world_lore}}

## 稀有度对应规则
- common: 普通，白色，常见物品
- uncommon: 优秀，绿色，稍有价值
- rare: 稀有，蓝色，有特殊效果
- epic: 史诗，紫色，强大效果
- legendary: 传说，橙色，非常稀有
- mythic: 神级，金色，极其稀有

## 物品类型
- weapon: 武器
- armor: 护甲
- consumable: 消耗品
- material: 材料
- quest_item: 任务物品

## 数值范围
- 武器攻击: {{min_attack}} - {{max_attack}}
- 护甲防御: {{min_defense}} - {{max_defense}}
- 消耗品效果: 1-1000
- 材料价值: {{min_value}} - {{max_value}}

## 输出格式
\`\`\`json
{
  "id": "item_unique_id",
  "name": "物品名称",
  "description": "物品描述（体现背景故事）",
  "type": "{{item_type}}",
  "rarity": "{{rarity}}",
  "stackable": true|false,
  "maxStack": 数量,
  "value": 价格,
  "stats": {
    "attack": 攻击力,
    "defense": 防御力,
    "health": 生命值,
    "speed": 速度,
    "crit": 暴击率
  },
  "effects": [
    {
      "trigger": "on_use|on_equip|on_hit|passive",
      "type": "效果类型",
      "value": 数值
    }
  ],
  "requirements": {
    "level": 最低等级
  },
  "source": {
    "droppedBy": ["怪物ID"],
    "craftable": true|false,
    "purchasable": true|false
  }
}
\`\`\`
`);

// ============================================
// 事件生成 Prompt
// ============================================

export const eventGenerationPrompt = new PromptTemplate(`
## 角色：事件设计师

你是一位游戏事件设计师，负责创建有趣的随机事件和世界事件。

## 当前世界状态
- 玩家等级: {{player_level}}
- 当前区域: {{current_area}}
- 时间: {{time_of_day}}
- 天气: {{weather}}
- 玩家状态: {{player_status}}

## 事件类型
- random: 随机偶发事件
- story: 剧情触发事件
- world: 世界事件（影响所有玩家）
- seasonal: 季节性事件

## 规则约束
- 严重程度: 1-10（1-3简单，4-6中等，7-10重大）
- 选项数量: 2-4个
- 每个选项需要后果

## 输出格式
\`\`\`json
{
  "id": "event_unique_id",
  "title": "事件标题",
  "description": "场景描述（100-200字）",
  "type": "random|story|world|seasonal",
  "severity": 5,
  "triggers": [
    {
      "type": "location|time|level|random",
      "condition": "触发条件描述"
    }
  ],
  "choices": [
    {
      "id": "choice1",
      "text": "选项描述",
      "outcomes": [
        {
          "type": "give_item|take_item|gain_exp|lose_health|change_reputation",
          "target": "目标",
          "value": 数值
        }
      ]
    }
  ]
}
\`\`\`
`);

// ============================================
// 上下文摘要 Prompt
// ============================================

export const contextSummaryPrompt = new PromptTemplate(`
## 角色：游戏历史记录员

请将以下游戏对话历史压缩为关键信息摘要。

## 对话历史
{{conversation_history}}

## 玩家状态
- 等级: {{player_level}}
- 位置: {{location}}
- 任务: {{quests}}
- 派系: {{factions}}

## 提取要求
1. 玩家做出的重要决策
2. 完成的里程碑事件
3. NPC 交互要点
4. 未完成的重要事项
5. 获得的关键物品

## 输出格式
\`\`\`json
{
  "keyDecisions": ["决定1", "决定2"],
  "milestones": ["里程碑1", "里程碑2"],
  "npcInteractions": [{"npc": "npc名", "summary": "交互摘要"}],
  "unfinished": ["未完成事项1"],
  "keyItems": ["关键物品1"]
}
\`\`\`
`);

// ============================================
// 战斗描述 Prompt
// ============================================

export const battleDescriptionPrompt = new PromptTemplate(`
## 角色：战斗叙述者

为游戏战斗生成生动的描述文本。

## 战斗信息
- 玩家职业: {{player_class}}
- 玩家技能: {{player_skills}}
- 敌人: {{enemy_name}} ({{enemy_type}})
- 敌人等级: {{enemy_level}}
- 回合: {{round}}
- 当前局面: {{situation}}

## 规则
- 描述长度: 30-80 字
- 紧张刺激的氛围
- 体现玩家和敌人的行动

## 输出格式
\`\`\`json
{
  "round": {{round}},
  "description": "战斗描述文本",
  "playerAction": "玩家行动描述",
  "enemyAction": "敌人行动描述",
  "damage": {
    "player": 玩家受到的伤害,
    "enemy": 敌人受到的伤害
  }
}
\`\`\`
`);

// ============================================
// 辅助函数
// ============================================

export function buildQuestContext(player: Player, location: Location): TemplateVars {
  const suggestedDifficulty = Math.floor(player.level / 5) + 1;
  const minExp = suggestedDifficulty * 30;
  const maxExp = suggestedDifficulty * 80;

  return {
    player_level: player.level,
    current_area: location.areaId,
    completed_quests: player.quests
      .filter(q => q.status === 'completed')
      .map(q => q.questId),
    active_quests: player.quests
      .filter(q => q.status === 'accepted')
      .map(q => q.questId),
    faction_standings: player.factionStandings.map(f => `${f.factionId}: ${f.standing}`).join(', '),
    player_class: player.class,
    player_skills: player.skills,
    suggested_difficulty: Math.min(suggestedDifficulty, 10),
    max_objectives: 5,
    min_exp: minExp,
    max_exp: maxExp,
    min_gold: 10,
    max_gold: Math.floor(player.level * 10),
    max_item_rewards: 3
  };
}

export function buildNPCContext(
  npcName: string, 
  personality: string[], 
  relationship: number,
  role: string
): TemplateVars {
  let mood = 'neutral';
  let relationText = '陌生人';
  
  if (relationship > 50) {
    mood = 'happy';
    relationText = '好友';
  } else if (relationship < -50) {
    mood = 'angry';
    relationText = '敌人';
  } else if (relationship < 0) {
    mood = 'worried';
    relationText = '警惕';
  }

  return {
    npc_name: npcName,
    npc_personality: personality.join(', '),
    relationship: relationText,
    mood: mood,
    npc_role: role
  };
}
