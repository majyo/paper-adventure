// -*- coding: utf-8 -*-
/**
 * GameEngine — 游戏引擎主入口
 * 协调所有子系统，提供公共 API
 */
import { EventBus } from './EventBus.js';
import { DiceSystem } from './DiceSystem.js';
import { SkillCheck } from './SkillCheck.js';
import { InventorySystem } from './InventorySystem.js';
import { CombatSystem } from './CombatSystem.js';
import { SceneManager } from './SceneManager.js';
import { AIStoryManager } from './AIStoryManager.js';

export class GameEngine {
  constructor() {
    this.eventBus = new EventBus();
    this.dice = new DiceSystem(this.eventBus);
    this.skillCheck = new SkillCheck(this.dice, this.eventBus);
    this.inventory = new InventorySystem(this.eventBus);
    this.combat = new CombatSystem(this.dice, this.skillCheck, this.eventBus);
    this.sceneManager = new SceneManager(this.eventBus, this.skillCheck, this.inventory);

    this.player = null;
    this.adventureData = null;
    this._inCombat = false;
    this._pendingCombatScene = null;

    // AI 模式
    this._aiMode = false;
    this.aiStoryManager = null;

    // 监听战斗结束事件
    this.eventBus.on('combat:end', (data) => this._onCombatEnd(data));
  }

  /**
   * 加载冒险数据并启动游戏（经典模式）
   * @param {object} data 冒险数据 { manifest, scenes, enemies, items, player }
   */
  async startAdventure(data) {
    this._aiMode = false;
    this.aiStoryManager = null;
    this.adventureData = data;

    // 初始化玩家 (深拷贝)
    this.player = JSON.parse(JSON.stringify(data.player));

    // 加载各子系统数据
    this.sceneManager.loadScenes(data.scenes);
    this.combat.loadEnemies(data.enemies);
    this.inventory.loadItems(data.items);
    this.inventory.setInventory(this.player.inventory || []);

    // 发布玩家初始状态
    this.eventBus.emit('player:update', this.player);

    this.eventBus.emit('log:message', {
      type: 'system',
      text: `📜 冒险「${data.manifest.title}」开始了！`
    });

    // 进入起始场景
    this.sceneManager.enterScene(data.manifest.startScene, this.player);
  }

  /**
   * 启动 AI 驱动的冒险
   * @param {object} data 冒险数据
   * @param {object} template AI 故事模板
   */
  async startAIAdventure(data, template) {
    this._aiMode = true;
    this.adventureData = data;

    // 初始化玩家 (深拷贝)
    this.player = JSON.parse(JSON.stringify(data.player));

    // 加载各子系统数据
    this.sceneManager.loadScenes(data.scenes);
    this.combat.loadEnemies(data.enemies);
    this.inventory.loadItems(data.items);
    this.inventory.setInventory(this.player.inventory || []);

    // 发布玩家初始状态
    this.eventBus.emit('player:update', this.player);

    this.eventBus.emit('log:message', {
      type: 'system',
      text: `🤖 AI 冒险「${template.title}」开始了！`
    });

    // 初始化 AI 故事管理器
    this.aiStoryManager = new AIStoryManager(this);
    await this.aiStoryManager.init(template);
  }

  /**
   * 当前是否为 AI 模式
   */
  get isAIMode() {
    return this._aiMode;
  }

  /**
   * 玩家做出选择
   * @param {number} choiceIndex 选项索引
   */
  makeChoice(choiceIndex) {
    if (this._inCombat) {
      return;
    }

    if (this._aiMode && this.aiStoryManager) {
      // AI 模式：委托给 AIStoryManager
      // currentChoices 由 App 维护并传入
      return;
    }

    const result = this.sceneManager.makeChoice(choiceIndex, this.player);

    if (result.nextScene) {
      const nextScene = this.sceneManager.scenes[result.nextScene];

      // 如果下一个场景有战斗，先进入场景再开始战斗
      if (nextScene && nextScene.combat) {
        this._pendingCombatScene = nextScene;
        this.sceneManager.enterScene(result.nextScene, this.player);
        this._startSceneCombat(nextScene);
      } else {
        this.sceneManager.enterScene(result.nextScene, this.player);
      }
    }
  }

  /**
   * 处理自由文本输入（AI 模式）
   * @param {string} text 玩家输入
   */
  handleFreeInput(text) {
    if (this._aiMode && this.aiStoryManager) {
      this.aiStoryManager.handleFreeInput(text);
    }
  }

  /**
   * AI 模式下处理选项选择
   * @param {number} choiceIndex 选项索引
   * @param {string[]} currentChoices 当前选项列表
   */
  handleAIChoice(choiceIndex, currentChoices) {
    if (this._aiMode && this.aiStoryManager) {
      this.aiStoryManager.handleChoice(choiceIndex, currentChoices);
    }
  }

  /**
   * 开始场景战斗
   * @param {object} scene 场景对象
   */
  _startSceneCombat(scene) {
    this._inCombat = true;
    // 延迟一点开始战斗，让叙事文本先显示
    setTimeout(() => {
      this.combat.startCombat(this.player, scene.combat.enemies);
    }, 1500);
  }

  /**
   * 战斗中玩家攻击
   * @param {number} attackIndex 攻击方式索引
   * @param {number} targetIndex 目标索引
   */
  combatAttack(attackIndex = 0, targetIndex = 0) {
    if (!this._inCombat) {
      return;
    }
    this.combat.playerAttack(attackIndex, targetIndex);
  }

  /**
   * 战斗中使用物品
   * @param {string} itemId 物品 ID
   */
  combatUseItem(itemId) {
    if (!this._inCombat) {
      return;
    }
    this.inventory.useItem(itemId, this.player);
    // 使用物品消耗回合
    this.combat.currentTurn++;
    this.combat._nextTurn();
  }

  /**
   * 战斗中逃跑
   */
  combatFlee() {
    if (!this._inCombat) {
      return;
    }
    this.combat.playerFlee();
  }

  /**
   * 战斗结束回调
   * @param {object} data { victory, totalXp, fled }
   */
  _onCombatEnd(data) {
    this._inCombat = false;

    // AI 模式下，战斗结束由 AIStoryManager 处理
    if (this._aiMode) {
      return;
    }

    if (data.fled) {
      // 逃跑成功，回到上一个非战斗场景
      this.sceneManager.enterScene('cellar_entrance', this.player);
      return;
    }

    if (!this._pendingCombatScene) {
      return;
    }

    const combatDef = this._pendingCombatScene.combat;
    this._pendingCombatScene = null;

    if (data.victory && combatDef.onVictory) {
      this.sceneManager.enterScene(combatDef.onVictory, this.player);
    } else if (!data.victory && combatDef.onDefeat) {
      this.sceneManager.enterScene(combatDef.onDefeat, this.player);
    }
  }

  /**
   * 在非战斗状态下使用物品
   * @param {string} itemId 物品 ID
   */
  useItem(itemId) {
    if (this._inCombat) {
      return;
    }
    this.inventory.useItem(itemId, this.player);
  }
}
