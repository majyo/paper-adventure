// -*- coding: utf-8 -*-
/**
 * InventorySystem — 背包管理系统
 * 添加/移除/使用物品，查询物品
 */
export class InventorySystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.items = {};       // 物品定义表 (来自 items.json)
    this.inventory = [];   // 玩家当前背包 (物品 ID 列表)
  }

  /**
   * 加载物品定义
   * @param {object} itemsData items.json 数据
   */
  loadItems(itemsData) {
    this.items = itemsData;
  }

  /**
   * 设置初始背包
   * @param {string[]} itemIds 物品 ID 列表
   */
  setInventory(itemIds) {
    this.inventory = [...itemIds];
    this.eventBus.emit('inventory:update', this.getInventoryDetails());
  }

  /**
   * 添加物品
   * @param {string} itemId 物品 ID
   */
  addItem(itemId) {
    this.inventory.push(itemId);
    const item = this.items[itemId];
    this.eventBus.emit('log:message', {
      type: 'inventory',
      text: `获得物品: ${item ? item.name : itemId}`
    });
    this.eventBus.emit('inventory:update', this.getInventoryDetails());
  }

  /**
   * 移除物品
   * @param {string} itemId 物品 ID
   * @returns {boolean} 是否成功移除
   */
  removeItem(itemId) {
    const idx = this.inventory.indexOf(itemId);
    if (idx === -1) {
      return false;
    }
    this.inventory.splice(idx, 1);
    this.eventBus.emit('inventory:update', this.getInventoryDetails());
    return true;
  }

  /**
   * 检查是否拥有某物品
   * @param {string} itemId 物品 ID
   * @returns {boolean}
   */
  hasItem(itemId) {
    return this.inventory.includes(itemId);
  }

  /**
   * 使用物品 (消耗品)
   * @param {string} itemId 物品 ID
   * @param {object} player 玩家对象
   * @returns {{ used: boolean, effect: object|null }}
   */
  useItem(itemId, player) {
    const item = this.items[itemId];
    if (!item || !item.consumable) {
      return { used: false, effect: null };
    }

    if (!this.hasItem(itemId)) {
      return { used: false, effect: null };
    }

    this.removeItem(itemId);

    let effect = null;
    if (item.effect) {
      effect = { ...item.effect };
      if (item.effect.heal) {
        const oldHp = player.hp;
        player.hp = Math.min(player.hp + item.effect.heal, player.maxHp);
        effect.actualHeal = player.hp - oldHp;
        this.eventBus.emit('log:message', {
          type: 'item_use',
          text: `使用 ${item.name}: 恢复 ${effect.actualHeal} HP`
        });
        this.eventBus.emit('player:update', player);
      }
    }

    return { used: true, effect };
  }

  /**
   * 获取背包中所有物品的详细信息
   * @returns {object[]}
   */
  getInventoryDetails() {
    return this.inventory.map(id => ({
      id,
      ...(this.items[id] || { name: id, description: '未知物品' })
    }));
  }

  /**
   * 获取可使用的消耗品列表
   * @returns {object[]}
   */
  getConsumables() {
    return this.getInventoryDetails().filter(item => item.consumable);
  }
}
