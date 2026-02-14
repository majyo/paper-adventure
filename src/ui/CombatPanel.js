// -*- coding: utf-8 -*-
/**
 * CombatPanel — 战斗界面
 * 显示敌人状态 + 行动按钮
 */
export class CombatPanel {
  constructor(container) {
    this.container = container;
    this.container.classList.add('combat-panel', 'hidden');
    this._onAttack = null;
    this._onFlee = null;
    this._onUseItem = null;
  }

  setCallbacks({ onAttack, onFlee, onUseItem }) {
    this._onAttack = onAttack;
    this._onFlee = onFlee;
    this._onUseItem = onUseItem;
  }

  /**
   * 显示战斗界面
   * @param {object} data { enemies, player, consumables }
   */
  show(data) {
    this.container.classList.remove('hidden');
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.classList.add('combat-header');
    header.textContent = '⚔️ 战斗中';
    this.container.appendChild(header);

    // 敌人列表
    const enemiesList = document.createElement('div');
    enemiesList.classList.add('enemies-list');

    for (const enemy of data.enemies) {
      const row = document.createElement('div');
      row.classList.add('enemy-row');
      if (enemy.currentHp <= 0) {
        row.classList.add('enemy-dead');
      }

      const name = document.createElement('span');
      name.classList.add('enemy-name');
      name.textContent = enemy.name;

      const hpBar = document.createElement('div');
      hpBar.classList.add('enemy-hp-bar');

      const hpFill = document.createElement('div');
      hpFill.classList.add('enemy-hp-fill');
      const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
      hpFill.style.width = `${hpPercent}%`;

      const hpText = document.createElement('span');
      hpText.classList.add('enemy-hp-text');
      hpText.textContent = `${Math.max(0, enemy.currentHp)}/${enemy.maxHp}`;

      hpBar.appendChild(hpFill);
      hpBar.appendChild(hpText);
      row.appendChild(name);
      row.appendChild(hpBar);
      enemiesList.appendChild(row);
    }

    this.container.appendChild(enemiesList);

    // 行动按钮
    const actions = document.createElement('div');
    actions.classList.add('combat-actions');

    // 攻击按钮
    const attackBtn = document.createElement('button');
    attackBtn.classList.add('combat-btn');
    attackBtn.textContent = '🗡️ 攻击';
    attackBtn.addEventListener('click', () => {
      if (this._onAttack) {
        this._onAttack(0, 0);
      }
    });
    actions.appendChild(attackBtn);

    // 使用物品按钮 (如果有消耗品)
    if (data.consumables && data.consumables.length > 0) {
      for (const item of data.consumables) {
        const itemBtn = document.createElement('button');
        itemBtn.classList.add('combat-btn', 'item-btn');
        itemBtn.textContent = `🧪 ${item.name}`;
        itemBtn.addEventListener('click', () => {
          if (this._onUseItem) {
            this._onUseItem(item.id);
          }
        });
        actions.appendChild(itemBtn);
      }
    }

    // 逃跑按钮
    const fleeBtn = document.createElement('button');
    fleeBtn.classList.add('combat-btn', 'flee-btn');
    fleeBtn.textContent = '🏃 逃跑';
    fleeBtn.addEventListener('click', () => {
      if (this._onFlee) {
        this._onFlee();
      }
    });
    actions.appendChild(fleeBtn);

    this.container.appendChild(actions);
  }

  /**
   * 隐藏战斗面板
   */
  hide() {
    this.container.classList.add('hidden');
    this.container.innerHTML = '';
  }
}
