// -*- coding: utf-8 -*-
/**
 * AI 配置说明
 * API 密钥等敏感配置存放在 data/ai-config.json（已被 .gitignore 排除）
 * 可参考 data/ai-config.example.json 了解配置格式
 */

/**
 * AI 可调用的工具定义（OpenAI function calling 格式）
 */
export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'skill_check',
      description: '执行技能检定。投掷 d20 + 属性修正值，与难度等级(DC)比较。',
      parameters: {
        type: 'object',
        properties: {
          skill: {
            type: 'string',
            enum: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
            description: '要检定的属性名',
          },
          dc: {
            type: 'number',
            description: '难度等级 (Difficulty Class)',
          },
        },
        required: ['skill', 'dc'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_combat',
      description: '发起战斗。传入敌人 ID 列表，战斗系统将接管。',
      parameters: {
        type: 'object',
        properties: {
          enemy_ids: {
            type: 'array',
            items: { type: 'string' },
            description: '敌人 ID 列表',
          },
        },
        required: ['enemy_ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_item',
      description: '给玩家添加物品到背包。',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string', description: '物品 ID' },
        },
        required: ['item_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_item',
      description: '从玩家背包移除物品。',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string', description: '物品 ID' },
        },
        required: ['item_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deal_damage',
      description: '对玩家造成伤害。',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: '伤害值' },
        },
        required: ['amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'heal_player',
      description: '治疗玩家，恢复生命值。',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: '治疗量' },
        },
        required: ['amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'roll_dice',
      description: '投掷骰子，支持 "2d6+3" 格式的表达式。',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: '骰子表达式，如 "1d20", "2d6+3"' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_flag',
      description: '设置游戏状态标记，用于追踪剧情进展。',
      parameters: {
        type: 'object',
        properties: {
          flag_name: { type: 'string', description: '标记名称' },
        },
        required: ['flag_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_flag',
      description: '检查某个游戏标记是否已设置。',
      parameters: {
        type: 'object',
        properties: {
          flag_name: { type: 'string', description: '标记名称' },
        },
        required: ['flag_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_inventory',
      description: '检查玩家是否拥有某物品。',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string', description: '物品 ID' },
        },
        required: ['item_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_player_status',
      description: '获取玩家当前状态（HP、属性、背包等）。',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];
