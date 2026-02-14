// -*- coding: utf-8 -*-
/**
 * StatusBar — 角色状态栏
 * 显示 HP、属性、AC
 */
export class StatusBar {
  constructor(container) {
    this.container = container;
    this.container.classList.add('status-bar');
    this._build();
  }

  _build() {
    this.container.innerHTML = `
      <span class="player-name">冒险者</span>
      <div class="stat-group">
        <div class="stat">
          <span class="stat-label">HP</span>
          <div class="hp-bar-container">
            <div class="hp-bar" style="width: 100%"></div>
            <span class="hp-text">--/--</span>
          </div>
        </div>
        <div class="stat">
          <span class="stat-label">AC</span>
          <span class="stat-value ac-value">--</span>
        </div>
        <div class="stat">
          <span class="stat-label">LV</span>
          <span class="stat-value level-value">--</span>
        </div>
      </div>
      <div class="stat-group stats-detail">
        <div class="stat"><span class="stat-label">力</span><span class="stat-value str-value">--</span></div>
        <div class="stat"><span class="stat-label">敏</span><span class="stat-value dex-value">--</span></div>
        <div class="stat"><span class="stat-label">体</span><span class="stat-value con-value">--</span></div>
        <div class="stat"><span class="stat-label">智</span><span class="stat-value int-value">--</span></div>
        <div class="stat"><span class="stat-label">感</span><span class="stat-value wis-value">--</span></div>
        <div class="stat"><span class="stat-label">魅</span><span class="stat-value cha-value">--</span></div>
      </div>
    `;
  }

  /**
   * 更新玩家状态
   * @param {object} player 玩家对象
   */
  update(player) {
    this.container.querySelector('.player-name').textContent = player.name;

    const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    this.container.querySelector('.hp-bar').style.width = `${hpPercent}%`;
    this.container.querySelector('.hp-text').textContent = `${player.hp}/${player.maxHp}`;
    this.container.querySelector('.ac-value').textContent = player.ac;
    this.container.querySelector('.level-value').textContent = player.level;

    if (player.stats) {
      this.container.querySelector('.str-value').textContent = player.stats.strength;
      this.container.querySelector('.dex-value').textContent = player.stats.dexterity;
      this.container.querySelector('.con-value').textContent = player.stats.constitution;
      this.container.querySelector('.int-value').textContent = player.stats.intelligence;
      this.container.querySelector('.wis-value').textContent = player.stats.wisdom;
      this.container.querySelector('.cha-value').textContent = player.stats.charisma;
    }
  }
}
