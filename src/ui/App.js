// -*- coding: utf-8 -*-
/**
 * App — UI 主控
 * 创建所有面板，注册 EventBus 监听，路由事件到对应面板
 */
import { NarrativePanel } from './NarrativePanel.js';
import { ChoicePanel } from './ChoicePanel.js';
import { CombatPanel } from './CombatPanel.js';
import { StatusBar } from './StatusBar.js';
import { InventoryPanel } from './InventoryPanel.js';
import { LogPanel } from './LogPanel.js';
import { PlayerInputPanel } from './PlayerInputPanel.js';
import { DataInspectorPanel } from './DataInspectorPanel.js';

export class App {
  constructor(engine) {
    this.engine = engine;
    this.eventBus = engine.eventBus;
    this._inCombat = false;
    this._aiChoices = []; // AI 模式下当前可用选项

    this._buildLayout();
    this._bindEvents();
  }

  /**
   * 构建 DOM 布局
   */
  _buildLayout() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    // 状态栏
    const statusEl = document.createElement('div');
    statusEl.id = 'status-bar';
    app.appendChild(statusEl);
    this.statusBar = new StatusBar(statusEl);

    // 主内容区
    const mainPanel = document.createElement('div');
    mainPanel.classList.add('main-panel');
    app.appendChild(mainPanel);

    // 叙事面板
    const narrativeEl = document.createElement('div');
    narrativeEl.id = 'narrative';
    mainPanel.appendChild(narrativeEl);
    this.narrativePanel = new NarrativePanel(narrativeEl);

    // 选项面板
    const choiceEl = document.createElement('div');
    choiceEl.id = 'choices';
    mainPanel.appendChild(choiceEl);
    this.choicePanel = new ChoicePanel(choiceEl);
    this.choicePanel.setChoiceCallback((index) => {
      if (this.engine.isAIMode) {
        this.engine.handleAIChoice(index, this._aiChoices);
      } else {
        this.engine.makeChoice(index);
      }
    });

    // 自由文本输入面板（AI 模式）
    const inputEl = document.createElement('div');
    inputEl.id = 'player-input';
    mainPanel.appendChild(inputEl);
    this.playerInputPanel = new PlayerInputPanel(inputEl);
    this.playerInputPanel.setSubmitCallback((text) => {
      this.engine.handleFreeInput(text);
    });

    // 战斗面板
    const combatEl = document.createElement('div');
    combatEl.id = 'combat';
    mainPanel.appendChild(combatEl);
    this.combatPanel = new CombatPanel(combatEl);
    this.combatPanel.setCallbacks({
      onAttack: (atkIdx, tgtIdx) => this.engine.combatAttack(atkIdx, tgtIdx),
      onFlee: () => this.engine.combatFlee(),
      onUseItem: (itemId) => this.engine.combatUseItem(itemId)
    });

    // AI 加载指示器
    this._loadingEl = document.createElement('div');
    this._loadingEl.classList.add('ai-loading', 'hidden');
    this._loadingEl.innerHTML = '<span class="ai-loading-dots">AI 正在思考<span>.</span><span>.</span><span>.</span></span>';
    mainPanel.appendChild(this._loadingEl);

    // 侧边栏 — 背包
    const sidebarEl = document.createElement('div');
    sidebarEl.classList.add('sidebar');
    app.appendChild(sidebarEl);

    const inventoryEl = document.createElement('div');
    inventoryEl.id = 'inventory';
    sidebarEl.appendChild(inventoryEl);
    this.inventoryPanel = new InventoryPanel(inventoryEl);
    this.inventoryPanel.setUseItemCallback((itemId) => {
      if (this._inCombat) {
        this.engine.combatUseItem(itemId);
      } else {
        this.engine.useItem(itemId);
      }
    });

    // 日志面板
    const logEl = document.createElement('div');
    logEl.id = 'log';
    app.appendChild(logEl);
    this.logPanel = new LogPanel(logEl);

    // 数据检视器
    this.dataInspector = new DataInspectorPanel(this.engine);

    // 状态栏触发按钮
    const inspectorBtn = document.createElement('button');
    inspectorBtn.classList.add('di-trigger-btn');
    inspectorBtn.textContent = '📊';
    inspectorBtn.title = '数据检视器 (F12)';
    inspectorBtn.addEventListener('click', () => this.dataInspector.toggle());
    statusEl.appendChild(inspectorBtn);
  }

  /**
   * 绑定 EventBus 事件
   */
  _bindEvents() {
    // 场景进入（经典模式）
    this.eventBus.on('scene:enter', (data) => {
      this._inCombat = false;
      this.combatPanel.hide();

      if (data.gameOver) {
        this._showGameOver(data);
        return;
      }

      this.narrativePanel.showScene(data.title, data.text, () => {
        // 打字完成后显示选项
        if (data.choices && data.choices.length > 0) {
          this.choicePanel.render(data.choices);
        }
      });

      // 先隐藏选项，等打字完成再显示
      this.choicePanel.hide();
    });

    // AI 场景事件 — 追加 DM 消息
    this.eventBus.on('ai:scene', (data) => {
      this._inCombat = false;
      this._aiChoices = data.choices || [];

      this.narrativePanel.appendMessage(data.narrative, 'dm', () => {
        // 打字完成后显示选项和输入框
        if (this._aiChoices.length > 0) {
          const choiceData = this._aiChoices.map((text, index) => ({
            text,
            index,
            available: true,
          }));
          this.choicePanel.render(choiceData);
        }
        this.playerInputPanel.show();
      });

      this.choicePanel.hide();
    });

    // AI 玩家输入 — 追加玩家消息气泡
    this.eventBus.on('ai:player-input', (text) => {
      this.choicePanel.hide();
      this.narrativePanel.appendMessage(text, 'player');
    });

    // AI 加载状态
    this.eventBus.on('ai:loading', (loading) => {
      if (loading) {
        this._loadingEl.classList.remove('hidden');
        this.choicePanel.hide();
        this.playerInputPanel.setDisabled(true);
      } else {
        this._loadingEl.classList.add('hidden');
        this.playerInputPanel.setDisabled(false);
      }
    });

    // AI 错误
    this.eventBus.on('ai:error', (message) => {
      this.logPanel.addMessage({
        type: 'system',
        text: `❌ AI 错误: ${message}`,
      });
      this._loadingEl.classList.add('hidden');
      this.playerInputPanel.setDisabled(false);
    });

    // 战斗开始
    this.eventBus.on('combat:start', (data) => {
      this._inCombat = true;
      this.choicePanel.hide();
      this.playerInputPanel.hide();
    });

    // 战斗回合 (玩家回合)
    this.eventBus.on('combat:turn', (data) => {
      if (data.type === 'player') {
        const consumables = this.engine.inventory.getConsumables();
        this.combatPanel.show({
          enemies: data.enemies,
          player: data.player,
          consumables
        });
      }
    });

    // 战斗结束
    this.eventBus.on('combat:end', () => {
      this.combatPanel.hide();
      // AI 模式下，战斗结束后重新显示输入面板
      if (this.engine.isAIMode) {
        this.playerInputPanel.show();
      }
    });

    // 骰子投掷
    this.eventBus.on('dice:roll', (data) => {
      this.logPanel.addMessage({
        type: 'dice',
        text: `🎲 ${data.expression}: [${data.rolls.join(', ')}]${data.modifier ? (data.modifier > 0 ? '+' : '') + data.modifier : ''} = ${data.total}`
      });
    });

    // 背包更新
    this.eventBus.on('inventory:update', (items) => {
      this.inventoryPanel.update(items);
    });

    // 玩家状态更新
    this.eventBus.on('player:update', (player) => {
      this.statusBar.update(player);
    });

    // 日志消息
    this.eventBus.on('log:message', (data) => {
      this.logPanel.addMessage(data);
      // 将关键事件内联显示到叙事面板
      const inlineTypes = ['skill_check', 'combat', 'dice', 'inventory', 'item_use'];
      if (inlineTypes.includes(data.type)) {
        this.narrativePanel.appendEvent(data);
      }
    });

    // F12 打开/关闭数据检视器
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        this.dataInspector.toggle();
      }
    });
  }

  /**
   * 显示游戏结束画面
   * @param {object} data 场景数据
   */
  _showGameOver(data) {
    this.choicePanel.hide();
    this.combatPanel.hide();
    this.playerInputPanel.hide();

    // 先显示叙事文本
    this.narrativePanel.showScene(data.title, data.text);

    // 创建覆盖层
    const overlay = document.createElement('div');
    overlay.classList.add('game-over-overlay');

    const title = document.createElement('div');
    title.classList.add('game-over-title');
    title.textContent = data.victory ? '🏆 冒险完成' : '💀 冒险失败';

    const restartBtn = document.createElement('button');
    restartBtn.classList.add('restart-btn');
    restartBtn.textContent = '重新开始';
    restartBtn.addEventListener('click', () => {
      overlay.remove();
      this.logPanel.clear();
      this.engine.startAdventure(this.engine.adventureData);
    });

    overlay.appendChild(title);
    overlay.appendChild(restartBtn);

    // 延迟显示覆盖层
    setTimeout(() => {
      document.getElementById('app').appendChild(overlay);
    }, 2000);
  }
}
