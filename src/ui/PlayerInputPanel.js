// -*- coding: utf-8 -*-
/**
 * PlayerInputPanel — 自由文本输入面板
 * AI 模式下显示，允许玩家输入自由文本
 */
export class PlayerInputPanel {
  constructor(container) {
    this.container = container;
    this.container.classList.add('player-input-panel', 'hidden');
    this._onSubmit = null;
    this._disabled = false;

    this._build();
  }

  _build() {
    this._inputEl = document.createElement('input');
    this._inputEl.type = 'text';
    this._inputEl.classList.add('player-input');
    this._inputEl.placeholder = '输入你想做的事...';
    this._inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this._disabled) {
        this._submit();
      }
    });

    this._btnEl = document.createElement('button');
    this._btnEl.classList.add('player-input-btn');
    this._btnEl.textContent = '发送';
    this._btnEl.addEventListener('click', () => {
      if (!this._disabled) {
        this._submit();
      }
    });

    this.container.appendChild(this._inputEl);
    this.container.appendChild(this._btnEl);
  }

  _submit() {
    const text = this._inputEl.value.trim();
    if (text && this._onSubmit) {
      this._onSubmit(text);
      this._inputEl.value = '';
    }
  }

  /**
   * 设置提交回调
   * @param {Function} callback (text) => void
   */
  setSubmitCallback(callback) {
    this._onSubmit = callback;
  }

  /**
   * 设置禁用状态（加载中）
   * @param {boolean} disabled
   */
  setDisabled(disabled) {
    this._disabled = disabled;
    this._inputEl.disabled = disabled;
    this._btnEl.disabled = disabled;
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }
}
