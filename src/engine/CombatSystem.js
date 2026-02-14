// -*- coding: utf-8 -*-
/**
 * CombatSystem — 回合制战斗系统
 * 先攻骰、攻击判定、伤害计算、战斗结束判定
 */
export class CombatSystem {
  constructor(diceSystem, skillCheck, eventBus) {
    this.dice = diceSystem;
    this.skillCheck = skillCheck;
    this.eventBus = eventBus;
    this.active = false;
    this.enemies = [];
    this.player = null;
    this.turnOrder = [];   // 行动顺序
    this.currentTurn = 0;
    this.enemyDefs = {};   // 敌人定义表 (来自 enemies.json)
  }

  /**
   * 加载敌人定义
   * @param {object} enemiesData enemies.json 数据
   */
  loadEnemies(enemiesData) {
    this.enemyDefs = enemiesData;
  }

  /**
   * 开始战斗
   * @param {object} player 玩家对象
   * @param {string[]} enemyIds 敌人 ID 列表
   */
  startCombat(player, enemyIds) {
    this.player = player;
    this.active = true;

    // 实例化敌人 (深拷贝，避免修改原始数据)
    this.enemies = enemyIds.map((id, index) => {
      const def = this.enemyDefs[id];
      if (!def) {
        throw new Error(`未知敌人: ${id}`);
      }
      return {
        ...JSON.parse(JSON.stringify(def)),
        instanceId: `${id}_${index}`,
        currentHp: def.hp
      };
    });

    // 先攻骰
    this.turnOrder = this._rollInitiative();

    this.eventBus.emit('combat:start', {
      enemies: this.enemies.map(e => this._enemyStatus(e)),
      turnOrder: this.turnOrder.map(t => t.name)
    });

    this.eventBus.emit('log:message', {
      type: 'combat',
      text: `⚔️ 战斗开始！`
    });

    for (const t of this.turnOrder) {
      this.eventBus.emit('log:message', {
        type: 'combat',
        text: `先攻: ${t.name} → ${t.initiative}`
      });
    }

    this.currentTurn = 0;
    this._nextTurn();
  }

  /**
   * 投掷先攻
   * @returns {Array} 按先攻值排序的行动列表
   */
  _rollInitiative() {
    const combatants = [];

    // 玩家先攻
    const playerDexMod = this.skillCheck.getModifier(this.player.stats.dexterity);
    const playerInit = this.dice.rollDie(20) + playerDexMod;
    combatants.push({
      type: 'player',
      name: this.player.name,
      initiative: playerInit,
      ref: this.player
    });

    // 敌人先攻
    for (const enemy of this.enemies) {
      const dexMod = this.skillCheck.getModifier(enemy.stats.dexterity);
      const init = this.dice.rollDie(20) + dexMod;
      combatants.push({
        type: 'enemy',
        name: enemy.name,
        initiative: init,
        ref: enemy
      });
    }

    // 按先攻值降序排列
    combatants.sort((a, b) => b.initiative - a.initiative);
    return combatants;
  }

  /**
   * 推进到下一个回合
   */
  _nextTurn() {
    if (!this.active) {
      return;
    }

    // 跳过已死亡的单位
    while (this.currentTurn < this.turnOrder.length) {
      const current = this.turnOrder[this.currentTurn];
      if (current.type === 'enemy' && current.ref.currentHp <= 0) {
        this.currentTurn++;
        continue;
      }
      break;
    }

    // 一轮结束，重新开始
    if (this.currentTurn >= this.turnOrder.length) {
      this.currentTurn = 0;
      this._nextTurn();
      return;
    }

    const current = this.turnOrder[this.currentTurn];

    if (current.type === 'player') {
      // 玩家回合，等待玩家操作
      this.eventBus.emit('combat:turn', {
        type: 'player',
        enemies: this.enemies.filter(e => e.currentHp > 0).map(e => this._enemyStatus(e)),
        player: this._playerStatus()
      });
    } else {
      // 敌人回合，自动行动
      this._enemyAction(current.ref);
    }
  }

  /**
   * 敌人自动行动
   * @param {object} enemy 敌人实例
   */
  _enemyAction(enemy) {
    // 随机选择一个攻击
    const attack = enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)];
    const attackRoll = this.dice.rollDie(20) + attack.toHit;
    const hit = attackRoll >= this.player.ac;

    if (hit) {
      const damageResult = this.dice.roll(attack.damage);
      this.player.hp = Math.max(0, this.player.hp - damageResult.total);

      this.eventBus.emit('log:message', {
        type: 'combat',
        text: `${enemy.name} 使用 ${attack.name}: 🎲 ${attackRoll} vs AC${this.player.ac} → 命中！造成 ${damageResult.total} 点伤害`
      });

      this.eventBus.emit('player:update', this.player);

      // 检查玩家是否死亡
      if (this.player.hp <= 0) {
        this._endCombat(false);
        return;
      }
    } else {
      this.eventBus.emit('log:message', {
        type: 'combat',
        text: `${enemy.name} 使用 ${attack.name}: 🎲 ${attackRoll} vs AC${this.player.ac} → 未命中`
      });
    }

    this.currentTurn++;
    this._nextTurn();
  }

  /**
   * 玩家攻击
   * @param {number} attackIndex 攻击方式索引
   * @param {number} targetIndex 目标敌人索引 (存活敌人中的索引)
   */
  playerAttack(attackIndex = 0, targetIndex = 0) {
    if (!this.active) {
      return;
    }

    const attack = this.player.attacks[attackIndex];
    if (!attack) {
      return;
    }

    const aliveEnemies = this.enemies.filter(e => e.currentHp > 0);
    const target = aliveEnemies[targetIndex];
    if (!target) {
      return;
    }

    // 攻击骰: d20 + 属性修正
    const statMod = attack.stat ? this.skillCheck.getModifier(this.player.stats[attack.stat]) : 0;
    const attackRoll = this.dice.rollDie(20) + statMod;
    const hit = attackRoll >= target.ac;

    if (hit) {
      const damageResult = this.dice.roll(attack.damage);
      target.currentHp = Math.max(0, target.currentHp - damageResult.total);

      this.eventBus.emit('log:message', {
        type: 'combat',
        text: `${this.player.name} 使用 ${attack.name}: 🎲 ${attackRoll} vs AC${target.ac} → 命中！造成 ${damageResult.total} 点伤害`
      });

      // 检查敌人是否死亡
      if (target.currentHp <= 0) {
        this.eventBus.emit('log:message', {
          type: 'combat',
          text: `💀 ${target.name} 被击败！`
        });
      }

      // 检查是否所有敌人都死亡
      if (this.enemies.every(e => e.currentHp <= 0)) {
        this._endCombat(true);
        return;
      }
    } else {
      this.eventBus.emit('log:message', {
        type: 'combat',
        text: `${this.player.name} 使用 ${attack.name}: 🎲 ${attackRoll} vs AC${target.ac} → 未命中`
      });
    }

    this.currentTurn++;
    this._nextTurn();
  }

  /**
   * 玩家尝试逃跑
   */
  playerFlee() {
    if (!this.active) {
      return;
    }

    // 敏捷检定 DC 10
    const dexMod = this.skillCheck.getModifier(this.player.stats.dexterity);
    const roll = this.dice.rollDie(20) + dexMod;
    const success = roll >= 10;

    if (success) {
      this.eventBus.emit('log:message', {
        type: 'combat',
        text: `🏃 逃跑成功！(🎲 ${roll} vs DC10)`
      });
      this.active = false;
      this.eventBus.emit('combat:end', { victory: false, fled: true });
    } else {
      this.eventBus.emit('log:message', {
        type: 'combat',
        text: `逃跑失败！(🎲 ${roll} vs DC10)`
      });
      this.currentTurn++;
      this._nextTurn();
    }
  }

  /**
   * 结束战斗
   * @param {boolean} victory 是否胜利
   */
  _endCombat(victory) {
    this.active = false;
    let totalXp = 0;

    if (victory) {
      totalXp = this.enemies.reduce((sum, e) => sum + (e.xp || 0), 0);
      this.eventBus.emit('log:message', {
        type: 'combat',
        text: `🏆 战斗胜利！获得 ${totalXp} XP`
      });
    } else {
      this.eventBus.emit('log:message', {
        type: 'combat',
        text: `💀 你被击败了...`
      });
    }

    this.eventBus.emit('combat:end', { victory, totalXp });
  }

  /**
   * 获取敌人状态摘要
   */
  _enemyStatus(enemy) {
    return {
      instanceId: enemy.instanceId,
      name: enemy.name,
      currentHp: enemy.currentHp,
      maxHp: enemy.hp,
      ac: enemy.ac
    };
  }

  /**
   * 获取玩家状态摘要
   */
  _playerStatus() {
    return {
      name: this.player.name,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      ac: this.player.ac
    };
  }
}
