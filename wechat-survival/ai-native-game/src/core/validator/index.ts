// 验证器实现
// 项目路径: projects/ai-native-game/src/core/validator/

import {
  Quest,
  NPC,
  Item,
  Enemy,
  GameEvent,
  Player,
  ValidationResult,
  GAME_RULES,
  QuestObjective,
  QuestReward,
  EnemyStats,
  ItemStats
} from '../schemas';

// ============================================
// 任务验证器
// ============================================

export class QuestValidator {
  private existingQuests: Map<string, Quest> = new Map();

  setExistingQuests(quests: Quest[]): void {
    this.existingQuests.clear();
    quests.forEach(q => this.existingQuests.set(q.id, q));
  }

  validate(quest: Quest, playerLevel: number = 1): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // 1. 必填字段验证
    if (!quest.id) errors.push({ field: 'id', message: '任务ID不能为空' });
    if (!quest.title) errors.push({ field: 'title', message: '任务标题不能为空' });
    if (!quest.type) errors.push({ field: 'type', message: '任务类型不能为空' });

    // 2. 难度范围验证
    const [minDiff, maxDiff] = GAME_RULES.quest.difficultyRange;
    if (quest.difficulty < minDiff || quest.difficulty > maxDiff) {
      errors.push({
        field: 'difficulty',
        message: `难度必须在 ${minDiff}-${maxDiff} 之间`
      });
    }

    // 3. 难度与玩家等级匹配
    const suggestedMin = Math.floor(playerLevel / 5);
    const suggestedMax = Math.floor(playerLevel / 3) + 3;
    if (quest.difficulty < suggestedMin || quest.difficulty > suggestedMax) {
      errors.push({
        field: 'difficulty',
        message: `难度 ${quest.difficulty} 不适合 ${playerLevel} 级玩家（建议 ${suggestedMin}-${suggestedMax}）`
      });
    }

    // 4. 目标数量验证
    const [minObj, maxObj] = GAME_RULES.quest.objectivesRange;
    if (quest.objectives.length < minObj || quest.objectives.length > maxObj) {
      errors.push({
        field: 'objectives',
        message: `目标数量必须在 ${minObj}-${maxObj} 之间`
      });
    }

    // 5. 目标数值验证
    quest.objectives.forEach((obj, idx) => {
      if (obj.count < 1 || obj.count > 100) {
        errors.push({
          field: `objectives[${idx}].count`,
          message: `目标数量必须在 1-100 之间`
        });
      }
    });

    // 6. 奖励验证
    quest.rewards.forEach((reward, idx) => {
      const expRange = [10, 10000] as [number, number];
      const currencyRange = GAME_RULES.quest.currencyRange;
      
      if (reward.type === 'exp') {
        if (reward.amount < expRange[0] || reward.amount > expRange[1]) {
          errors.push({
            field: `rewards[${idx}].amount`,
            message: `经验奖励必须在 ${expRange[0]}-${expRange[1]} 之间`
          });
        }
      }
      
      if (reward.type === 'currency') {
        if (reward.amount < currencyRange[0] || reward.amount > currencyRange[1]) {
          errors.push({
            field: `rewards[${idx}].amount`,
            message: `金币奖励必须在 ${currencyRange[0]}-${currencyRange[1]} 之间`
          });
        }
      }

      // 物品奖励需要 ID
      if (reward.type === 'item' && !reward.id) {
        errors.push({
          field: `rewards[${idx}].id`,
          message: '物品奖励需要指定物品ID'
        });
      }
    });

    // 7. 前置任务存在性验证
    quest.prerequisites.forEach(prereqId => {
      if (!this.existingQuests.has(prereqId)) {
        errors.push({
          field: 'prerequisites',
          message: `前置任务 ${prereqId} 不存在`
        });
      }
    });

    // 8. 奖励合理性验证
    const expectedExp = quest.difficulty * GAME_RULES.quest.expMultiplier * quest.objectives.length;
    const actualExp = quest.rewards.find(r => r.type === 'exp')?.amount || 0;
    if (actualExp < expectedExp * 0.5 || actualExp > expectedExp * 2) {
      errors.push({
        field: 'rewards',
        message: `奖励经验 ${actualExp} 与难度不匹配（建议 ${Math.floor(expectedExp * 0.5)}-${Math.floor(expectedExp * 2)}）`
      });
    }

    return { valid: errors.length === 0, errors };
  }
}

// ============================================
// NPC 验证器
// ============================================

export class NPCValidator {
  validate(npc: NPC): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // 必填字段
    if (!npc.id) errors.push({ field: 'id', message: 'NPC ID 不能为空' });
    if (!npc.name) errors.push({ field: 'name', message: 'NPC 名称不能为空' });
    if (!npc.role) errors.push({ field: 'role', message: 'NPC 角色不能为空' });

    // 名字长度
    if (npc.name.length < 2 || npc.name.length > 12) {
      errors.push({
        field: 'name',
        message: 'NPC 名字长度应在 2-12 个字符之间'
      });
    }

    // 关系值范围
    npc.relationships.forEach((rel, idx) => {
      if (rel.standing < -100 || rel.standing > 100) {
        errors.push({
          field: `relationships[${idx}].standing`,
          message: '好感度必须在 -100 到 100 之间'
        });
      }
    });

    return { valid: errors.length === 0, errors };
  }
}

// ============================================
// 物品验证器
// ============================================

export class ItemValidator {
  validate(item: Item): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // 必填字段
    if (!item.id) errors.push({ field: 'id', message: '物品 ID 不能为空' });
    if (!item.name) errors.push({ field: 'name', message: '物品名称不能为空' });
    if (!item.type) errors.push({ field: 'type', message: '物品类型不能为空' });
    if (!item.rarity) errors.push({ field: 'rarity', message: '物品稀有度不能为空' });

    // 堆叠数量验证
    if (item.stackable && item.maxStack) {
      const maxStack = GAME_RULES.item.stackLimits[item.type as keyof typeof GAME_RULES.item.stackLimits] || 999;
      if (item.maxStack < 1 || item.maxStack > maxStack) {
        errors.push({
          field: 'maxStack',
          message: `堆叠上限应在 1-${maxStack} 之间`
        });
      }
    }

    // 价值范围验证
    const rarityValueRanges: Record<string, [number, number]> = {
      common: [1, 10],
      uncommon: [10, 100],
      rare: [100, 1000],
      epic: [1000, 10000],
      legendary: [10000, 100000],
      mythic: [50000, 500000]
    };
    
    const valueRange = rarityValueRanges[item.rarity];
    if (valueRange && (item.value < valueRange[0] || item.value > valueRange[1])) {
      errors.push({
        field: 'value',
        message: `${item.rarity} 物品价值应在 ${valueRange[0]}-${valueRange[1]} 之间`
      });
    }

    // 属性范围验证
    if (item.stats) {
      Object.entries(item.stats).forEach(([key, value]) => {
        if (value !== undefined && (value < -999 || value > 999)) {
          errors.push({
            field: `stats.${key}`,
            message: `属性 ${key} 值应在 -999 到 999 之间`
          });
        }
      });
    }

    // 使用等级验证
    if (item.requirements?.level) {
      if (item.requirements.level < 1 || item.requirements.level > GAME_RULES.player.maxLevel) {
        errors.push({
          field: 'requirements.level',
          message: `使用等级应在 1-${GAME_RULES.player.maxLevel} 之间`
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// ============================================
// 敌人验证器
// ============================================

export class EnemyValidator {
  validate(enemy: Enemy): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // 必填字段
    if (!enemy.id) errors.push({ field: 'id', message: '敌人 ID 不能为空' });
    if (!enemy.name) errors.push({ field: 'name', message: '敌人名称不能为空' });
    if (!enemy.type) errors.push({ field: 'type', message: '敌人类型不能为空' });

    // 等级范围
    if (enemy.level < 1 || enemy.level > GAME_RULES.player.maxLevel) {
      errors.push({
        field: 'level',
        message: `敌人等级应在 1-${GAME_RULES.player.maxLevel} 之间`
      });
    }

    // 属性范围验证
    const stats = enemy.stats;
    this.validateStatRange(errors, 'health', stats.health, 10, 999999);
    this.validateStatRange(errors, 'attack', stats.attack, 1, 9999);
    this.validateStatRange(errors, 'defense', stats.defense, 0, 9999);
    this.validateStatRange(errors, 'speed', stats.speed, 1, 999);
    
    if (stats.critRate < 0 || stats.critRate > GAME_RULES.combat.critRateCap) {
      errors.push({
        field: 'stats.critRate',
        message: `暴击率应在 0-${GAME_RULES.combat.critRateCap}% 之间`
      });
    }

    if (stats.critDamage < 100 || stats.critDamage > 500) {
      errors.push({
        field: 'stats.critDamage',
        message: '暴击伤害应在 100%-500% 之间'
      });
    }

    // 掉落概率验证
    enemy.drops.forEach((drop, idx) => {
      if (drop.rate < 0 || drop.rate > 100) {
        errors.push({
          field: `drops[${idx}].rate`,
          message: '掉落概率应在 0-100% 之间'
        });
      }
      if (drop.minAmount < 1 || drop.maxAmount < drop.minAmount) {
        errors.push({
          field: `drops[${idx}].amount`,
          message: '掉落数量无效'
        });
      }
    });

    return { valid: errors.length === 0, errors };
  }

  private validateStatRange(
    errors: Array<{ field: string; message: string }>,
    field: string,
    value: number,
    min: number,
    max: number
  ): void {
    if (value < min || value > max) {
      errors.push({
        field: `stats.${field}`,
        message: `${field} 应在 ${min}-${max} 之间`
      });
    }
  }
}

// ============================================
// 事件验证器
// ============================================

export class EventValidator {
  private existingEvents: Map<string, GameEvent> = new Map();

  setExistingEvents(events: GameEvent[]): void {
    this.existingEvents.clear();
    events.forEach(e => this.existingEvents.set(e.id, e));
  }

  validate(event: GameEvent): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // 必填字段
    if (!event.id) errors.push({ field: 'id', message: '事件 ID 不能为空' });
    if (!event.title) errors.push({ field: 'title', message: '事件标题不能为空' });
    if (!event.type) errors.push({ field: 'type', message: '事件类型不能为空' });

    // 严重程度范围
    if (event.severity < 1 || event.severity > 10) {
      errors.push({
        field: 'severity',
        message: '事件严重程度应在 1-10 之间'
      });
    }

    // 至少需要一个选项
    if (!event.choices || event.choices.length === 0) {
      errors.push({
        field: 'choices',
        message: '事件至少需要一个选项'
      });
    }

    // 选项必须有结果
    event.choices.forEach((choice, idx) => {
      if (!choice.outcomes || choice.outcomes.length === 0) {
        errors.push({
          field: `choices[${idx}].outcomes`,
          message: '每个选项至少需要一个结果'
        });
      }
    });

    // 互斥事件存在性
    event.exclusiveWith?.forEach(exclusiveId => {
      if (!this.existingEvents.has(exclusiveId)) {
        errors.push({
          field: 'exclusiveWith',
          message: `互斥事件 ${exclusiveId} 不存在`
        });
      }
    });

    return { valid: errors.length === 0, errors };
  }
}

// ============================================
// 统一验证入口
// ============================================

export class GameValidator {
  quest = new QuestValidator();
  npc = new NPCValidator();
  item = new ItemValidator();
  enemy = new EnemyValidator();
  event = new EventValidator();

  validateQuest(quest: Quest, playerLevel?: number): ValidationResult {
    return this.quest.validate(quest, playerLevel);
  }

  validateNPC(npc: NPC): ValidationResult {
    return this.npc.validate(npc);
  }

  validateItem(item: Item): ValidationResult {
    return this.item.validate(item);
  }

  validateEnemy(enemy: Enemy): ValidationResult {
    return this.enemy.validate(enemy);
  }

  validateEvent(event: GameEvent): ValidationResult {
    return this.event.validate(event);
  }
}

export const gameValidator = new GameValidator();
