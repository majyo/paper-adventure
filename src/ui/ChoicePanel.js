// -*- coding: utf-8 -*-
/**
 * ChoicePanel — 选项按钮区
 * 渲染选项按钮，灰显不满足条件的选项
 */
export class ChoicePanel {
  constructor(container) {
    this.container = container;
    this.container.classList.add('choice-panel');
    this._onChoice = null;
  }

  /**
   * 设置选择回调
   * @param {Function} callback (choiceIndex) => void
   */
  setChoiceCallback(callback) {
    this._onChoice = callback;
  }

  /**
   * 渲染选项列表
   * @param {Array} choices 选项数组 [{ text, index, available }]
   */
  render(choices) {
    this.container.innerHTML = '';

    if (!choices || choices.length === 0) {
      this.container.classList.add('hidden');
      return;
    }

    this.container.classList.remove('hidden');

    for (const choice of choices) {
      const btn = document.createElement('button');
      btn.classList.add('choice-btn');
      btn.textContent = choice.text;
      btn.disabled = !choice.available;

      if (choice.available) {
        btn.addEventListener('click', () => {
          if (this._onChoice) {
            this._onChoice(choice.index);
          }
        });
      }

      this.container.appendChild(btn);
    }
  }

  /**
   * 隐藏选项面板
   */
  hide() {
    this.container.classList.add('hidden');
    this.container.innerHTML = '';
  }
}
