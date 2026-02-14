// -*- coding: utf-8 -*-
/**
 * AIStoryManager — AI 故事管理器
 * 维护对话历史，通过 IPC 调用 AI API，处理 tool_calls 循环，
 * 解析叙事和选项，通过 EventBus 驱动 UI
 */
import { AI_TOOLS } from './ai-config.js';
import { AIToolExecutor } from './AIToolExecutor.js';

export class AIStoryManager {
  /**
   * @param {import('./GameEngine.js').GameEngine} engine
   */
  constructor(engine) {
    this.engine = engine;
    this.eventBus = engine.eventBus;
    this.toolExecutor = new AIToolExecutor(engine);
    this.conversationHistory = [];
    this.template = null;
    this._waitingForCombat = false;

    // 战斗结束后继续 AI 叙事
    this.eventBus.on('combat:end', (data) => this._onCombatEnd(data));
  }

  /**
   * 初始化 AI 故事
   * @param {object} template ai_story_template.json 数据
   */
  async init(template) {
    this.template = template;
    this.conversationHistory = [];

    const systemPrompt = this._buildSystemPrompt(template);
    this.conversationHistory.push({ role: 'system', content: systemPrompt });

    // 发送开场请求
    const openingMessage = template.opening_prompt || '开始冒险吧。';
    this.conversationHistory.push({ role: 'user', content: openingMessage });

    await this._sendToAI();
  }

  /**
   * 处理玩家选择（点击选项按钮）
   * @param {number} choiceIndex 选项索引
   * @param {string[]} currentChoices 当前可用选项文本列表
   */
  async handleChoice(choiceIndex, currentChoices) {
    if (!currentChoices || choiceIndex >= currentChoices.length) {
      return;
    }
    const choiceText = currentChoices[choiceIndex];
    await this.handleFreeInput(choiceText);
  }

  /**
   * 处理自由文本输入
   * @param {string} text 玩家输入
   */
  async handleFreeInput(text) {
    if (!text || !text.trim()) {
      return;
    }
    const trimmed = text.trim();
    this.conversationHistory.push({ role: 'user', content: trimmed });

    // 通知 UI 显示玩家输入
    this.eventBus.emit('ai:player-input', trimmed);

    await this._sendToAI();
  }

  /**
   * 构建 system prompt
   */
  _buildSystemPrompt(template) {
    const player = this.engine.player;
    const items = this.engine.adventureData.items;
    const enemies = this.engine.adventureData.enemies;

    return `你是一个奇幻文字冒险游戏的 AI 叙事者（Game Master）。

## 故事设定
- 标题: ${template.title}
- 背景: ${template.setting}
- 目标: ${template.goal}
- 基调: ${template.tone}

## NPC
${(template.npcs || []).map(n => `- ${n.name}: ${n.description} (性格: ${n.personality})`).join('\n')}

## 可用敌人
${(template.available_enemies || []).map(id => {
  const e = enemies[id];
  return e ? `- ${id}: ${e.name} (HP:${e.hp}, AC:${e.ac})` : `- ${id}`;
}).join('\n')}

## 可用物品
${(template.available_items || []).map(id => {
  const i = items[id];
  return i ? `- ${id}: ${i.name} — ${i.description}` : `- ${id}`;
}).join('\n')}

## 玩家初始状态
- 名称: ${player.name}
- 等级: ${player.level}
- HP: ${player.hp}/${player.maxHp}
- AC: ${player.ac}
- 属性: 力量${player.stats.strength} 敏捷${player.stats.dexterity} 体质${player.stats.constitution} 智力${player.stats.intelligence} 感知${player.stats.wisdom} 魅力${player.stats.charisma}
- 背包: ${(player.inventory || []).map(id => { const i = items[id]; return i ? i.name : id; }).join(', ') || '空'}

## 规则
${template.rules_notes || '使用 D&D 5e 风格规则。技能检定为 d20 + 属性修正值 vs DC。'}

## 工具使用
你可以通过 function calling 调用游戏引擎的能力。当叙事中需要进行技能检定、战斗、物品操作等机制时，请调用对应的工具，不要自行编造结果。

## 响应格式
你的每次文本响应必须是一个 JSON 对象，格式如下：
\`\`\`json
{
  "narrative": "叙事文本，描述场景、NPC 对话、事件结果等",
  "choices": ["选项1", "选项2", "选项3"]
}
\`\`\`
- narrative: 必须提供，是给玩家看的叙事文本
- choices: 提供 2-4 个选项供玩家选择。如果当前情境不适合提供选项（如等待自由输入），可以设为空数组 []
- 不要在 JSON 外添加任何额外文本`;
  }

  /**
   * 发送对话到 AI 并处理响应（含 tool_calls 循环）
   */
  async _sendToAI() {
    this.eventBus.emit('ai:loading', true);

    try {
      let continueLoop = true;

      while (continueLoop) {
        const response = await window.gameAPI.aiChat(
          this.conversationHistory,
          AI_TOOLS
        );

        if (!response || !response.choices || response.choices.length === 0) {
          throw new Error('AI 返回了空响应');
        }

        const message = response.choices[0].message;

        // 将 AI 响应加入对话历史
        this.conversationHistory.push(message);

        // 处理 tool_calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          let hasCombat = false;

          for (const toolCall of message.tool_calls) {
            const fnName = toolCall.function.name;
            let args = {};
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch (e) {
              // 参数解析失败
            }

            const result = this.toolExecutor.execute(fnName, args);

            // 将工具结果加入对话历史
            this.conversationHistory.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });

            // 如果触发了战斗，暂停 AI 循环
            if (fnName === 'start_combat') {
              hasCombat = true;
            }
          }

          if (hasCombat) {
            // 战斗接管，等待 combat:end 事件后再继续
            this._waitingForCombat = true;
            continueLoop = false;
          }
          // 否则继续循环，让 AI 根据工具结果继续生成
        } else {
          // 没有 tool_calls，这是最终文本响应
          continueLoop = false;
          this._handleTextResponse(message.content);
        }
      }
    } catch (err) {
      console.error('AI 请求失败:', err);
      this.eventBus.emit('ai:error', err.message || 'AI 请求失败');
    } finally {
      if (!this._waitingForCombat) {
        this.eventBus.emit('ai:loading', false);
      }
    }
  }

  /**
   * 解析 AI 文本响应，提取叙事和选项
   * @param {string} content AI 响应文本
   */
  _handleTextResponse(content) {
    let narrative = '';
    let choices = [];

    try {
      // 尝试从可能包含 markdown 代码块的响应中提取 JSON
      let jsonStr = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      narrative = parsed.narrative || '';
      choices = Array.isArray(parsed.choices) ? parsed.choices : [];
    } catch (e) {
      // JSON 解析失败，整段作为叙事
      narrative = content;
      choices = [];
    }

    this.eventBus.emit('ai:scene', { narrative, choices });
  }

  /**
   * 战斗结束回调 — 将结果注入对话历史并继续 AI 叙事
   * @param {object} data { victory, totalXp, fled }
   */
  async _onCombatEnd(data) {
    if (!this._waitingForCombat) {
      return;
    }
    this._waitingForCombat = false;

    let resultText;
    if (data.fled) {
      resultText = '玩家逃跑成功，脱离了战斗。';
    } else if (data.victory) {
      resultText = `玩家赢得了战斗！获得 ${data.totalXp} XP。当前 HP: ${this.engine.player.hp}/${this.engine.player.maxHp}`;
    } else {
      resultText = `玩家在战斗中被击败了。当前 HP: ${this.engine.player.hp}/${this.engine.player.maxHp}`;
    }

    // 以 user 消息注入战斗结果，让 AI 继续叙事
    this.conversationHistory.push({
      role: 'user',
      content: `[系统消息] 战斗结束: ${resultText}`,
    });

    await this._sendToAI();
  }
}
