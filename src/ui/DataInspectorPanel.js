// -*- coding: utf-8 -*-
/**
 * DataInspectorPanel — 数据检视器
 * 全屏 overlay 面板，展示所有游戏运行时数据，用于开发调试
 */
export class DataInspectorPanel {
  constructor(engine) {
    this.engine = engine;
    this.visible = false;
    this.currentTab = 'player';
    this._buildOverlay();
  }

  /**
   * 构建 overlay DOM 结构
   */
  _buildOverlay() {
    // overlay 背景
    this.overlay = document.createElement('div');
    this.overlay.classList.add('data-inspector-overlay', 'hidden');

    // 点击背景关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // 面板主体
    const panel = document.createElement('div');
    panel.classList.add('data-inspector-panel');

    // 头部
    const header = document.createElement('div');
    header.classList.add('di-header');
    header.innerHTML = '<span class="di-title">数据检视器</span>';

    const closeBtn = document.createElement('button');
    closeBtn.classList.add('di-close-btn');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // 标签导航
    const tabs = document.createElement('div');
    tabs.classList.add('di-tabs');
    this._tabDefs = [
      { key: 'player', label: '玩家状态' },
      { key: 'enemies', label: '敌人图鉴' },
      { key: 'items', label: '物品图鉴' },
      { key: 'scenes', label: '场景总览' },
      { key: 'flags', label: '游戏标记' },
      { key: 'ai', label: 'AI 对话' },
    ];
    this._tabButtons = {};
    for (const def of this._tabDefs) {
      const btn = document.createElement('button');
      btn.classList.add('di-tab');
      btn.textContent = def.label;
      btn.dataset.tab = def.key;
      btn.addEventListener('click', () => this._switchTab(def.key));
      tabs.appendChild(btn);
      this._tabButtons[def.key] = btn;
    }
    panel.appendChild(tabs);

    // 内容区
    this._contentEl = document.createElement('div');
    this._contentEl.classList.add('di-content');
    panel.appendChild(this._contentEl);

    this.overlay.appendChild(panel);
    document.getElementById('app').appendChild(this.overlay);

    // ESC 关闭
    this._onKeyDown = (e) => {
      if (e.key === 'Escape' && this.visible) {
        this.hide();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
  }

  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.visible = true;
    this.overlay.classList.remove('hidden');
    this._switchTab(this.currentTab);
  }

  hide() {
    this.visible = false;
    this.overlay.classList.add('hidden');
  }

  /**
   * 切换标签页
   */
  _switchTab(tabName) {
    this.currentTab = tabName;

    // 更新标签激活状态
    for (const [key, btn] of Object.entries(this._tabButtons)) {
      btn.classList.toggle('active', key === tabName);
    }

    // 渲染对应内容
    const renderers = {
      player: () => this._renderPlayer(),
      enemies: () => this._renderEnemies(),
      items: () => this._renderItems(),
      scenes: () => this._renderScenes(),
      flags: () => this._renderFlags(),
      ai: () => this._renderAI(),
    };

    this._contentEl.innerHTML = '';
    const renderer = renderers[tabName];
    if (renderer) {
      renderer();
    }
  }

  // ─── 玩家状态 ───

  _renderPlayer() {
    const player = this.engine.player;
    if (!player) {
      this._contentEl.innerHTML = '<p class="di-empty">尚未开始游戏</p>';
      return;
    }

    let html = '<h3 class="di-section-title">基本信息</h3>';
    html += '<table class="di-table"><tbody>';
    html += this._row('名称', player.name);
    html += this._row('等级', player.level);
    html += this._row('HP', `${player.hp} / ${player.maxHp}`);
    html += this._row('AC', player.ac);
    html += '</tbody></table>';

    if (player.stats) {
      html += '<h3 class="di-section-title">属性</h3>';
      html += '<table class="di-table"><tbody>';
      html += this._row('力量 (STR)', player.stats.strength);
      html += this._row('敏捷 (DEX)', player.stats.dexterity);
      html += this._row('体质 (CON)', player.stats.constitution);
      html += this._row('智力 (INT)', player.stats.intelligence);
      html += this._row('感知 (WIS)', player.stats.wisdom);
      html += this._row('魅力 (CHA)', player.stats.charisma);
      html += '</tbody></table>';
    }

    if (player.attacks && player.attacks.length > 0) {
      html += '<h3 class="di-section-title">攻击方式</h3>';
      html += '<table class="di-table"><thead><tr><th>名称</th><th>骰子</th><th>类型</th></tr></thead><tbody>';
      for (const atk of player.attacks) {
        html += `<tr><td>${this._esc(atk.name)}</td><td>${this._esc(atk.damage)}</td><td>${this._esc(atk.type || '-')}</td></tr>`;
      }
      html += '</tbody></table>';
    }

    // 背包
    const invDetails = this.engine.inventory.getInventoryDetails();
    html += '<h3 class="di-section-title">背包</h3>';
    if (invDetails.length === 0) {
      html += '<p class="di-empty">背包为空</p>';
    } else {
      html += '<table class="di-table"><thead><tr><th>物品</th><th>类型</th><th>描述</th></tr></thead><tbody>';
      for (const item of invDetails) {
        const badge = item.type ? `<span class="di-badge di-badge-${item.type}">${item.type}</span>` : '';
        html += `<tr><td>${this._esc(item.name)} ${badge}</td><td>${item.consumable ? '消耗品' : '装备'}</td><td>${this._esc(item.description || '-')}</td></tr>`;
      }
      html += '</tbody></table>';
    }

    this._contentEl.innerHTML = html;
  }

  // ─── 敌人图鉴 ───

  _renderEnemies() {
    const defs = this.engine.combat.enemyDefs;
    const keys = Object.keys(defs);

    if (keys.length === 0) {
      this._contentEl.innerHTML = '<p class="di-empty">无敌人定义</p>';
      return;
    }

    // 战斗中的敌人
    const activeEnemies = this.engine.combat.enemies || [];
    let html = '';

    if (activeEnemies.length > 0) {
      html += '<h3 class="di-section-title">当前战斗中</h3>';
      html += '<table class="di-table"><thead><tr><th>名称</th><th>HP</th><th>AC</th></tr></thead><tbody>';
      for (const e of activeEnemies) {
        html += `<tr><td>${this._esc(e.name)}</td><td>${e.currentHp} / ${e.hp}</td><td>${e.ac}</td></tr>`;
      }
      html += '</tbody></table>';
    }

    html += '<h3 class="di-section-title">全部敌人定义</h3>';
    html += '<table class="di-table"><thead><tr><th>ID</th><th>名称</th><th>HP</th><th>AC</th><th>XP</th><th>攻击</th></tr></thead><tbody>';
    for (const id of keys) {
      const e = defs[id];
      const attacks = (e.attacks || []).map(a => a.name).join(', ');
      html += `<tr><td>${this._esc(id)}</td><td>${this._esc(e.name)}</td><td>${e.hp}</td><td>${e.ac}</td><td>${e.xp || 0}</td><td>${this._esc(attacks || '-')}</td></tr>`;
    }
    html += '</tbody></table>';

    this._contentEl.innerHTML = html;
  }

  // ─── 物品图鉴 ───

  _renderItems() {
    const items = this.engine.inventory.items;
    const keys = Object.keys(items);

    if (keys.length === 0) {
      this._contentEl.innerHTML = '<p class="di-empty">无物品定义</p>';
      return;
    }

    let html = '<table class="di-table"><thead><tr><th>ID</th><th>名称</th><th>类型</th><th>消耗品</th><th>效果</th><th>描述</th></tr></thead><tbody>';
    for (const id of keys) {
      const item = items[id];
      const badge = item.type ? `<span class="di-badge di-badge-${item.type}">${item.type}</span>` : '-';
      const effect = item.effect ? JSON.stringify(item.effect) : '-';
      html += `<tr><td>${this._esc(id)}</td><td>${this._esc(item.name)}</td><td>${badge}</td><td>${item.consumable ? '是' : '否'}</td><td>${this._esc(effect)}</td><td>${this._esc(item.description || '-')}</td></tr>`;
    }
    html += '</tbody></table>';

    this._contentEl.innerHTML = html;
  }

  // ─── 场景总览 ───

  _renderScenes() {
    const scenes = this.engine.sceneManager.scenes;
    const currentScene = this.engine.sceneManager.currentScene;
    const keys = Object.keys(scenes);

    if (keys.length === 0) {
      this._contentEl.innerHTML = '<p class="di-empty">无场景数据</p>';
      return;
    }

    let html = '<table class="di-table"><thead><tr><th>ID</th><th>标题</th><th>选项数</th><th>战斗</th><th>结局</th></tr></thead><tbody>';
    for (const id of keys) {
      const s = scenes[id];
      const isCurrent = currentScene === s;
      const rowClass = isCurrent ? ' class="di-current-scene"' : '';
      const choiceCount = s.choices ? s.choices.length : 0;
      const hasCombat = s.combat ? '⚔️' : '';
      const isEnding = s.gameOver ? (s.victory ? '🏆' : '💀') : '';
      html += `<tr${rowClass}><td>${this._esc(id)}</td><td>${this._esc(s.title || '-')}</td><td>${choiceCount}</td><td>${hasCombat}</td><td>${isEnding}</td></tr>`;
    }
    html += '</tbody></table>';

    // 当前场景详情
    if (currentScene) {
      const currentId = keys.find(k => scenes[k] === currentScene) || '?';
      html += '<h3 class="di-section-title">当前场景详情</h3>';
      html += '<table class="di-table"><tbody>';
      html += this._row('ID', currentId);
      html += this._row('标题', currentScene.title);
      html += this._row('文本', currentScene.text);
      if (currentScene.choices) {
        html += this._row('选项', currentScene.choices.map((c, i) => `${i}: ${c.text}`).join('\n'));
      }
      if (currentScene.combat) {
        html += this._row('战斗', JSON.stringify(currentScene.combat));
      }
      html += '</tbody></table>';
    }

    this._contentEl.innerHTML = html;
  }

  // ─── 游戏标记 ───

  _renderFlags() {
    const flags = this.engine.sceneManager.flags;

    if (!flags || flags.size === 0) {
      this._contentEl.innerHTML = '<p class="di-empty">暂无标记</p>';
      return;
    }

    let html = '<table class="di-table"><thead><tr><th>#</th><th>标记名称</th></tr></thead><tbody>';
    let i = 1;
    for (const flag of flags) {
      html += `<tr><td>${i++}</td><td>${this._esc(flag)}</td></tr>`;
    }
    html += '</tbody></table>';

    this._contentEl.innerHTML = html;
  }

  // ─── AI 对话 ───

  _renderAI() {
    if (!this.engine.isAIMode) {
      this._contentEl.innerHTML = '<p class="di-empty">当前为经典模式，无 AI 对话数据</p>';
      return;
    }

    const history = this.engine.aiStoryManager?.conversationHistory;
    if (!history || history.length === 0) {
      this._contentEl.innerHTML = '<p class="di-empty">暂无对话记录</p>';
      return;
    }

    let html = '<div class="di-chat-list">';
    for (const msg of history) {
      const role = msg.role || 'unknown';
      // 对于 assistant 消息，content 可能是数组
      let content;
      if (Array.isArray(msg.content)) {
        content = msg.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n');
      } else {
        content = msg.content || '';
      }

      // 截断过长的 system prompt
      const displayContent = (role === 'system' && content.length > 500)
        ? content.substring(0, 500) + '...(已截断)'
        : content;

      html += `<div class="di-chat-msg di-chat-${role}">`;
      html += `<span class="di-chat-role">${this._roleLabel(role)}</span>`;
      html += `<pre class="di-chat-content">${this._esc(displayContent)}</pre>`;
      html += '</div>';
    }
    html += '</div>';

    this._contentEl.innerHTML = html;
  }

  // ─── 工具方法 ───

  _row(label, value) {
    return `<tr><td class="di-label">${this._esc(String(label))}</td><td>${this._esc(String(value ?? '-'))}</td></tr>`;
  }

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _roleLabel(role) {
    const labels = { system: '系统', user: '玩家', assistant: 'AI' };
    return labels[role] || role;
  }
}
