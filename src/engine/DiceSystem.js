// -*- coding: utf-8 -*-
/**
 * DiceSystem — 骰子系统
 * 支持 d4~d100，解析 "2d6+3" 表达式
 */
export class DiceSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * 投掷单个骰子
   * @param {number} sides 面数
   * @returns {number}
   */
  rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * 解析并投掷骰子表达式，如 "2d6+3"
   * @param {string} expression 骰子表达式
   * @returns {{ rolls: number[], modifier: number, total: number, expression: string }}
   */
  roll(expression) {
    const match = expression.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
      throw new Error(`无效的骰子表达式: ${expression}`);
    }

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(this.rollDie(sides));
    }

    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + modifier;

    const result = { rolls, modifier, total, expression };

    this.eventBus.emit('dice:roll', result);

    return result;
  }

  /**
   * 投掷 d20
   * @returns {{ rolls: number[], modifier: number, total: number, expression: string }}
   */
  rollD20() {
    return this.roll('1d20');
  }
}
