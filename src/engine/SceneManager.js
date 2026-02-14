// -*- coding: utf-8 -*-
/**
 * SceneManager — 场景管理系统
 * 加载场景、评估选项条件、处理场景切换
 */
export class SceneManager {
  constructor(eventBus, skillCheck, inventorySystem) {
    this.eventBus = eventBus;
    this.skillCheck = skillCheck;
    this.inventory = inventorySystem;
    this.scenes = {};
    this.currentScene = null;
    this.flags = new Set();  // 游戏状态标记
  }

  /**
   * 加载场景数据
   * @param {object} scenesData scenes.json 数据
   */
  loadScenes(scenesData) {
    this.scenes = scenesData;
  }

  /**
   * 进入指定场景
   * @param {string} sceneId 场景 ID
   * @param {object} player 玩家对象
   */
  enterScene(sceneId, player) {
    const scene = this.scenes[sceneId];
    if (!scene) {
      throw new Error(`未知场景: ${sceneId}`);
    }

    this.currentScene = scene;

    // 评估每个选项的可见性
    const evaluatedChoices = scene.choices
      ? scene.choices.map((choice, index) => ({
          ...choice,
          index,
          available: this._evaluateCondition(choice.condition)
        }))
      : [];

    this.eventBus.emit('scene:enter', {
      id: scene.id,
      title: scene.title,
      text: scene.text,
      choices: evaluatedChoices,
      combat: scene.combat || null,
      gameOver: scene.gameOver || false,
      victory: scene.victory || false
    });
  }

  /**
   * 处理玩家选择
   * @param {number} choiceIndex 选项索引
   * @param {object} player 玩家对象
   * @returns {{ nextScene: string|null, combat: object|null }}
   */
  makeChoice(choiceIndex, player) {
    if (!this.currentScene || !this.currentScene.choices) {
      return { nextScene: null, combat: null };
    }

    const choice = this.currentScene.choices[choiceIndex];
    if (!choice) {
      return { nextScene: null, combat: null };
    }

    // 检查条件
    if (choice.condition && !this._evaluateCondition(choice.condition)) {
      return { nextScene: null, combat: null };
    }

    // 技能检定分支
    if (choice.skillCheck) {
      const result = this.skillCheck.check(
        player,
        choice.skillCheck.skill,
        choice.skillCheck.dc
      );

      const branch = result.success ? choice.success : choice.failure;
      if (branch) {
        // 显示分支文本
        if (branch.text) {
          this.eventBus.emit('log:message', {
            type: 'narrative',
            text: branch.text
          });
        }

        // 添加物品
        if (branch.addItem) {
          this.inventory.addItem(branch.addItem);
        }

        // 设置标记
        if (branch.setFlag) {
          this.flags.add(branch.setFlag);
        }

        // 造成伤害
        if (branch.damage) {
          player.hp = Math.max(0, player.hp - branch.damage);
          this.eventBus.emit('player:update', player);
        }

        return {
          nextScene: branch.nextScene || null,
          combat: branch.combat || null
        };
      }
    }

    // 直接跳转
    if (choice.addItem) {
      this.inventory.addItem(choice.addItem);
    }

    if (choice.setFlag) {
      this.flags.add(choice.setFlag);
    }

    return {
      nextScene: choice.nextScene || null,
      combat: choice.combat || null
    };
  }

  /**
   * 评估条件
   * @param {object|undefined} condition 条件对象
   * @returns {boolean}
   */
  _evaluateCondition(condition) {
    if (!condition) {
      return true;
    }

    if (condition.hasItem) {
      if (!this.inventory.hasItem(condition.hasItem)) {
        return false;
      }
    }

    if (condition.hasFlag) {
      if (!this.flags.has(condition.hasFlag)) {
        return false;
      }
    }

    if (condition.notHasItem) {
      if (this.inventory.hasItem(condition.notHasItem)) {
        return false;
      }
    }

    return true;
  }
}
