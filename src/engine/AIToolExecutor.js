// -*- coding: utf-8 -*-
/**
 * AIToolExecutor — AI 工具调用执行器
 * 将 AI 的 function call 映射到引擎子系统操作
 */
export class AIToolExecutor {
  /**
   * @param {import('./GameEngine.js').GameEngine} engine
   */
  constructor(engine) {
    this.engine = engine;
  }

  /**
   * 执行工具调用
   * @param {string} toolName 工具名称
   * @param {object} args 参数
   * @returns {object} 执行结果
   */
  execute(toolName, args) {
    const handler = this._handlers[toolName];
    if (!handler) {
      return { error: `未知工具: ${toolName}` };
    }
    try {
      return handler.call(this, args);
    } catch (err) {
      return { error: err.message };
    }
  }

  get _handlers() {
    return {
      skill_check: (args) => this._skillCheck(args),
      start_combat: (args) => this._startCombat(args),
      add_item: (args) => this._addItem(args),
      remove_item: (args) => this._removeItem(args),
      deal_damage: (args) => this._dealDamage(args),
      heal_player: (args) => this._healPlayer(args),
      roll_dice: (args) => this._rollDice(args),
      set_flag: (args) => this._setFlag(args),
      check_flag: (args) => this._checkFlag(args),
      check_inventory: (args) => this._checkInventory(args),
      get_player_status: () => this._getPlayerStatus(),
    };
  }

  _skillCheck({ skill, dc }) {
    const result = this.engine.skillCheck.check(this.engine.player, skill, dc);
    return {
      success: result.success,
      roll: result.roll,
      modifier: result.modifier,
      total: result.total,
      dc: result.dc,
      skill: result.stat,
    };
  }

  _startCombat({ enemy_ids }) {
    // 战斗是异步流程，标记引擎进入战斗状态
    this.engine._inCombat = true;
    this.engine.combat.startCombat(this.engine.player, enemy_ids);
    return { started: true, enemies: enemy_ids };
  }

  _addItem({ item_id }) {
    this.engine.inventory.addItem(item_id);
    return { added: true, item_id };
  }

  _removeItem({ item_id }) {
    const removed = this.engine.inventory.removeItem(item_id);
    return { removed, item_id };
  }

  _dealDamage({ amount }) {
    const oldHp = this.engine.player.hp;
    this.engine.player.hp = Math.max(0, this.engine.player.hp - amount);
    this.engine.eventBus.emit('player:update', this.engine.player);
    this.engine.eventBus.emit('log:message', {
      type: 'combat',
      text: `💥 受到 ${amount} 点伤害`,
    });
    return {
      damage: amount,
      hp_before: oldHp,
      hp_after: this.engine.player.hp,
    };
  }

  _healPlayer({ amount }) {
    const oldHp = this.engine.player.hp;
    this.engine.player.hp = Math.min(
      this.engine.player.hp + amount,
      this.engine.player.maxHp
    );
    this.engine.eventBus.emit('player:update', this.engine.player);
    this.engine.eventBus.emit('log:message', {
      type: 'item_use',
      text: `💚 恢复 ${this.engine.player.hp - oldHp} HP`,
    });
    return {
      healed: this.engine.player.hp - oldHp,
      hp_before: oldHp,
      hp_after: this.engine.player.hp,
    };
  }

  _rollDice({ expression }) {
    const result = this.engine.dice.roll(expression);
    return {
      expression: result.expression,
      rolls: result.rolls,
      modifier: result.modifier,
      total: result.total,
    };
  }

  _setFlag({ flag_name }) {
    this.engine.sceneManager.flags.add(flag_name);
    return { set: true, flag_name };
  }

  _checkFlag({ flag_name }) {
    const has = this.engine.sceneManager.flags.has(flag_name);
    return { flag_name, has_flag: has };
  }

  _checkInventory({ item_id }) {
    const has = this.engine.inventory.hasItem(item_id);
    return { item_id, has_item: has };
  }

  _getPlayerStatus() {
    const p = this.engine.player;
    return {
      name: p.name,
      level: p.level,
      hp: p.hp,
      maxHp: p.maxHp,
      ac: p.ac,
      stats: { ...p.stats },
      inventory: this.engine.inventory.inventory.slice(),
    };
  }
}
