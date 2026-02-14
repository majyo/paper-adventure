// -*- coding: utf-8 -*-
/**
 * SkillCheck — 技能检定系统
 * d20 + 属性修正值 vs DC
 */
export class SkillCheck {
  constructor(diceSystem, eventBus) {
    this.dice = diceSystem;
    this.eventBus = eventBus;
  }

  /**
   * 计算属性修正值
   * @param {number} statValue 属性值
   * @returns {number}
   */
  getModifier(statValue) {
    return Math.floor((statValue - 10) / 2);
  }

  /**
   * 执行技能检定
   * @param {object} player 玩家对象
   * @param {string} stat 属性名 (strength, dexterity, etc.)
   * @param {number} dc 难度等级
   * @returns {{ success: boolean, roll: number, modifier: number, total: number, dc: number, stat: string }}
   */
  check(player, stat, dc) {
    const statValue = player.stats[stat];
    if (statValue === undefined) {
      throw new Error(`未知属性: ${stat}`);
    }

    const modifier = this.getModifier(statValue);
    const diceResult = this.dice.rollD20();
    const roll = diceResult.total;
    const total = roll + modifier;
    const success = total >= dc;

    const result = { success, roll, modifier, total, dc, stat };

    this.eventBus.emit('log:message', {
      type: 'skill_check',
      text: `技能检定 [${stat}]: 🎲 ${roll} + ${modifier}(修正) = ${total} vs DC${dc} → ${success ? '✓ 成功' : '✗ 失败'}`
    });

    return result;
  }
}
