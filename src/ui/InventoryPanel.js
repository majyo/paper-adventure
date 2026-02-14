// -*- coding: utf-8 -*-
/**
 * InventoryPanel — 背包面板
 * 侧边栏显示物品列表，可使用消耗品
 */
export class InventoryPanel {
  constructor(container) {
    this.container = container;
    this.container.classList.add('inventory-panel');
    this._onUseItem = null;

    const header = document.createElement('div');
    header.classList.add('inventory-header');
    header.textContent = '🎒 背包';
    this.container.appendChild(header);

    this._listEl = document.createElement('div');
    this._listEl.classList.add('inventory-list');
    this.container.appendChild(this._listEl);
  }

  /**
   * 设置使用物品回调
   * @param {Function} callback (itemId) => void
   */
  setUseItemCallback(callback) {
    this._onUseItem = callback;
  }

  /**
   * 更新背包显示
   * @param {Array} items 物品详情数组
   */
  update(items) {
    this._listEl.innerHTML = '';

    if (!items || items.length === 0) {
      const empty = document.createElement('div');
      empty.classList.add('inventory-empty');
      empty.textContent = '背包空空如也...';
      this._listEl.appendChild(empty);
      return;
    }

    for (const item of items) {
      const row = document.createElement('div');
      row.classList.add('inventory-item');

      const name = document.createElement('span');
      name.classList.add('item-name');
      name.textContent = item.name;
      name.title = item.description || '';

      row.appendChild(name);

      if (item.consumable) {
        const useBtn = document.createElement('button');
        useBtn.classList.add('item-use-btn');
        useBtn.textContent = '使用';
        useBtn.addEventListener('click', () => {
          if (this._onUseItem) {
            this._onUseItem(item.id);
          }
        });
        row.appendChild(useBtn);
      }

      this._listEl.appendChild(row);
    }
  }
}
